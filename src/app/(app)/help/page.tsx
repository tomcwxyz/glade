import type { Metadata } from "next";
import { HelpCircle, BookOpen, Calendar, FileText, ListChecks, MessageSquare, Lightbulb, Users, Sparkles, TreePine } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Help" };

const SECTIONS = [
  {
    icon: BookOpen,
    title: "Decisions",
    content: [
      "Decisions are the core unit of governance in Glade. Every decision records what was decided, why, how, and by whom.",
      "Each decision has a status lifecycle: **Decided** → **Implemented** → **Reviewed** → **Learned**. Advance through these stages as your organisation acts on and reflects on each decision.",
      "Link related decisions together (supersedes, amends, relates to) to build a traceable decision trail.",
      "Set a review date to schedule a future check-in. Glade will highlight decisions coming up for review on your dashboard.",
    ],
  },
  {
    icon: Calendar,
    title: "Meetings",
    content: [
      "Meeting records connect decisions to where they were made. Create a meeting, add agenda items, and link the decisions that came out of it.",
      "**Live meetings** let you facilitate governance meetings in real-time. Share a join link or QR code with participants.",
      "Decision methods available in live mode: **Consent** (present → clarify → react → object → integrate), **Majority vote** (with configurable pass thresholds), **Advice process** (consult → review), **Delegation**, and **Lazy consensus**.",
      "After a meeting ends, view the structured summary with all decisions and actions automatically recorded.",
    ],
  },
  {
    icon: FileText,
    title: "Documents",
    content: [
      "Governance documents are living records shaped by decisions. Types include constitutions, terms of reference, policies, role descriptions, and standing orders.",
      "Every document change creates a new version. Click \"History\" to see what changed and which decision triggered the change.",
      "Use \"Why does this exist?\" to see the decision trail behind any section.",
      "Import existing documents from Markdown files, or export to Markdown for use outside Glade.",
    ],
  },
  {
    icon: MessageSquare,
    title: "Proposals",
    content: [
      "Proposals develop ideas before they become decisions. Start a proposal, discuss it with your team, and when it's ready, convert it to a decision.",
      "Proposals move through stages: **Draft** → **Open for discussion** → **Ready for decision** → **Decided** → **Implemented**.",
      "Attach supporting materials and have threaded discussions directly on each proposal.",
    ],
  },
  {
    icon: Lightbulb,
    title: "Topics",
    content: [
      "Topics are lightweight items for your governance attention — questions, tensions, or agenda suggestions.",
      "Promote a topic to a full proposal when it needs more development, or pull it directly into a meeting agenda.",
    ],
  },
  {
    icon: ListChecks,
    title: "Actions",
    content: [
      "Actions are tasks that flow from decisions. Each action has an owner, due date, and status.",
      "Status cycles: **Open** → **In progress** → **Complete**. Overdue actions are highlighted on the dashboard.",
      "View all outstanding actions across your space on the Actions page, sorted by urgency.",
    ],
  },
  {
    icon: Users,
    title: "Members & Roles",
    content: [
      "Spaces support three roles: **Admin** (full access, settings, billing), **Member** (create and edit content), and **Observer** (read-only).",
      "Invite members by email. They'll receive a link to join your space.",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Features",
    content: [
      "When enabled, Glade uses AI to analyse your governance patterns, suggest document updates, generate review questions, and create briefings for new members.",
      "AI features can be toggled on or off per space in Settings. All AI analysis is triggered manually — nothing runs in the background.",
      "Available AI tools: pattern analysis, decision review prompts, document impact suggestions, stale document detection, governance digest, and new member briefing.",
    ],
  },
  {
    icon: TreePine,
    title: "Public Transparency",
    content: [
      "Make your decision log and governance documents publicly accessible. Enable in Settings → Public Visibility.",
      "Public pages are available at **/public/your-space-slug**. You can also embed a compact decision log widget on external websites using the provided iframe code.",
    ],
  },
];

function renderContent(text: string) {
  // Simple bold markdown rendering
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-medium text-bark">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <HelpCircle size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Help
          </h1>
        </div>
        <p className="text-bark-muted">
          A guide to Glade&apos;s features and concepts.
        </p>
      </header>

      {/* Quick links */}
      <nav className="flex flex-wrap gap-2 mb-10">
        {SECTIONS.map((section) => (
          <a
            key={section.title}
            href={`#${section.title.toLowerCase().replace(/\s+/g, "-")}`}
            className="px-3 py-1.5 text-xs font-medium text-bark-muted bg-paper-deep border border-border rounded-lg hover:text-bark hover:bg-paper-warm transition-colors"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              id={section.title.toLowerCase().replace(/\s+/g, "-")}
              className="scroll-mt-6"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <Icon size={18} className="text-canopy" />
                <h2
                  className="text-lg font-medium text-bark"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {section.title}
                </h2>
              </div>
              <div className="space-y-2 pl-[30px]">
                {section.content.map((text, i) => (
                  <p key={i} className="text-sm text-bark-muted leading-relaxed">
                    {renderContent(text)}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-12 pt-8 border-t border-border text-center">
        <p className="text-sm text-bark-muted">
          Need more help?{" "}
          <Link href="/settings" className="text-canopy hover:underline">
            Check your settings
          </Link>{" "}
          or contact your space admin.
        </p>
      </div>
    </div>
  );
}
