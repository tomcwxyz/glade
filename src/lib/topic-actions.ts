"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { topics, topicTags, proposals } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { syncEntityTags } from "@/lib/queries";
import { logDeletion } from "@/lib/audit";

export async function createTopic(formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const description = (formData.get("description") as string)?.trim() || null;
  const type = formData.get("type") as string;
  if (!type) return { error: "Topic type is required" };
  const isPublic = formData.get("hideFromPublic") !== "on";
  const tagIds = ((formData.get("tagIds") as string) || "").split(",").filter(Boolean);

  const topicId = await db.transaction(async (tx) => {
    const [topic] = await tx
      .insert(topics)
      .values({
        spaceId: space.id,
        title,
        description,
        type: type as "question" | "tension" | "agenda_suggestion",
        isPublic,
        createdBy: user.id,
      })
      .returning({ id: topics.id });
    await syncEntityTags(tx, topicTags, topicTags.topicId, "topicId", topic.id, tagIds);
    return topic.id;
  });

  redirect(`/topics/${topicId}`);
}

/** Replace a topic's tag set. Topics have no edit form, so this powers the
 *  inline tag editor on the topic detail page. */
export async function updateTopicTags(topicId: string, tagIds: string[]) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [owned] = await db
    .select({ id: topics.id })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.spaceId, space.id)))
    .limit(1);
  if (!owned) return { error: "Topic not found" };

  await db.transaction(async (tx) => {
    await syncEntityTags(tx, topicTags, topicTags.topicId, "topicId", topicId, tagIds);
  });

  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/topics");
  return { success: true };
}

export async function promoteTopic(topicId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [topic] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.spaceId, space.id)))
    .limit(1);

  if (!topic) return { error: "Topic not found" };
  if (topic.promotedToProposalId) return { error: "Topic already promoted" };

  // Atomic: create the proposal and link the topic to it together.
  const proposal = await db.transaction(async (tx) => {
    const [p] = await tx
      .insert(proposals)
      .values({
        spaceId: space.id,
        title: topic.title,
        description: topic.description,
        status: "draft",
        createdBy: user.id,
      })
      .returning({ id: proposals.id });

    await tx
      .update(topics)
      .set({ promotedToProposalId: p.id })
      .where(eq(topics.id, topicId));

    return p;
  });

  redirect(`/proposals/${proposal.id}`);
}

export async function deleteTopic(topicId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch for audit snapshot
  const [topic] = await db
    .select({
      id: topics.id,
      title: topics.title,
      type: topics.type,
    })
    .from(topics)
    .where(and(eq(topics.id, topicId), eq(topics.spaceId, space.id)))
    .limit(1);

  if (!topic) return { error: "Topic not found" };

  await logDeletion(
    space.id,
    "topic",
    topic.title,
    { type: topic.type },
    user.id ?? null,
    user.name ?? null
  );

  await db
    .delete(topics)
    .where(and(eq(topics.id, topicId), eq(topics.spaceId, space.id)));

  redirect("/topics");
}
