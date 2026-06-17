"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { documents, documentVersions, documentSectionLinks, documentTags, decisions } from "@/db/schema";
import { getCurrentSpace, requireSpaceRole } from "@/lib/space";
import { getDocumentVersionAtDate, syncEntityTags } from "@/lib/queries";
import { logDeletion } from "@/lib/audit";

export async function createDocument(formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const type = formData.get("type") as string;
  if (!type) return { error: "Document type is required" };

  const contentRaw = formData.get("content") as string;
  let content = null;
  if (contentRaw) {
    try {
      content = JSON.parse(contentRaw);
    } catch {
      return { error: "Invalid document content" };
    }
  }

  const [doc] = await db
    .insert(documents)
    .values({
      spaceId: space.id,
      title,
      type: type as "constitution" | "terms_of_reference" | "policy" | "role_description" | "standing_orders" | "custom",
      content,
      status: "draft",
      currentVersion: 1,
      isPublic: formData.get("hideFromPublic") !== "on",
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

  const tagIds = ((formData.get("tagIds") as string) || "").split(",").filter(Boolean);
  await syncEntityTags(db, documentTags, documentTags.documentId, "documentId", doc.id, tagIds);

  redirect(`/documents/${doc.id}`);
}

export async function updateDocument(documentId: string, formData: FormData) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const [existing] = await db
    .select({
      id: documents.id,
      currentVersion: documents.currentVersion,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Document not found" };

  // Conflict check: if the document was saved by someone else since this editor
  // loaded it, don't silently overwrite. Autosaves touch only draftUpdatedAt,
  // so this fires only on a competing explicit Save.
  const knownUpdatedAt = formData.get("knownUpdatedAt") as string | null;
  if (knownUpdatedAt && existing.updatedAt.getTime() > new Date(knownUpdatedAt).getTime()) {
    return { error: "This document was saved by someone else. Reload to see their changes before saving." };
  }

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "Title is required" };

  const contentRaw = formData.get("content") as string;
  let content = null;
  if (contentRaw) {
    try {
      content = JSON.parse(contentRaw);
    } catch {
      return { error: "Invalid document content" };
    }
  }
  const changeDescription = (formData.get("changeDescription") as string)?.trim() || null;

  const newVersion = existing.currentVersion + 1;

  await db
    .update(documents)
    .set({
      title,
      content,
      // Promote to published content and clear the autosave draft buffer.
      draftContent: null,
      draftUpdatedAt: null,
      currentVersion: newVersion,
      isPublic: formData.get("hideFromPublic") !== "on",
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

  const tagIds = ((formData.get("tagIds") as string) || "").split(",").filter(Boolean);
  await syncEntityTags(db, documentTags, documentTags.documentId, "documentId", documentId, tagIds);

  redirect(`/documents/${documentId}`);
}

export async function publishDocument(documentId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(documents)
    .set({ status: "published", updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  revalidatePath(`/documents/${documentId}`);
}

export async function unpublishDocument(documentId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  await db
    .update(documents)
    .set({ status: "draft", updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  revalidatePath(`/documents/${documentId}`);
}

export async function getHistoricalDocument(documentId: string, dateStr: string) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify document belongs to space
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!doc) return { error: "Document not found" };

  const targetDate = new Date(dateStr + "T23:59:59.999Z");
  const version = await getDocumentVersionAtDate(documentId, targetDate);

  if (!version) return { error: "No version exists before that date" };

  return {
    content: version.content,
    versionNumber: version.versionNumber,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function addSectionLink(documentId: string, sectionId: string, decisionId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Both the document and the decision must belong to the caller's space.
  const [doc] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);
  if (!doc) return { error: "Document not found" };

  const [decision] = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(and(eq(decisions.id, decisionId), eq(decisions.spaceId, space.id)))
    .limit(1);
  if (!decision) return { error: "Decision not found" };

  await db.insert(documentSectionLinks).values({
    documentId,
    sectionId,
    decisionId,
  });

  revalidatePath(`/documents/${documentId}`);
}

export async function removeSectionLink(linkId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  // Verify the link's document belongs to the caller's space.
  const [link] = await db
    .select({ documentId: documentSectionLinks.documentId })
    .from(documentSectionLinks)
    .innerJoin(documents, eq(documents.id, documentSectionLinks.documentId))
    .where(and(eq(documentSectionLinks.id, linkId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!link) return { error: "Link not found" };

  await db.delete(documentSectionLinks).where(eq(documentSectionLinks.id, linkId));

  revalidatePath(`/documents/${link.documentId}`);
}

export async function autoSaveDocument(documentId: string, content: unknown) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { space } = auth;

  const [existing] = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!existing) return { error: "Document not found" };

  // Autosave to the draft buffer only — never mutate published `content`, and
  // don't touch `updatedAt` (so the Save conflict check stays meaningful).
  await db
    .update(documents)
    .set({ draftContent: content, draftUpdatedAt: new Date() })
    .where(eq(documents.id, documentId));

  return { success: true };
}

export async function deleteDocument(documentId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  // Fetch for audit snapshot
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      status: documents.status,
      currentVersion: documents.currentVersion,
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)))
    .limit(1);

  if (!doc) return { error: "Document not found" };

  await logDeletion(
    space.id,
    "document",
    doc.title,
    {
      type: doc.type,
      status: doc.status,
      currentVersion: doc.currentVersion,
    },
    user.id ?? null,
    user.name ?? null
  );

  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.spaceId, space.id)));

  redirect("/documents");
}
