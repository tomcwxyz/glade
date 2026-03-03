import { getCurrentSpace } from "@/lib/space";
import { getDocumentById, getDecisionsList, getDocumentMeetings, getMeetingsList } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Clock, Download, Edit, FileText, History } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DocumentStatusActions } from "./document-status-actions";
import { DocumentWithTrail } from "./document-with-trail";
import { SectionLinkManager } from "./section-link-manager";
import { MeetingLinks } from "@/components/meeting-links";

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Other",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const [doc, allDecisions, documentMeetings, allMeetings] = await Promise.all([
    getDocumentById(space.id, id),
    getDecisionsList(space.id),
    getDocumentMeetings(id),
    getMeetingsList(space.id),
  ]);
  if (!doc) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Documents", href: "/documents" },
        { label: doc.title },
      ]} />

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider text-bark-muted font-medium">
                {TYPE_LABELS[doc.type] || doc.type}
              </span>
              {doc.status === "draft" ? (
                <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-pale text-amber font-medium">
                  Draft
                </span>
              ) : (
                <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-canopy-pale text-canopy font-medium">
                  Published
                </span>
              )}
            </div>
            <h1
              className="text-3xl font-light tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {doc.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-bark-muted">
              <span className="flex items-center gap-1">
                <FileText size={13} />
                v{doc.currentVersion}
              </span>
              {doc.createdByName && (
                <span>by {doc.createdByName}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDate(doc.updatedAt.toISOString())}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <DocumentStatusActions
              documentId={doc.id}
              currentStatus={doc.status}
            />
            <Link
              href={`/documents/${doc.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <Edit size={14} />
              Edit
            </Link>
            <Link
              href={`/documents/${doc.id}/history`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <History size={14} />
              History
            </Link>
            <a
              href={`/api/documents/${doc.id}/export`}
              download
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <Download size={14} />
              Markdown
            </a>
            <a
              href={`/api/documents/${doc.id}/export?format=docx`}
              download
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <Download size={14} />
              Word
            </a>
          </div>
        </div>
      </header>

      {/* Document content with trail */}
      {doc.content != null ? (
        <DocumentWithTrail
          content={doc.content as Record<string, unknown>}
          sectionLinks={doc.sectionLinks}
        />
      ) : (
        <div className="bg-paper-warm rounded-xl border border-border p-8">
          <p className="text-bark-muted italic">No content yet.</p>
        </div>
      )}

      {/* Section link manager */}
      {doc.content != null && (
        <SectionLinkManager
          documentId={doc.id}
          content={doc.content as Record<string, unknown>}
          sectionLinks={doc.sectionLinks}
          decisions={allDecisions}
        />
      )}

      {/* Meeting links */}
      <div className="mt-10">
        <MeetingLinks
          entityType="document"
          entityId={doc.id}
          linkedMeetings={documentMeetings.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          }))}
          allMeetings={allMeetings.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
