import { redirect } from "next/navigation";
import { getPublicSpace } from "@/lib/queries";

export default async function PublicSpacePage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) return null;

  const settings = (space.settings as Record<string, unknown>) || {};

  // Redirect to the first available public section
  if (settings.publicDecisionLog === true) {
    redirect(`/public/${spaceSlug}/decisions`);
  }
  if (settings.publicDocuments === true) {
    redirect(`/public/${spaceSlug}/documents`);
  }

  return null;
}
