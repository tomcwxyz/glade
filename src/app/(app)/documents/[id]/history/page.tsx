import { getCurrentSpace } from "@/lib/space";
import { getDocumentById, getDocumentVersions } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GitCommit } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { VersionDiff } from "./version-diff";
import { HistoricalView } from "./historical-view";

export default async function DocumentHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const doc = await getDocumentById(space.id, id);
  if (!doc) notFound();

  const versions = await getDocumentVersions(doc.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Link
        href={`/documents/${doc.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        {doc.title}
      </Link>

      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Version history
        </h1>
        <p className="text-bark-muted text-sm">
          {versions.length} version{versions.length !== 1 ? "s" : ""} of this document.
        </p>
      </header>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-3 bottom-3 w-px bg-border" />

        <div className="space-y-6">
          {versions.map((v, i) => (
            <div key={v.id} className="flex gap-4 relative">
              <div className="relative z-10 mt-1">
                <div className={`w-[31px] h-[31px] rounded-full flex items-center justify-center border-2 ${
                  i === 0
                    ? "bg-canopy border-canopy text-paper"
                    : "bg-paper border-border text-bark-muted"
                }`}>
                  <GitCommit size={14} />
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-bark">
                    Version {v.versionNumber}
                  </span>
                  {i === 0 && (
                    <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-canopy-pale text-canopy font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-sm text-bark-muted">
                  {v.changeDescription || "No description"}
                </p>
                <div className="text-xs text-bark-muted/60 mt-1">
                  {v.createdByName && `${v.createdByName} · `}
                  {formatDate(v.createdAt.toISOString())}
                  {v.decisionTitle && (
                    <span>
                      {" · "}
                      <Link
                        href={`/decisions/${v.decisionNumber}`}
                        className="text-canopy hover:underline"
                      >
                        #{v.decisionNumber} {v.decisionTitle}
                      </Link>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version diff */}
      <VersionDiff
        versions={versions.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          content: v.content,
        }))}
      />

      {/* Historical view */}
      <HistoricalView documentId={doc.id} />
    </div>
  );
}
