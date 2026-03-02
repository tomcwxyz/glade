import { redirect } from "next/navigation";
import { getPublicSpace } from "@/lib/queries";

const REDIRECT_PRIORITY = [
  { key: "publicGlade", path: "glade" },
  { key: "publicDecisionLog", path: "decisions" },
  { key: "publicDocuments", path: "documents" },
  { key: "publicActions", path: "actions" },
  { key: "publicMeetings", path: "meetings" },
  { key: "publicProposals", path: "proposals" },
  { key: "publicTopics", path: "topics" },
] as const;

export default async function PublicSpacePage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) return null;

  const settings = (space.settings as Record<string, unknown>) || {};

  for (const { key, path } of REDIRECT_PRIORITY) {
    if (settings[key] === true) {
      redirect(`/public/${spaceSlug}/${path}`);
    }
  }

  return null;
}
