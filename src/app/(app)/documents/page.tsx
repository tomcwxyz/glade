import type { Metadata } from "next";
import { getCurrentSpace } from "@/lib/space";
import { getDocuments, getActiveInsights } from "@/lib/queries";

export const metadata: Metadata = { title: "Documents" };
import { isAiEnabled } from "@/lib/ai";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import { formatDateRelative } from "@/lib/utils";
import { StaleDocumentChecker } from "./stale-document-checker";

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Other",
};

export default async function DocumentsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const aiEnabled = isAiEnabled(space.settings);
  const allDocuments = await getDocuments(space.id);
  const staleInsights = aiEnabled
    ? (await getActiveInsights(space.id)).filter(
        (i) =>
          i.type === "suggestion" &&
          (i.metadata as Record<string, unknown> | null)?.subtype === "stale_document"
      )
    : [];

  // Group by type
  const grouped = allDocuments.reduce<Record<string, typeof allDocuments>>(
    (acc, doc) => {
      const key = doc.type;
      if (!acc[key]) acc[key] = [];
      acc[key].push(doc);
      return acc;
    },
    {}
  );

  const typeOrder = [
    "constitution",
    "terms_of_reference",
    "policy",
    "role_description",
    "standing_orders",
    "custom",
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Documents
          </h1>
          <p className="text-bark-muted">
            {allDocuments.length} governance document{allDocuments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus size={16} />
          New document
        </Link>
      </header>

      {aiEnabled && allDocuments.length > 0 && (
        <StaleDocumentChecker
          existingInsights={staleInsights.map((i) => ({
            id: i.id,
            title: i.title,
            content: i.content,
            relatedDocumentId: i.relatedDocumentId,
            metadata: i.metadata as { subtype?: string; relatedDecisionNumbers?: number[] } | null,
          }))}
        />
      )}

      {allDocuments.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted mb-2">No documents yet</p>
          <p className="text-sm text-bark-muted/70">
            Create your first governance document to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {typeOrder.map((type) => {
            const docs = grouped[type];
            if (!docs || docs.length === 0) return null;
            return (
              <section key={type}>
                <h2 className="text-sm font-semibold text-bark-muted uppercase tracking-wider mb-3">
                  {TYPE_LABELS[type] || type}
                </h2>
                <div className="space-y-1">
                  {docs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-paper-warm transition-colors group"
                    >
                      <FileText
                        size={18}
                        className="text-bark-muted/40 group-hover:text-canopy transition-colors shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.9375rem] font-medium text-bark truncate">
                            {doc.title}
                          </span>
                          {doc.status === "draft" && (
                            <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-pale text-amber font-medium shrink-0">
                              Draft
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-bark-muted mt-0.5">
                          v{doc.currentVersion}
                          {doc.createdByName && ` · ${doc.createdByName}`}
                        </div>
                      </div>
                      <span className="text-xs text-bark-muted/60 shrink-0">
                        {formatDateRelative(doc.updatedAt.toISOString())}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
