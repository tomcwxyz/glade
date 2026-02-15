"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { proposals, proposalComments } from "@/db/schema";
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

  const [proposal] = await db
    .insert(proposals)
    .values({
      spaceId: space.id,
      title,
      description,
      rationale,
      suggestedMethod: suggestedMethod as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus" | null,
      status: "draft",
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

  await db
    .update(proposals)
    .set({
      title,
      description,
      rationale,
      suggestedMethod: suggestedMethod as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus" | null,
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

export async function deleteProposal(proposalId: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .delete(proposals)
    .where(and(eq(proposals.id, proposalId), eq(proposals.spaceId, space.id)));

  redirect("/proposals");
}
