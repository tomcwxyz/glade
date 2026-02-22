import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentSpace } from "@/lib/space";
import { getDocumentById } from "@/lib/queries";
import { tiptapToText } from "@/lib/tiptap-utils";

const TYPE_LABELS: Record<string, string> = {
  constitution: "Constitution",
  terms_of_reference: "Terms of Reference",
  policy: "Policy",
  role_description: "Role Description",
  standing_orders: "Standing Orders",
  custom: "Document",
};

export async function GET(
  _req: Request,
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

  const typeLabel = TYPE_LABELS[doc.type] || doc.type;
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
  const slug = doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filename = `${slug}.md`;

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
