"use client";

import { TiptapEditor } from "@/components/tiptap-editor";
import type { JSONContent } from "@tiptap/react";

export function TiptapViewer({ content }: { content: Record<string, unknown> }) {
  return (
    <TiptapEditor
      content={content as JSONContent}
      editable={false}
    />
  );
}
