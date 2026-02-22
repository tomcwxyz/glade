interface TiptapNode {
  type: string;
  content?: TiptapNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

export function tiptapToText(content: TiptapNode): string {
  if (!content) return "";

  const lines: string[] = [];

  function walk(node: TiptapNode, listType?: string, listIndex?: number) {
    if (node.type === "text") {
      return node.text || "";
    }

    if (node.type === "heading") {
      const level = (node.attrs?.level as number) || 2;
      const prefix = "#".repeat(level) + " ";
      const text = (node.content || []).map((c) => walk(c)).join("");
      lines.push(prefix + text);
      return "";
    }

    if (node.type === "paragraph") {
      const text = (node.content || []).map((c) => walk(c)).join("");
      lines.push(text);
      return "";
    }

    if (node.type === "bulletList") {
      (node.content || []).forEach((item) => walk(item, "bullet"));
      return "";
    }

    if (node.type === "orderedList") {
      (node.content || []).forEach((item, i) => walk(item, "ordered", i + 1));
      return "";
    }

    if (node.type === "listItem") {
      const marker = listType === "ordered" ? `${listIndex}. ` : "- ";
      const text = (node.content || [])
        .map((c) => (c.content || []).map((t) => walk(t)).join(""))
        .join("\n");
      lines.push(marker + text);
      return "";
    }

    if (node.type === "doc") {
      (node.content || []).forEach((c) => walk(c));
      return "";
    }

    // Fallback: recurse into children
    if (node.content) {
      node.content.forEach((c) => walk(c));
    }
    return node.text || "";
  }

  walk(content);
  return lines.join("\n");
}

/** Convert basic Markdown to Tiptap JSON (headings, paragraphs, bullet/ordered lists). */
export function markdownToTiptap(markdown: string): TiptapNode {
  const lines = markdown.split("\n");
  const content: TiptapNode[] = [];
  let i = 0;

  function textNode(text: string): TiptapNode {
    return { type: "text", text };
  }

  function paragraph(text: string): TiptapNode {
    return text
      ? { type: "paragraph", content: [textNode(text)] }
      : { type: "paragraph" };
  }

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      content.push({
        type: "heading",
        attrs: { level: headingMatch[1].length },
        content: [textNode(headingMatch[2])],
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      content.push({ type: "horizontalRule" });
      i++;
      continue;
    }

    // Bullet list
    if (/^[-*]\s/.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push({
          type: "listItem",
          content: [paragraph(lines[i].replace(/^[-*]\s/, ""))],
        });
        i++;
      }
      content.push({ type: "bulletList", content: items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: TiptapNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({
          type: "listItem",
          content: [paragraph(lines[i].replace(/^\d+\.\s/, ""))],
        });
        i++;
      }
      content.push({ type: "orderedList", content: items });
      continue;
    }

    // Empty line → skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    content.push(paragraph(line));
    i++;
  }

  return { type: "doc", content };
}
