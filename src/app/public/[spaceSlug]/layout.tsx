import { notFound } from "next/navigation";
import { getPublicSpace } from "@/lib/queries";
import Link from "next/link";
import { TreePine } from "lucide-react";

const NAV_ITEMS = [
  { key: "publicGlade", href: "glade", label: "Glade" },
  { key: "publicDecisionLog", href: "decisions", label: "Decisions" },
  { key: "publicActions", href: "actions", label: "Actions" },
  { key: "publicMeetings", href: "meetings", label: "Meetings" },
  { key: "publicDocuments", href: "documents", label: "Documents" },
  { key: "publicProposals", href: "proposals", label: "Proposals" },
  { key: "publicTopics", href: "topics", label: "Topics" },
] as const;

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};

  // If nothing is public, 404
  const hasAnyPublic = NAV_ITEMS.some((item) => settings[item.key] === true);
  if (!hasAnyPublic) notFound();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border bg-paper-warm">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TreePine size={20} className="text-canopy" />
            <div>
              <h1
                className="text-lg font-medium text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {space.name}
              </h1>
              {space.description && (
                <p className="text-xs text-bark-muted">{space.description}</p>
              )}
            </div>
          </div>
          <span className="text-xs text-bark-muted/60 bg-paper-deep px-2.5 py-1 rounded-full">
            Public view
          </span>
        </div>
        <nav className="max-w-4xl mx-auto px-4 sm:px-8 flex gap-1 overflow-x-auto">
          {NAV_ITEMS.filter((item) => settings[item.key] === true).map((item) => (
            <Link
              key={item.key}
              href={`/public/${spaceSlug}/${item.href}`}
              className="px-3 py-2 text-sm text-bark-muted hover:text-bark transition-colors border-b-2 border-transparent hover:border-canopy/30 whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
