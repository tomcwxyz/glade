import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSpace, getPublicGladeDecisions } from "@/lib/queries";
import { GladeCanvas } from "@/app/(app)/glade/glade-canvas";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}): Promise<Metadata> {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  return { title: space ? `${space.name} — Glade` : "Glade" };
}

export default async function PublicGladePage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicGlade !== true) notFound();

  const decisions = await getPublicGladeDecisions(space.id);
  const stableNow = Date.now();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {decisions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-bark-muted">No public decisions to display on the canvas.</p>
        </div>
      ) : (
        <GladeCanvas decisions={decisions} readOnly now={stableNow} />
      )}
    </div>
  );
}
