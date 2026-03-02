"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { proposals, proposalComments, proposalReferences, decisions } from "@/db/schema";
import { getNextDecisionNumber } from "@/lib/queries";
import { getCurrentSpace, requireUser } from "@/lib/space";

export async function createProposal(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const rationale = (formData.get("rationale") as string)?.trim() || null;
  const suggestedMethod = (formData.get("suggestedMethod") as string) || null;
  const isPublic = formData.get("isPublic") === "on";

  const [proposal] = await db
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

  redirect(`/proposals/${proposal.id}`);
}

export async function updateProposal(proposalId: string, formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  const isPublic = formData.get("isPublic") === "on";

  await db
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

  redirect(`/proposals/${proposalId}`);
}

export async function advanceProposalStatus(
  proposalId: string,
  status: "draft" | "open_for_discussion" | "ready_for_decision" | "decided" | "implemented"
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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

  const number = await getNextDecisionNumber(space.id);

  const [decision] = await db
    .insert(decisions)
    .values({
      number,
      spaceId: space.id,
      title: proposal.title,
      description: proposal.description,
      rationale: proposal.rationale,
      method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
      outcome,
      status: "decided",
      participants,
      date: new Date(dateStr),
      createdBy: user.id,
    })
    .returning({ id: decisions.id, number: decisions.number });

  // Link proposal to decision
  await db
    .update(proposals)
    .set({ decidedAsDecisionId: decision.id, updatedAt: new Date() })
    .where(eq(proposals.id, proposalId));

  redirect(`/decisions/${decision.number}`);
}

export async function addProposalReference(
  proposalId: string,
  title: string,
  url: string
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

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
  await db.delete(proposalReferences).where(eq(proposalReferences.id, referenceId));
  revalidatePath("/proposals");
}

export async function deleteProposal(proposalId: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)));

  redirect("/proposals");
}
