import { ArrowRight, BookOpen, GitBranch, RefreshCw, TreePine } from "lucide-react";
import Link from "next/link";
import { LandingNav } from "@/components/landing-nav";

function FeatureBlock({
  number,
  title,
  description,
  detail,
}: {
  number: string;
  title: string;
  description: string;
  detail: string;
}) {
  return (
    <div className="group">
      <span className="text-xs uppercase tracking-[0.2em] text-canopy font-medium">
        {number}
      </span>
      <h3
        className="text-xl font-medium tracking-tight mt-2 mb-3 text-bark"
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

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 sm:pt-24 pb-16 sm:pb-32 relative">
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

      {/* Problem statement */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-24">
        <div className="max-w-2xl">
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
              number="01"
              title="Decision log"
              description="Every decision recorded with context: who decided, how, why, and what happened next."
              detail="Tag by theme, link related decisions, track actions, schedule reviews. The searchable timeline becomes your organisation's institutional memory."
            />
            <FeatureBlock
              number="02"
              title="Living documents"
              description="Governance documents that trace back to the decisions that shaped them."
              detail="Click any clause to see why it exists. View any document as it was on any date. Version history shows what changed and which decision drove the change."
            />
            <FeatureBlock
              number="03"
              title="Structured proposals"
              description="A clear path from idea to decision, with discussion, amendment, and resolution."
              detail="Proposals link to affected documents and suggest appropriate decision methods. When resolved, governance documents are prompted for update."
            />
            <FeatureBlock
              number="04"
              title="Learning loops"
              description="Scheduled reviews that help your organisation learn from its own governance history."
              detail="Did we follow through? Did we decide well? Are we governing well? Three levels of reflection, prompted but never forced."
            />
            <FeatureBlock
              number="05"
              title="Meeting mode"
              description="Live facilitation tools that capture decisions as a natural byproduct of running a meeting."
              detail="Guided consent rounds, voting, advice process. Facilitator and participant views. Auto-generated minutes with decisions and actions."
            />
            <FeatureBlock
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

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-32 text-center">
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
