"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentVersions } from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";

export async function createDocument(formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const type = formData.get("type") as string;
  if (!type) return { error: "Document type is required" };

  const contentRaw = formData.get("content") as string;
  const content = contentRaw ? JSON.parse(contentRaw) : null;

  const [doc] = await db
    .insert(documents)
    .values({
      spaceId: space.id,
      title,
      type: type as "constitution" | "terms_of_reference" | "policy" | "role_description" | "standing_orders" | "custom",
      content,
      status: "draft",
      currentVersion: 1,
      createdBy: user.id,
    })
    .returning({ id: documents.id });

  // Create version 1
  await db.insert(documentVersions).values({
    documentId: doc.id,
    versionNumber: 1,
    content,
    changeDescription: "Initial version",
    createdBy: user.id,
  });

  redirect(`/documents/${doc.id}`);
}

export async function updateDocument(documentId: string, formData: FormData) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  const [existing] = await db
    .select({ id: documents.id, currentVersion: documents.currentVersion })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Document not found" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const contentRaw = formData.get("content") as string;
  const content = contentRaw ? JSON.parse(contentRaw) : null;
  const changeDescription = (formData.get("changeDescription") as string)?.trim() || null;

  const newVersion = existing.currentVersion + 1;

  await db
    .update(documents)
    .set({
      title,
      content,
      currentVersion: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));

  // Create new version snapshot
  await db.insert(documentVersions).values({
    documentId,
    versionNumber: newVersion,
    content,
    changeDescription,
    createdBy: user.id,
  });

  redirect(`/documents/${documentId}`);
}

export async function publishDocument(documentId: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .update(documents)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  revalidatePath(`/documents/${documentId}`);
}

export async function unpublishDocument(documentId: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .update(documents)
    .set({ status: "draft", updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  revalidatePath(`/documents/${documentId}`);
}

export async function deleteDocument(documentId: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  redirect("/documents");
}
