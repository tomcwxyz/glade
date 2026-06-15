import type { MetadataRoute } from "next";
import { getPublicSpacesForSitemap, getPublicDecisionsForSitemap } from "@/lib/queries";

const BASE_URL = "https://ourglade.app";

// Generated per-request (it reads the DB) rather than at build time.
export const dynamic = "force-dynamic";

// Public section toggle → URL segment (mirrors the public layout nav).
const SECTIONS: [string, string][] = [
  ["publicGlade", "glade"],
  ["publicDecisionLog", "decisions"],
  ["publicActions", "actions"],
  ["publicMeetings", "meetings"],
  ["publicDocuments", "documents"],
  ["publicProposals", "proposals"],
  ["publicTopics", "topics"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/sign-in`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/sign-up`, changeFrequency: "monthly", priority: 0.8 },
  ];

  try {
    const [spaceRows, publicDecisions] = await Promise.all([
      getPublicSpacesForSitemap(),
      getPublicDecisionsForSitemap(),
    ]);

    for (const s of spaceRows) {
      const settings = (s.settings as Record<string, unknown>) || {};
      const enabled = SECTIONS.filter(([key]) => settings[key] === true);
      if (enabled.length === 0) continue;

      entries.push({
        url: `${BASE_URL}/public/${s.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
      for (const [, segment] of enabled) {
        entries.push({
          url: `${BASE_URL}/public/${s.slug}/${segment}`,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
    }

    for (const d of publicDecisions) {
      entries.push({
        url: `${BASE_URL}/public/${d.slug}/decisions/${d.number}`,
        lastModified: new Date(d.date),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Fall back to the static entries if the DB is unreachable.
  }

  return entries;
}
