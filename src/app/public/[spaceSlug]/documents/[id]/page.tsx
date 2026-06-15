import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicSpace, getPublicDocumentById } from "@/lib/queries";
import { tiptapToHtml } from "@/lib/tiptap-utils";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, FileText } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Document",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string; id: string }>;
}): Promise<Metadata> {
  const { spaceSlug, id } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space || (space.settings as Record<string, unknown>)?.publicDocuments !== true) {
    return { title: "Document" };
  }
  const doc = await getPublicDocumentById(space.id, id);
  return { title: doc ? `${doc.title} — ${space.name}` : "Document" };
}

export default async function PublicDocumentPage({
  params,
}: {
  params: Promise<{ spaceSlug: string; id: string }>;
}) {
  const { spaceSlug, id } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();
  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicDocuments !== true) notFound();

  const doc = await getPublicDocumentById(space.id, id);
  if (!doc) notFound();

  const html = tiptapToHtml(doc.content as Parameters<typeof tiptapToHtml>[0]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Link
        href={`/public/${spaceSlug}/documents`}
        className="inline-flex items-center gap-1 text-sm text-bark-muted hover:text-canopy transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        Documents
      </Link>

      <div className="flex items-center gap-2 text-xs text-bark-muted mb-2">
        <FileText size={14} />
        <span className="uppercase tracking-wider">{TYPE_LABELS[doc.type] || doc.type}</span>
        <span>· v{doc.currentVersion}</span>
        <span>· updated {formatDate(doc.updatedAt.toISOString())}</span>
      </div>

      <h1
        className="text-2xl font-medium tracking-tight leading-snug mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {doc.title}
      </h1>

      {html ? (
        <article
          className="document-content text-[0.9375rem] text-bark leading-relaxed [&_h1]:text-xl [&_h1]:font-medium [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-medium [&_h3]:mt-4 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-canopy/30 [&_blockquote]:pl-4 [&_blockquote]:text-bark-muted [&_a]:text-canopy [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ fontFamily: "var(--font-body)" }}
        />
      ) : (
        <p className="text-bark-muted">This document has no content yet.</p>
      )}
    </div>
  );
}
