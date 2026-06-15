import { getPublicSpace, getPublicDecisions } from "@/lib/queries";
import { getBaseUrl } from "@/lib/email-templates";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of a space's public decisions. Gated on publicDecisionLog. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spaceSlug: string }> }
) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space || (space.settings as Record<string, unknown>)?.publicDecisionLog !== true) {
    return new Response("Not found", { status: 404 });
  }

  const base = getBaseUrl();
  const decisions = await getPublicDecisions(space.id);
  const listUrl = `${base}/public/${spaceSlug}/decisions`;

  const items = decisions
    .map((d) => {
      const link = `${base}/public/${spaceSlug}/decisions/${d.number}`;
      const desc = d.outcome || d.description || "";
      return `    <item>
      <title>${escapeXml(`#${d.number} ${d.title}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(d.date).toUTCString()}</pubDate>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(`${space.name} — Decisions`)}</title>
    <link>${listUrl}</link>
    <description>${escapeXml(`Governance decisions published by ${space.name}`)}</description>
    <language>en-GB</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
