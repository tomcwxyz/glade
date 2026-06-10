import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentSpace } from "@/lib/space";
import { getDocumentById } from "@/lib/queries";
import { tiptapToText, tiptapToHtml } from "@/lib/tiptap-utils";

/** Escape untrusted strings interpolated into the HTML/Word export. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Document",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const space = await getCurrentSpace();
  if (!space) {
    return NextResponse.json({ error: "No space" }, { status: 400 });
  }

  const { id } = await params;
  const doc = await getDocumentById(space.id, id);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format");
  const typeLabel = TYPE_LABELS[doc.type] || doc.type;
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (format === "docx") {
    const bodyHtml = doc.content
      ? tiptapToHtml(doc.content as Parameters<typeof tiptapToHtml>[0])
      : "";
    const dateStr = doc.updatedAt.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  body { font-family: Calibri, sans-serif; font-size: 11pt; color: #333; line-height: 1.5; }
  h1 { font-size: 20pt; color: #1a1a1a; margin-bottom: 4pt; }
  h2 { font-size: 14pt; color: #1a1a1a; margin-top: 18pt; }
  h3 { font-size: 12pt; color: #1a1a1a; margin-top: 14pt; }
  p { margin: 6pt 0; }
  .meta { font-size: 9pt; color: #666; margin-bottom: 12pt; }
  hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
  ul, ol { margin: 6pt 0 6pt 24pt; }
  li { margin: 3pt 0; }
</style>
</head>
<body>
<h1>${escapeHtml(doc.title)}</h1>
<p class="meta"><b>Type:</b> ${escapeHtml(typeLabel)} &nbsp;&middot;&nbsp; <b>Status:</b> ${doc.status === "published" ? "Published" : "Draft"} &nbsp;&middot;&nbsp; <b>Version:</b> ${doc.currentVersion} &nbsp;&middot;&nbsp; <b>Updated:</b> ${dateStr}</p>
<hr>
${bodyHtml}
<hr>
<p class="meta">Exported from ${escapeHtml(space.name)} on Glade</p>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword",
        "Content-Disposition": `attachment; filename="${slug}.doc"`,
      },
    });
  }

  // Default: Markdown export
  const body = doc.content ? tiptapToText(doc.content as Parameters<typeof tiptapToText>[0]) : "";
  const lines = [
    `# ${doc.title}`,
    "",
    `**Type:** ${typeLabel}`,
    `**Status:** ${doc.status === "published" ? "Published" : "Draft"}`,
    `**Version:** ${doc.currentVersion}`,
    `**Last updated:** ${doc.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    "",
    "---",
    "",
    body,
  ];

  const markdown = lines.join("\n");

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
