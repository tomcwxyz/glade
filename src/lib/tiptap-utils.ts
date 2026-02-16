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
