"use server";

import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { topics, proposals } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
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

  const [topic] = await db
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

  redirect(`/topics/${topic.id}`);
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

  // Create a proposal from the topic
  const [proposal] = await db
    .insert(proposals)
    .values({
      spaceId: space.id,
      title: topic.title,
      description: topic.description,
      status: "draft",
      createdBy: user.id,
    })
    .returning({ id: proposals.id });

  // Link the topic to the proposal
  await db
    .update(topics)
    .set({ promotedToProposalId: proposal.id })
    .where(eq(topics.id, topicId));

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
