import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/**
 * Shared renderer for AI-generated markdown (briefings, digests, Q&A answers).
 *
 * The project has no @tailwindcss/typography plugin, so every element is styled
 * explicitly here to match the "Clearing in the Forest" theme. remark-gfm adds
 * table, strikethrough and task-list support that the old hand-rolled line
 * splitter lacked — tables in particular now render properly.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-bark mt-5 first:mt-0 mb-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-bark mt-5 first:mt-0 mb-2">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-bark mt-4 first:mt-0 mb-1.5">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-[0.8125rem] leading-relaxed text-bark mb-2.5 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 mb-2.5 space-y-1 marker:text-bark-muted">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 mb-2.5 space-y-1 marker:text-bark-muted">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[0.8125rem] leading-relaxed text-bark">{children}</li>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-canopy hover:text-canopy-light underline underline-offset-2"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-bark">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 my-3 text-bark-muted italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border my-4" />,
  code: ({ children }) => (
    <code className="px-1 py-0.5 rounded bg-paper-deep text-[0.75rem] font-mono text-bark">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-paper-deep p-3 rounded-lg overflow-x-auto my-3 text-[0.75rem]">
      {children}
    </pre>
  ),
  // Wrap tables so they scroll horizontally on narrow viewports instead of overflowing.
  table: ({ children }) => (
    <div className="overflow-x-auto my-3">
      <table className="w-full border-collapse text-[0.8125rem]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-paper-deep">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-bark">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 align-top text-bark">{children}</td>
  ),
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-bark">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
