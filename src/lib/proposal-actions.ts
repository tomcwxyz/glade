"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { proposals, proposalComments, proposalReferences, proposalTags } from "@/db/schema";
import { insertDecisionWithUniqueNumber } from "@/lib/queries";
import { requireUser, requireSpaceRole } from "@/lib/space";
import { logDeletion } from "@/lib/audit";

export async function createProposal(formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const rationale = (formData.get("rationale") as string)?.trim() || null;
  const suggestedMethod = (formData.get("suggestedMethod") as string) || null;
  const isPublic = formData.get("hideFromPublic") !== "on";
  const tagIdsRaw = formData.get("tagIds") as string;
  const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];

  // Atomic: proposal + its tags land together.
  const proposal = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(proposals)
      .values({
        spaceId: space.id,
        title,
        description,
        rationale,
        suggestedMethod: suggestedMethod as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus" | null,
        status: "draft",
        isPublic,
        createdBy: user.id,
      })
      .returning({ id: proposals.id });

    if (tagIds.length > 0) {
      await tx.insert(proposalTags).values(
        tagIds.map((tagId) => ({ proposalId: p.id, tagId }))
      );
    }
    return p;
  });

  redirect(`/proposals/${proposal.id}`);
}

export async function updateProposal(proposalId: string, formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [existing] = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Proposal not found" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const rationale = (formData.get("rationale") as string)?.trim() || null;
  const suggestedMethod = (formData.get("suggestedMethod") as string) || null;
  const isPublic = formData.get("hideFromPublic") !== "on";
  const tagIdsRaw = formData.get("tagIds") as string;
  const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];

  await db.transaction(async (tx) => {
    await tx
      .update(proposals)
      .set({
        title,
        description,
        rationale,
        suggestedMethod: suggestedMethod as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus" | null,
        isPublic,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposalId));

    // Replace the tag set (delete-then-reinsert).
    await tx.delete(proposalTags).where(eq(proposalTags.proposalId, proposalId));
    if (tagIds.length > 0) {
      await tx.insert(proposalTags).values(
        tagIds.map((tagId) => ({ proposalId, tagId }))
      );
    }
  });

  redirect(`/proposals/${proposalId}`);
}

export async function advanceProposalStatus(
  proposalId: string,
  status: "draft" | "open_for_discussion" | "ready_for_decision" | "decided" | "implemented"
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(proposals)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)));

  revalidatePath(`/proposals/${proposalId}`);
}

export async function addProposalComment(
  proposalId: string,
  content: string,
  parentId?: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  if (!content.trim()) return { error: "Comment cannot be empty" };

  // Verify proposal belongs to this space
  const [existing] = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Proposal not found" };

  await db.insert(proposalComments).values({
    proposalId,
    authorId: user.id,
    content: content.trim(),
    parentId: parentId || null,
  });

  revalidatePath(`/proposals/${proposalId}`);
}

export async function deleteProposalComment(commentId: string) {
  const user = await requireUser();

  // Verify the comment belongs to this user (or user is admin — simplified here)
  const [comment] = await db
    .select({ authorId: proposalComments.authorId })
    .from(proposalComments)
    .where(eq(proposalComments.id, commentId))
    .limit(1);

  if (!comment) return { error: "Comment not found" };
  if (comment.authorId !== user.id) return { error: "Not authorised" };

  await db.delete(proposalComments).where(eq(proposalComments.id, commentId));

  revalidatePath("/proposals");
}

export async function createDecisionFromProposal(
  proposalId: string,
  formData: FormData
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Verify proposal
  const [proposal] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!proposal) return { error: "Proposal not found" };
  if (proposal.decidedAsDecisionId) return { error: "Decision already created for this proposal" };

  const method = formData.get("method") as string;
  if (!method) return { error: "Decision method is required" };

  const dateStr = formData.get("date") as string;
  if (!dateStr) return { error: "Date is required" };

  const outcome = (formData.get("outcome") as string)?.trim() || null;
  const participantsRaw = formData.get("participants") as string;
  const participants = participantsRaw
    ? participantsRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  // Atomic: create the decision and link the proposal together.
  const decision = await db.transaction(async (tx) => {
    const d = await insertDecisionWithUniqueNumber(
      space.id,
      {
        title: proposal.title,
        description: proposal.description,
        rationale: proposal.rationale,
        method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
        outcome,
        status: "decided",
        participants,
        date: new Date(dateStr),
        createdBy: user.id,
      },
      tx
    );
    await tx
      .update(proposals)
      .set({ decidedAsDecisionId: d.id, updatedAt: new Date() })
      .where(eq(proposals.id, proposalId));
    return d;
  });

  redirect(`/decisions/${decision.number}`);
}

export async function addProposalReference(
  proposalId: string,
  title: string,
  url: string
) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  if (!title.trim()) return { error: "Title is required" };
  if (!url.trim()) return { error: "URL is required" };

  // Verify proposal belongs to this space
  const [existing] = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Proposal not found" };

  await db.insert(proposalReferences).values({
    proposalId,
    title: title.trim(),
    url: url.trim(),
  });

  revalidatePath(`/proposals/${proposalId}`);
}

export async function removeProposalReference(referenceId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify the reference's proposal belongs to the caller's space.
  const [reference] = await db
    .select({ id: proposalReferences.id })
    .from(proposalReferences)
    .innerJoin(proposals, eq(proposals.id, proposalReferences.proposalId))
    .where(and(eq(proposalReferences.id, referenceId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!reference) return { error: "Reference not found" };

  await db.delete(proposalReferences).where(eq(proposalReferences.id, referenceId));
  revalidatePath("/proposals");
}

export async function deleteProposal(proposalId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch for audit snapshot
  const [proposal] = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      suggestedMethod: proposals.suggestedMethod,
    })
    .from(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)))
    .limit(1);

  if (!proposal) return { error: "Proposal not found" };

  await logDeletion(
    space.id,
    "proposal",
    proposal.title,
    {
      status: proposal.status,
      suggestedMethod: proposal.suggestedMethod,
    },
    user.id ?? null,
    user.name ?? null
  );

  await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)));

  redirect("/proposals");
}
