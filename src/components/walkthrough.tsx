"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, TreePine } from "lucide-react";

const STEPS = [
  {
    title: "Welcome to Glade",
    description:
      "Glade helps your organisation make better decisions together. Every decision is recorded, traceable, and connected to your governance documents.",
    position: "center" as const,
  },
  {
    title: "Dashboard",
    description:
      "Your home base. See recent decisions, open actions, upcoming reviews, and governance health at a glance.",
    selector: "[data-walkthrough='dashboard']",
    position: "right" as const,
  },
  {
    title: "Decision Log",
    description:
      "The heart of Glade. Log every governance decision with its method, rationale, and outcome. Decisions link to meetings, documents, and each other.",
    selector: "[data-walkthrough='decisions']",
    position: "right" as const,
  },
  {
    title: "Governance Documents",
    description:
      "Living documents shaped by decisions. Click any section to see which decisions created it. Version history tracks every change.",
    selector: "[data-walkthrough='documents']",
    position: "right" as const,
  },
  {
    title: "Live Meetings",
    description:
      "Run governance meetings with structured agenda, decision flows (consent, voting, advice), and real-time participation. Decisions are recorded as you go.",
    selector: "[data-walkthrough='meetings']",
    position: "right" as const,
  },
  {
    title: "Proposals & Topics",
    description:
      "Raise topics for discussion and develop proposals before meetings. When a proposal becomes a decision, Glade prompts you to update affected documents.",
    selector: "[data-walkthrough='proposals']",
    position: "right" as const,
  },
  {
    title: "You're all set!",
    description:
      "Start by logging your first decision or recording a meeting. You can revisit this walkthrough from Settings at any time.",
    position: "center" as const,
  },
];

const STORAGE_KEY = "glade-walkthrough-seen";

export function Walkthrough() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const positionTooltip = useCallback(() => {
    const currentStep = STEPS[step];
    if (!currentStep || currentStep.position === "center" || !currentStep.selector) {
      setTooltipStyle({});
      return;
    }

    const el = document.querySelector(currentStep.selector);
    if (!el) {
      setTooltipStyle({});
      return;
    }

    const rect = el.getBoundingClientRect();
    setTooltipStyle({
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.right + 16}px`,
      transform: "translateY(-25%)",
    });
  }, [step]);

  useEffect(() => {
    if (!visible) return;
    positionTooltip();

    // Reposition on resize/scroll
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [visible, positionTooltip]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function next() {
    if (step >= STEPS.length - 1) {
      dismiss();
    } else {
      setStep(step + 1);
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible) return null;

  const currentStep = STEPS[step];
  const isCenter = currentStep.position === "center" || !("selector" in currentStep) || !currentStep.selector;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-bark/30 z-50" onClick={dismiss} />

      {/* Tooltip */}
      <div
        className={`fixed z-50 w-80 bg-paper border border-border rounded-xl shadow-lg overflow-hidden ${
          isCenter ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
        }`}
        style={isCenter ? {} : tooltipStyle}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-paper-warm">
          <div className="flex items-center gap-2">
            <TreePine size={14} className="text-canopy" />
            <span className="text-xs font-medium text-bark-muted">
              {step + 1} of {STEPS.length}
            </span>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
            aria-label="Dismiss walkthrough"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <h3
            className="text-base font-medium text-bark mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {currentStep.title}
          </h3>
          <p className="text-sm text-bark-muted leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-paper-warm">
          <button
            onClick={dismiss}
            className="text-xs text-bark-muted hover:text-bark transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-bark-muted border border-border rounded-lg hover:bg-paper-deep transition-colors"
              >
                <ChevronLeft size={12} />
                Back
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors"
            >
              {isLast ? "Get started" : "Next"}
              {!isLast && <ChevronRight size={12} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Reset walkthrough state so it shows again. */
export function resetWalkthrough() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
