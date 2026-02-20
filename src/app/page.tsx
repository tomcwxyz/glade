import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  FileText,
  GitBranch,
  Lightbulb,
  MessageSquareText,
  Play,
  RefreshCw,
  ScrollText,
  TreePine,
  Users,
} from "lucide-react";
import Link from "next/link";
import { LandingNav } from "@/components/landing-nav";

function FeatureBlock({
  icon,
  number,
  title,
  description,
  detail,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-canopy-pale text-canopy shrink-0">
          {icon}
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
          {number}
        </span>
      </div>
      <h3
        className="text-xl font-medium tracking-tight mb-3 text-bark"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h3>
      <p className="text-[0.9375rem] text-bark-soft leading-relaxed mb-2">
        {description}
      </p>
      <p className="text-sm text-bark-muted leading-relaxed">{detail}</p>
    </div>
  );
}

function LifecycleStep({
  label,
  description,
  active,
}: {
  label: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-3 h-3 rounded-full border-2 ${active ? "border-canopy bg-canopy" : "border-border-strong bg-paper"}`}
        />
        <div className="w-px h-full bg-border min-h-[40px]" />
      </div>
      <div className="pb-8">
        <span
          className={`text-sm font-medium ${active ? "text-canopy" : "text-bark"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {label}
        </span>
        <p className="text-sm text-bark-muted mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

{/* Stylised app preview — decision log mockup */}
function AppPreview() {
  return (
    <div className="relative mx-auto max-w-4xl" aria-hidden="true">
      <div className="rounded-xl border border-border bg-paper shadow-lg shadow-bark/5 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-paper-warm border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-earth/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber/30" />
            <div className="w-2.5 h-2.5 rounded-full bg-canopy/30" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 rounded bg-paper-deep text-[10px] text-bark-muted">
              ourglade.app
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Sidebar mock */}
          <div className="hidden sm:block w-44 border-r border-border bg-paper-warm p-3 space-y-1.5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-canopy/8 text-canopy">
              <ScrollText size={13} />
              <span className="text-[11px] font-medium">Decisions</span>
            </div>
            {[
              { icon: <FileText size={13} />, label: "Documents" },
              { icon: <Users size={13} />, label: "Meetings" },
              { icon: <Lightbulb size={13} />, label: "Proposals" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 text-bark-muted">
                {item.icon}
                <span className="text-[11px]">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Content mock — decision log */}
          <div className="flex-1 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-medium text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Decision log
              </span>
              <div className="px-2 py-0.5 rounded bg-canopy text-paper text-[10px] font-medium">
                + New
              </div>
            </div>

            {[
              { n: 24, title: "Adopt consent-based decision-making for policy changes", status: "decided", color: "bg-sky/60" },
              { n: 23, title: "Approve revised safeguarding policy v3", status: "implemented", color: "bg-canopy/50" },
              { n: 22, title: "Delegate website refresh to communications working group", status: "reviewed", color: "bg-amber/50" },
              { n: 21, title: "Set reserves policy at 6 months operating costs", status: "decided", color: "bg-sky/60" },
            ].map((d) => (
              <div key={d.n} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                <span className="text-[10px] text-bark-muted font-medium tabular-nums w-6">
                  #{d.n}
                </span>
                <span className={`w-2 h-2 rounded-full ${d.color} shrink-0`} />
                <span className="text-[11px] text-bark flex-1 leading-snug truncate">
                  {d.title}
                </span>
                <span className="text-[9px] text-bark-muted uppercase tracking-wider hidden sm:inline">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating accent elements */}
      <div className="absolute -top-3 -right-3 w-20 h-20 rounded-full bg-canopy/5 blur-xl" />
      <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-amber/5 blur-xl" />
    </div>
  );
}

{/* Organic illustration: scattered governance "artefacts" */}
function ProblemIllustration() {
  return (
    <div className="relative w-full h-full min-h-[280px]" aria-hidden="true">
      <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Scattered documents */}
        <rect x="40" y="60" width="80" height="55" rx="4" fill="oklch(0.97 0.008 80)" stroke="oklch(0.85 0.015 80)" strokeWidth="1" transform="rotate(-8 40 60)" />
        <line x1="52" y1="75" x2="105" y2="70" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />
        <line x1="54" y1="83" x2="100" y2="78" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />
        <line x1="55" y1="91" x2="85" y2="87" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />

        <rect x="250" y="30" width="75" height="50" rx="4" fill="oklch(0.97 0.008 80)" stroke="oklch(0.85 0.015 80)" strokeWidth="1" transform="rotate(12 250 30)" />
        <line x1="260" y1="46" x2="310" y2="52" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />
        <line x1="261" y1="54" x2="305" y2="60" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />

        <rect x="160" y="180" width="90" height="60" rx="4" fill="oklch(0.97 0.008 80)" stroke="oklch(0.85 0.015 80)" strokeWidth="1" transform="rotate(-3 160 180)" />
        <line x1="172" y1="196" x2="238" y2="194" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />
        <line x1="173" y1="204" x2="230" y2="202" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />
        <line x1="174" y1="212" x2="215" y2="210" stroke="oklch(0.85 0.015 80)" strokeWidth="1" />

        {/* Email envelope shapes */}
        <g transform="translate(300, 160) rotate(6)">
          <rect width="65" height="42" rx="3" fill="oklch(0.92 0.02 80)" stroke="oklch(0.82 0.03 80)" strokeWidth="1" />
          <path d="M0,0 L32.5,22 L65,0" stroke="oklch(0.82 0.03 80)" strokeWidth="1" fill="none" />
        </g>

        <g transform="translate(60, 200) rotate(-10)">
          <rect width="55" height="36" rx="3" fill="oklch(0.92 0.02 80)" stroke="oklch(0.82 0.03 80)" strokeWidth="1" />
          <path d="M0,0 L27.5,18 L55,0" stroke="oklch(0.82 0.03 80)" strokeWidth="1" fill="none" />
        </g>

        {/* Disconnected dots — no lines between them */}
        <circle cx="140" cy="40" r="5" fill="oklch(0.68 0.14 70 / 0.4)" />
        <circle cx="200" cy="120" r="4" fill="oklch(0.52 0.07 155 / 0.3)" />
        <circle cx="340" cy="110" r="5" fill="oklch(0.55 0.06 45 / 0.3)" />
        <circle cx="100" cy="150" r="3.5" fill="oklch(0.52 0.07 155 / 0.25)" />
        <circle cx="280" cy="240" r="4" fill="oklch(0.68 0.14 70 / 0.3)" />

        {/* Question marks */}
        <text x="185" y="80" fontSize="18" fill="oklch(0.68 0.14 70 / 0.35)" fontFamily="serif">?</text>
        <text x="310" y="250" fontSize="14" fill="oklch(0.68 0.14 70 / 0.25)" fontFamily="serif">?</text>
        <text x="85" y="135" fontSize="16" fill="oklch(0.55 0.06 45 / 0.3)" fontFamily="serif">?</text>
      </svg>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Navigation */}
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle background: dappled light circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-[600px] h-[600px] rounded-full opacity-[0.04]"
            style={{
              background: "radial-gradient(circle, var(--color-canopy) 0%, transparent 70%)",
              top: "-10%",
              right: "-5%",
            }}
          />
          <div
            className="absolute w-[400px] h-[400px] rounded-full opacity-[0.03]"
            style={{
              background: "radial-gradient(circle, var(--color-amber) 0%, transparent 70%)",
              bottom: "10%",
              left: "5%",
            }}
          />
          <div
            className="absolute w-[300px] h-[300px] rounded-full opacity-[0.05]"
            style={{
              background: "radial-gradient(circle, var(--color-canopy) 0%, transparent 70%)",
              top: "40%",
              left: "30%",
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 sm:pt-24 pb-16 sm:pb-20 relative">
          <div className="max-w-3xl">
            <h1
              className="text-4xl leading-[1.1] tracking-tight mb-6 text-bark"
              style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
            >
              Where decisions
              <br />
              take root
            </h1>
            <p className="text-lg text-bark-soft leading-relaxed max-w-xl mb-4">
              A governance platform that treats every decision as a seed.
              Watch your organisation&apos;s institutional memory grow — traceable,
              reviewable, alive.
            </p>
            <p className="text-base text-bark-muted leading-relaxed max-w-lg mb-8 sm:mb-10">
              Stop losing governance knowledge to scattered emails, forgotten
              minutes, and departing board members. Start building a decision
              trail that teaches your organisation how to govern better.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Link
                href="/sign-up"
                className="flex items-center gap-2 px-6 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
              >
                Start your glade
                <ArrowRight size={15} />
              </Link>
              <Link
                href="#how-it-works"
                className="px-6 py-3 text-sm text-bark-soft hover:text-bark transition-colors"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* Decorative element — abstract "decision trees" */}
          <div className="absolute right-8 top-20 hidden lg:block" aria-hidden="true">
            <svg
              width="340"
              height="380"
              viewBox="0 0 340 380"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Organic circles suggesting tree canopies from above */}
              <circle cx="170" cy="160" r="80" fill="oklch(0.88 0.04 155 / 0.3)" />
              <circle cx="170" cy="160" r="55" fill="oklch(0.88 0.04 155 / 0.3)" />
              <circle cx="170" cy="160" r="30" fill="oklch(0.52 0.07 155 / 0.15)" />

              <circle cx="80" cy="250" r="50" fill="oklch(0.82 0.10 75 / 0.25)" />
              <circle cx="80" cy="250" r="30" fill="oklch(0.82 0.10 75 / 0.2)" />

              <circle cx="260" cy="280" r="60" fill="oklch(0.88 0.04 155 / 0.25)" />
              <circle cx="260" cy="280" r="38" fill="oklch(0.52 0.07 155 / 0.1)" />

              <circle cx="140" cy="330" r="35" fill="oklch(0.55 0.06 45 / 0.2)" />

              <circle cx="250" cy="130" r="28" fill="oklch(0.68 0.14 70 / 0.2)" />

              {/* Connection lines */}
              <path
                d="M170 160 Q 125 205 80 250"
                stroke="oklch(0.38 0.08 155 / 0.12)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M170 160 Q 215 220 260 280"
                stroke="oklch(0.38 0.08 155 / 0.12)"
                strokeWidth="1.5"
                fill="none"
              />
              <path
                d="M80 250 Q 110 290 140 330"
                stroke="oklch(0.38 0.08 155 / 0.08)"
                strokeWidth="1"
                fill="none"
              />

              {/* Small "action" dots */}
              <circle cx="200" cy="120" r="4" fill="oklch(0.52 0.07 155 / 0.4)" />
              <circle cx="145" cy="125" r="3" fill="oklch(0.52 0.07 155 / 0.3)" />
              <circle cx="210" cy="175" r="3.5" fill="oklch(0.68 0.14 70 / 0.4)" />
              <circle cx="60" cy="225" r="3" fill="oklch(0.68 0.14 70 / 0.3)" />
              <circle cx="100" cy="270" r="3" fill="oklch(0.52 0.07 155 / 0.3)" />
              <circle cx="285" cy="260" r="3.5" fill="oklch(0.52 0.07 155 / 0.35)" />
              <circle cx="240" cy="300" r="3" fill="oklch(0.52 0.07 155 / 0.25)" />
            </svg>
          </div>
        </div>
      </section>

      {/* App preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pb-14 sm:pb-24 -mt-2">
        <AppPreview />
      </section>

      {/* Social proof strip */}
      <section className="border-y border-border bg-paper-warm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-2 text-sm text-bark-muted">
          <span>Built for charities, CICs, cooperatives, and partnerships</span>
          <span className="hidden sm:inline text-border-strong">|</span>
          <span>Decision-centric governance</span>
          <span className="hidden sm:inline text-border-strong">|</span>
          <span>Open source core</span>
          <span className="hidden sm:inline text-border-strong">|</span>
          <span>WCAG 2.1 AA accessible</span>
        </div>
      </section>

      {/* Problem statement — now with illustration */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
              The problem
            </span>
            <h2
              className="text-2xl font-light tracking-tight mt-3 mb-6 text-bark"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Governance knowledge shouldn&apos;t walk out the door
            </h2>
            <div className="space-y-4 text-[0.9375rem] text-bark-soft leading-relaxed">
              <p>
                Decisions scattered across emails, minutes documents, and informal
                conversations. No clear trail connecting a policy to the decision
                that created it, the rationale behind it, or the people in the
                room.
              </p>
              <p>
                When board members change, institutional knowledge disappears.
                Organisations re-litigate old decisions, struggle to onboard new
                trustees, and find it difficult to learn from their own history.
              </p>
              <p className="text-bark font-medium">
                Compliance tools solve for documentation but not learning.
                Collaboration tools solve for communication but not accountability.
                Neither builds institutional memory.
              </p>
            </div>
          </div>
          <div className="hidden lg:block">
            <ProblemIllustration />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-paper-warm border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
            What Glade does
          </span>
          <h2
            className="text-2xl font-light tracking-tight mt-3 mb-10 sm:mb-16 text-bark max-w-lg"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The decision log as the spine of your organisation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-10 sm:gap-y-14">
            <FeatureBlock
              icon={<ScrollText size={18} />}
              number="01"
              title="Decision log"
              description="Every decision recorded with context: who decided, how, why, and what happened next."
              detail="Tag by theme, link related decisions, track actions, schedule reviews. The searchable timeline becomes your organisation's institutional memory."
            />
            <FeatureBlock
              icon={<FileText size={18} />}
              number="02"
              title="Living documents"
              description="Governance documents that trace back to the decisions that shaped them."
              detail="Click any clause to see why it exists. View any document as it was on any date. Version history shows what changed and which decision drove the change."
            />
            <FeatureBlock
              icon={<MessageSquareText size={18} />}
              number="03"
              title="Structured proposals"
              description="A clear path from idea to decision, with discussion, amendment, and resolution."
              detail="Proposals link to affected documents and suggest appropriate decision methods. When resolved, governance documents are prompted for update."
            />
            <FeatureBlock
              icon={<RefreshCw size={18} />}
              number="04"
              title="Learning loops"
              description="Scheduled reviews that help your organisation learn from its own governance history."
              detail="Did we follow through? Did we decide well? Are we governing well? Three levels of reflection, prompted but never forced."
            />
            <FeatureBlock
              icon={<Play size={18} />}
              number="05"
              title="Meeting mode"
              description="Live facilitation tools that capture decisions as a natural byproduct of running a meeting."
              detail="Guided consent rounds, voting, advice process. Facilitator and participant views. Auto-generated minutes with decisions and actions."
            />
            <FeatureBlock
              icon={<Brain size={18} />}
              number="06"
              title="Intelligent insights"
              description="AI that helps you see patterns in how you govern — never a decision-maker, always a reflective partner."
              detail="Surface recurring themes, generate review questions, suggest affected documents, produce governance digests and new member briefings."
            />
          </div>
        </div>
      </section>

      {/* How it works — decision lifecycle */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-24 items-start">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
              How it works
            </span>
            <h2
              className="text-2xl font-light tracking-tight mt-3 mb-6 text-bark"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Decisions have a lifecycle.
              <br />
              Glade makes it visible.
            </h2>
            <p className="text-[0.9375rem] text-bark-soft leading-relaxed mb-4">
              Not every decision reaches every stage. The platform supports
              scheduling reviews and prompting reflection, but never forces
              it. The goal is to make learning easy, not mandatory.
            </p>
            <p className="text-sm text-bark-muted leading-relaxed">
              Each stage generates data that feeds the next. Actions
              track follow-through. Reviews surface patterns. Patterns
              improve future decisions.
            </p>
          </div>

          <div className="pt-2">
            <LifecycleStep
              label="Proposed"
              description="A proposal is created with rationale, context, and a suggested decision method."
              active
            />
            <LifecycleStep
              label="Discussed"
              description="Async or synchronous discussion. Comments, amendments, questions from affected parties."
              active
            />
            <LifecycleStep
              label="Decided"
              description="Decision made using the chosen method. Outcome, participation, and conditions recorded."
              active
            />
            <LifecycleStep
              label="Implemented"
              description="Actions created and tracked. Governance documents updated if affected."
              active
            />
            <LifecycleStep
              label="Reviewed"
              description="Structured reflection: what happened, what was expected, what surprised us."
            />
            <div className="flex items-start gap-4">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-3 h-3 rounded-full border-2 border-border-strong bg-paper" />
              </div>
              <div>
                <span
                  className="text-sm font-medium text-bark"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Learned
                </span>
                <p className="text-sm text-bark-muted mt-0.5 leading-relaxed">
                  Patterns synthesised. Insights feed back into future
                  governance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Decision methods */}
      <section className="bg-paper-warm border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
          <div className="max-w-2xl mb-10 sm:mb-14">
            <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
              Decision methods
            </span>
            <h2
              className="text-2xl font-light tracking-tight mt-3 mb-4 text-bark"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Not everything should be a vote
            </h2>
            <p className="text-[0.9375rem] text-bark-soft leading-relaxed">
              Glade supports the decision methods progressive organisations
              actually use, with guided flows — not just labels.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-0">
            {[
              {
                name: "Consent",
                desc: "Adopted unless there's a paramount objection. The default for governance decisions.",
              },
              {
                name: "Advice Process",
                desc: "Individual decides after consulting affected parties. Autonomy with accountability.",
              },
              {
                name: "Consensus",
                desc: "Full agreement from everyone present. For the decisions that matter most.",
              },
              {
                name: "Majority Vote",
                desc: "Simple majority carries. Quick and clear for binary choices.",
              },
              {
                name: "Delegation",
                desc: "Authority granted within constraints. Scope, reporting, and review date recorded.",
              },
              {
                name: "Lazy Consensus",
                desc: "Silence means agreement. Time-boxed objection window for low-stakes decisions.",
              },
            ].map((method) => (
              <div key={method.name} className="py-4 border-t border-border">
                <h3
                  className="text-base font-medium text-bark mb-1.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {method.name}
                </h3>
                <p className="text-sm text-bark-muted leading-relaxed">
                  {method.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
        <div className="text-center mb-10 sm:mb-16">
          <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
            Pricing
          </span>
          <h2
            className="text-2xl font-light tracking-tight mt-3 mb-4 text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simple, honest pricing
          </h2>
          <p className="text-[0.9375rem] text-bark-soft leading-relaxed max-w-lg mx-auto">
            Start free, grow when you&apos;re ready. No hidden fees, no feature
            surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Seedling (Free) */}
          <div className="border border-border rounded-2xl p-6 sm:p-8 flex flex-col">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-canopy-pale text-canopy mb-4">
              <TreePine size={20} />
            </div>
            <h3
              className="text-lg font-medium text-bark mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Seedling
            </h3>
            <p className="text-sm text-bark-muted mb-5">
              For small teams getting started
            </p>
            <div className="mb-6">
              <span
                className="text-3xl font-light text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Free
              </span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                "5 members per space",
                "50 decisions per space",
                "Decision log & documents",
                "Proposals & topics",
                "1 space",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-bark-soft">
                  <Check size={15} className="text-canopy mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center px-5 py-2.5 border border-border text-bark rounded-lg text-sm font-medium hover:bg-paper-deep transition-colors"
            >
              Start your glade
            </Link>
          </div>

          {/* Canopy (Pro) */}
          <div className="border-2 border-canopy rounded-2xl p-6 sm:p-8 flex flex-col relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-canopy text-paper text-xs font-medium rounded-full">
              Most popular
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-canopy text-paper mb-4">
              <TreePine size={20} />
            </div>
            <h3
              className="text-lg font-medium text-bark mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Canopy
            </h3>
            <p className="text-sm text-bark-muted mb-5">
              For growing organisations
            </p>
            <div className="mb-6">
              <span
                className="text-3xl font-light text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                &pound;15
              </span>
              <span className="text-sm text-bark-muted">/month</span>
              <p className="text-xs text-bark-muted mt-1">or &pound;144/year (save 20%)</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                "25 members per space",
                "Unlimited decisions",
                "AI governance insights",
                "Live meeting mode",
                "Unlimited spaces",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-bark-soft">
                  <Check size={15} className="text-canopy mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center px-5 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
            >
              Start free, upgrade anytime
            </Link>
          </div>

          {/* Old Growth (Enterprise) */}
          <div className="border border-border rounded-2xl p-6 sm:p-8 flex flex-col">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-paper-deep text-bark-muted mb-4">
              <TreePine size={20} />
            </div>
            <h3
              className="text-lg font-medium text-bark mb-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Old Growth
            </h3>
            <p className="text-sm text-bark-muted mb-5">
              For complex governance needs
            </p>
            <div className="mb-6">
              <span
                className="text-3xl font-light text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Custom
              </span>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {[
                "Unlimited members",
                "Unlimited decisions",
                "AI governance insights",
                "Live meeting mode",
                "Unlimited spaces",
                "Dedicated support",
                "Custom integrations",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-bark-soft">
                  <Check size={15} className="text-canopy mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="mailto:hello@ourglade.app"
              className="block text-center px-5 py-2.5 border border-border text-bark rounded-lg text-sm font-medium hover:bg-paper-deep transition-colors"
            >
              Contact us
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-paper-warm border-y border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-32 text-center">
          <h2
            className="text-3xl font-light tracking-tight mb-4 text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start governing better
          </h2>
          <p className="text-bark-soft text-base mb-8 sm:mb-10 max-w-md mx-auto leading-relaxed">
            Create a space for your organisation. Log your first decision.
            Watch your institutional memory grow.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
          >
            Start your glade
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-paper-warm">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-bark-muted">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-canopy text-paper">
              <TreePine size={13} strokeWidth={2.5} />
            </div>
            <span
              className="font-medium text-bark"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Glade
            </span>
          </div>
          <span>
            Built by{" "}
            <span className="text-bark">The Good Ship</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
