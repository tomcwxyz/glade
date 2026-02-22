import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSpace, getPublicDocuments } from "@/lib/queries";
import { formatDateRelative } from "@/lib/utils";
import { FileText } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}): Promise<Metadata> {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  return { title: space ? `${space.name} — Documents` : "Documents" };
}

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Other",
};

const TYPE_ORDER = [
  "constitution",
  "terms_of_reference",
  "policy",
  "role_description",
  "standing_orders",
  "custom",
];

export default async function PublicDocumentsPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicDocuments !== true) notFound();

  const docs = await getPublicDocuments(space.id);

  const grouped = docs.reduce<Record<string, typeof docs>>((acc, doc) => {
    const key = doc.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <FileText size={20} className="text-bark-muted" />
          <h2
            className="text-2xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Governance Documents
          </h2>
        </div>
        <p className="text-bark-muted text-sm">
          {docs.length} published document{docs.length !== 1 ? "s" : ""}
        </p>
      </header>

      {docs.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted">No published documents yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {TYPE_ORDER.map((type) => {
            const typeDocs = grouped[type];
            if (!typeDocs || typeDocs.length === 0) return null;
            return (
              <section key={type}>
                <h3 className="text-sm font-semibold text-bark-muted uppercase tracking-wider mb-3">
                  {TYPE_LABELS[type] || type}
                </h3>
                <div className="space-y-1">
                  {typeDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-paper-warm"
                    >
                      <FileText
                        size={18}
                        className="text-bark-muted/40 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[0.9375rem] font-medium text-bark truncate block">
                          {doc.title}
                        </span>
                        <span className="text-xs text-bark-muted mt-0.5">
                          v{doc.currentVersion}
                        </span>
                      </div>
                      <span className="text-xs text-bark-muted/60 shrink-0">
                        {formatDateRelative(doc.updatedAt.toISOString())}
                      </span>
                    </div>
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
