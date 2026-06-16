"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useLiveRegion } from "@/components/live-region";
import { ListChecks, Minus, Plus, RotateCcw, X } from "lucide-react";

// --- Types & Constants ---

type DecisionStatus = "decided" | "implemented" | "reviewed" | "learned";

interface LinkedDecision {
  id: string;
  number: number;
  title: string;
  relation: string;
  direction: "forward" | "reverse";
}

interface Decision {
  id: string;
  number: number;
  title: string;
  description: string;
  rationale: string;
  method: string;
  outcome: string;
  status: DecisionStatus;
  participants: string[];
  date: string;
  tags: string[];
  reviewDate: string | null;
  actionsCount: number;
  actionsComplete: number;
  linkedDecisions: LinkedDecision[];
}

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

const STATUS_LABELS: Record<string, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

// --- Layout & Data ---

interface TreeNode {
  decision: Decision;
  x: number;
  y: number;
  radius: number;
  ringRadii: number[];
  color: string;
  colorLight: string;
  colorMid: string;
  actions: { angle: number; complete: boolean }[];
  cluster: string;
  canopyPath: string;
  seed: number;
}

// Seeded pseudo-random for deterministic layout
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Status → color mapping (natural lifecycle: fresh green → deep amber → rich earth)
const STATUS_COLORS: Record<
  DecisionStatus,
  { fill: string; light: string; mid: string }
> = {
  // Lifecycle: bright young growth → deep mature green → autumnal amber → brown.
  // Hues + lightness chosen so all four read distinctly (decided vs implemented
  // were near-identical greens before).
  decided: {
    fill: "oklch(0.60 0.14 138)",
    light: "oklch(0.90 0.07 138)",
    mid: "oklch(0.75 0.11 138)",
  },
  implemented: {
    fill: "oklch(0.40 0.09 165)",
    light: "oklch(0.83 0.05 165)",
    mid: "oklch(0.60 0.07 165)",
  },
  reviewed: {
    fill: "oklch(0.62 0.13 70)",
    light: "oklch(0.90 0.06 75)",
    mid: "oklch(0.76 0.10 72)",
  },
  learned: {
    fill: "oklch(0.45 0.07 40)",
    light: "oklch(0.85 0.04 45)",
    mid: "oklch(0.65 0.06 43)",
  },
};

// Per-status tree form parameters
const TREE_PARAMS: Record<
  DecisionStatus,
  {
    wobble: number;
    trunkScale: number;
    trunkWidth: number;
    branches: number;
    rootFlares: number;
  }
> = {
  decided: { wobble: 0.06, trunkScale: 0.3, trunkWidth: 0.12, branches: 0, rootFlares: 0 },
  implemented: { wobble: 0.10, trunkScale: 0.45, trunkWidth: 0.16, branches: 2, rootFlares: 0 },
  reviewed: { wobble: 0.14, trunkScale: 0.55, trunkWidth: 0.20, branches: 3, rootFlares: 1 },
  learned: { wobble: 0.18, trunkScale: 0.65, trunkWidth: 0.24, branches: 4, rootFlares: 2 },
};

// Cluster positions (tag → rough position on canvas)
// Arranged in a loose ring to use the full canvas area
const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
  "service delivery": { x: 0.25, y: 0.25 },
  strategy: { x: 0.5, y: 0.2 },
  partnerships: { x: 0.75, y: 0.3 },
  finance: { x: 0.78, y: 0.55 },
  HR: { x: 0.2, y: 0.55 },
  governance: { x: 0.5, y: 0.5 },
  compliance: { x: 0.7, y: 0.75 },
  operations: { x: 0.3, y: 0.75 },
  communications: { x: 0.5, y: 0.38 },
  community: { x: 0.35, y: 0.4 },
};

// Deterministic fallback position for unknown tags
function clusterForTag(tag: string): { x: number; y: number } {
  if (CLUSTER_CENTERS[tag]) return CLUSTER_CENTERS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash + tag.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);
  return { x: 0.2 + (h % 600) / 1000, y: 0.2 + ((h >> 10) % 600) / 1000 };
}

// Deterministic seed from a single ID string
function hashId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Generate points on a wobbly circle for organic canopy shapes
function canopyPoints(
  r: number,
  seed: number,
  wobble: number,
  count: number = 10
): { x: number; y: number }[] {
  const rand = seededRandom(seed);
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const offset = 1 + (rand() - 0.5) * 2 * wobble;
    points.push({
      x: Math.cos(angle) * r * offset,
      y: Math.sin(angle) * r * offset,
    });
  }
  return points;
}

// Convert closed point loop to smooth cubic Bezier path via Catmull-Rom
function smoothClosedPath(points: { x: number; y: number }[]): string {
  const n = points.length;
  if (n < 3) return "";
  const parts: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    parts.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    );
  }
  parts.push("Z");
  return parts.join(" ");
}

function layoutNodes(
  decisions: Decision[],
  width: number,
  height: number
): TreeNode[] {
  const padding = 80;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const nodes: TreeNode[] = decisions.map((d) => {
    // Size based on participants + actions (more engagement = bigger tree)
    const engagement = d.participants.length + d.actionsCount;
    const baseRadius = 28 + engagement * 4;
    const radius = Math.min(baseRadius, 70);

    // Concentric rings (tree rings / growth rings)
    const stages: DecisionStatus[] = [
      "decided",
      "implemented",
      "reviewed",
      "learned",
    ];
    const currentIndex = stages.indexOf(d.status);
    const ringRadii: number[] = [];
    for (let i = 0; i <= currentIndex; i++) {
      ringRadii.push(radius * (0.35 + (i / stages.length) * 0.65));
    }

    // Position: cluster by primary tag, with jitter derived deterministically
    // from the decision id so adding/removing a decision never reshuffles the
    // rest of the forest (was a single shared sequential RNG consumed in order).
    const primaryTag = d.tags[0] || "governance";
    const cluster = clusterForTag(primaryTag);
    const jrand = seededRandom(hashId(d.id) + 1);
    const jitterX = (jrand() - 0.5) * usableW * 0.22;
    const jitterY = (jrand() - 0.5) * usableH * 0.22;
    const x = padding + cluster.x * usableW + jitterX;
    const y = padding + cluster.y * usableH + jitterY;

    // Colors from status
    const colors = STATUS_COLORS[d.status];

    // Action satellites
    const actions: { angle: number; complete: boolean }[] = [];
    const totalActions = d.actionsCount;
    for (let i = 0; i < totalActions; i++) {
      const angle = (i / totalActions) * Math.PI * 2 - Math.PI / 2;
      actions.push({
        angle,
        complete: i < d.actionsComplete,
      });
    }

    // Organic canopy shape
    const seed = hashId(d.id);
    const params = TREE_PARAMS[d.status];
    const pts = canopyPoints(radius, seed, params.wobble);
    const canopyPath = smoothClosedPath(pts);

    return {
      decision: d,
      x,
      y,
      radius,
      ringRadii,
      color: colors.fill,
      colorLight: colors.light,
      colorMid: colors.mid,
      actions,
      cluster: primaryTag,
      canopyPath,
      seed,
    };
  });

  // Simple collision avoidance: push overlapping nodes apart
  for (let iteration = 0; iteration < 30; iteration++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius + 24;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
        }
      }
    }

    // Keep in bounds
    for (const node of nodes) {
      node.x = Math.max(padding + node.radius, Math.min(width - padding - node.radius, node.x));
      node.y = Math.max(padding + node.radius, Math.min(height - padding - node.radius, node.y));
    }
  }

  return nodes;
}

// --- Root Connection System ---

type RelationType = "supersedes" | "relates_to" | "amends";

interface RootConnection {
  from: TreeNode;
  to: TreeNode;
  relation: RelationType;
  seed: number;
  ageFactor: number;
}

const ROOT_STYLES: Record<
  RelationType,
  {
    color: string;
    colorHighlight: string;
    strokeWidth: number;
    opacity: number;
    opacityHighlight: number;
    segments: number;
    dasharray: string;
    label: string;
  }
> = {
  supersedes: {
    color: "oklch(0.45 0.06 45)",
    colorHighlight: "oklch(0.55 0.08 45)",
    strokeWidth: 3.5,
    opacity: 0.25,
    opacityHighlight: 0.7,
    segments: 4,
    dasharray: "none",
    label: "Supersedes",
  },
  relates_to: {
    color: "oklch(0.50 0.05 155)",
    colorHighlight: "oklch(0.52 0.09 155)",
    strokeWidth: 1.8,
    opacity: 0.18,
    opacityHighlight: 0.6,
    segments: 4,
    dasharray: "none",
    label: "Relates to",
  },
  amends: {
    color: "oklch(0.55 0.04 70)",
    colorHighlight: "oklch(0.58 0.08 70)",
    strokeWidth: 1.2,
    opacity: 0.15,
    opacityHighlight: 0.55,
    segments: 3,
    dasharray: "3 5",
    label: "Amends",
  },
};

// Deterministic seed from two IDs
function hashPair(idA: string, idB: string): number {
  const str = [idA, idB].sort().join("|");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Core organic path generator: waypoints with perpendicular jitter + downward sag
function organicRootPath(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  rand: () => number,
  segments: number
): string {
  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return `M ${sx} ${sy} L ${ex} ${ey}`;

  // Unit vectors: along line and perpendicular
  const ux = dx / dist;
  const uy = dy / dist;
  const px = -uy;
  const py = ux;

  // Generate waypoints along the line
  const points: { x: number; y: number }[] = [{ x: sx, y: sy }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = sx + dx * t;
    const baseY = sy + dy * t;
    // Perpendicular jitter (±12% of distance)
    const perpJitter = (rand() - 0.5) * dist * 0.24;
    // Downward sag: parabolic, strongest at midpoint (~8% of distance)
    const sag = Math.sin(t * Math.PI) * dist * 0.08;
    points.push({
      x: baseX + px * perpJitter,
      y: baseY + py * perpJitter + sag,
    });
  }
  points.push({ x: ex, y: ey });

  // Convert waypoints to smooth cubic beziers via Catmull-Rom
  const parts: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Bezier control points (alpha = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    parts.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    );
  }

  return parts.join(" ");
}

// Generate root paths per connection type, anchored at center of nodes
function generateRootPaths(conn: RootConnection): string[] {
  const rand = seededRandom(conn.seed);
  const style = ROOT_STYLES[conn.relation];

  const sx = conn.from.x;
  const sy = conn.from.y;
  const ex = conn.to.x;
  const ey = conn.to.y;

  if (conn.relation === "relates_to") {
    // Two intertwined paths with mirrored jitter
    const rand1 = seededRandom(conn.seed);
    const rand2 = seededRandom(conn.seed + 7919);
    return [
      organicRootPath(sx, sy, ex, ey, rand1, style.segments),
      organicRootPath(sx, sy, ex, ey, rand2, style.segments),
    ];
  }

  return [organicRootPath(sx, sy, ex, ey, rand, style.segments)];
}

// Build rich connection objects from node data
function getRootConnections(nodes: TreeNode[], stableNow: number): RootConnection[] {
  const connections: RootConnection[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    const linked = node.decision.linkedDecisions || [];
    for (const link of linked) {
      const target = nodes.find((n) => n.decision.id === link.id);
      if (!target) continue;

      const pairKey = [node.decision.id, target.decision.id].sort().join("|");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const relation = (link.relation as RelationType) || "relates_to";

      // For supersedes with reverse direction, swap so old→new
      let from = node;
      let to = target;
      if (relation === "supersedes" && link.direction === "reverse") {
        from = target;
        to = node;
      }

      // Age factor: 0 = brand new, 1 = 12+ months old
      const olderDate = new Date(
        Math.min(
          new Date(from.decision.date).getTime(),
          new Date(to.decision.date).getTime()
        )
      );
      const monthsOld =
        (stableNow - olderDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const ageFactor = Math.round(Math.min(1, monthsOld / 12) * 100) / 100;

      connections.push({
        from,
        to,
        relation,
        seed: hashPair(node.decision.id, target.decision.id),
        ageFactor,
      });
    }
  }
  return connections;
}

// --- Legend ---

function Legend() {
  return (
    <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 right-3 sm:right-auto z-10">
      {/* Desktop: single row */}
      <div className="hidden sm:flex items-center gap-6 text-xs text-bark-muted bg-paper/90 backdrop-blur-sm rounded-xl px-5 py-3 border border-border">
        <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
          Lifecycle
        </span>
        {(
          [
            ["decided", "Fresh growth"],
            ["implemented", "Taking root"],
            ["reviewed", "Autumn reflection"],
            ["learned", "Deep roots"],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4.5" fill={STATUS_COLORS[status].fill} />
            </svg>
            <span>{label}</span>
          </div>
        ))}
        <span className="text-border-strong">|</span>
        <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
          Roots
        </span>
        {(
          [
            ["supersedes", ROOT_STYLES.supersedes],
            ["relates_to", ROOT_STYLES.relates_to],
            ["amends", ROOT_STYLES.amends],
          ] as const
        ).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5">
            <svg width="24" height="10">
              {key === "relates_to" ? (
                <>
                  <path d="M 2 3 C 8 1 16 5 22 3" stroke={style.color} strokeWidth={style.strokeWidth * 0.7} fill="none" strokeLinecap="round" opacity={0.6} />
                  <path d="M 2 7 C 8 9 16 5 22 7" stroke={style.color} strokeWidth={style.strokeWidth * 0.7} fill="none" strokeLinecap="round" opacity={0.6} />
                </>
              ) : (
                <path
                  d="M 2 5 C 8 3 16 7 22 5"
                  stroke={style.color}
                  strokeWidth={style.strokeWidth * 0.8}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={style.dasharray === "none" ? undefined : style.dasharray}
                  opacity={0.6}
                />
              )}
            </svg>
            <span>{style.label}</span>
          </div>
        ))}
        <span className="text-border-strong">|</span>
        <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
          Size
        </span>
        <span>= engagement</span>
      </div>

      {/* Mobile: two rows */}
      <div className="sm:hidden bg-paper/90 backdrop-blur-sm rounded-xl px-3 py-2.5 border border-border text-[0.6875rem] text-bark-muted space-y-1.5">
        {/* Row 1: Lifecycle */}
        <div className="flex items-center gap-2.5">
          <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
            Lifecycle
          </span>
          {(
            [
              ["decided", "Decided"],
              ["implemented", "Implemented"],
              ["reviewed", "Reviewed"],
              ["learned", "Learned"],
            ] as const
          ).map(([status, label]) => (
            <div key={status} className="flex items-center gap-1">
              <svg width="8" height="8" className="shrink-0">
                <circle cx="4" cy="4" r="3.5" fill={STATUS_COLORS[status].fill} />
              </svg>
              <span>{label}</span>
            </div>
          ))}
        </div>
        {/* Row 2: Roots + Size */}
        <div className="flex items-center gap-2.5">
          <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
            Roots
          </span>
          {(
            [
              ["supersedes", ROOT_STYLES.supersedes],
              ["relates_to", ROOT_STYLES.relates_to],
              ["amends", ROOT_STYLES.amends],
            ] as const
          ).map(([key, style]) => (
            <div key={key} className="flex items-center gap-1">
              <svg width="18" height="8">
                {key === "relates_to" ? (
                  <>
                    <path d="M 1 2 C 5 0 13 4 17 2" stroke={style.color} strokeWidth={style.strokeWidth * 0.6} fill="none" strokeLinecap="round" opacity={0.6} />
                    <path d="M 1 6 C 5 8 13 4 17 6" stroke={style.color} strokeWidth={style.strokeWidth * 0.6} fill="none" strokeLinecap="round" opacity={0.6} />
                  </>
                ) : (
                  <path
                    d="M 1 4 C 5 2 13 6 17 4"
                    stroke={style.color}
                    strokeWidth={style.strokeWidth * 0.7}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={style.dasharray === "none" ? undefined : style.dasharray}
                    opacity={0.6}
                  />
                )}
              </svg>
              <span>{style.label}</span>
            </div>
          ))}
          <span className="text-border-strong">|</span>
          <span><span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>Size</span> = engagement</span>
        </div>
      </div>
    </div>
  );
}

// --- Cluster Labels ---

function ClusterLabels({ nodes, width, height }: { nodes: TreeNode[]; width: number; height: number }) {
  // Find centroid of each cluster
  const clusters: Record<string, { x: number; y: number; count: number }> = {};
  for (const node of nodes) {
    if (!clusters[node.cluster]) {
      clusters[node.cluster] = { x: 0, y: 0, count: 0 };
    }
    clusters[node.cluster].x += node.x;
    clusters[node.cluster].y += node.y;
    clusters[node.cluster].count++;
  }

  return (
    <>
      {Object.entries(clusters).map(([tag, data]) => {
        const cx = data.x / data.count;
        const cy = data.y / data.count;
        // Offset label away from center
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = cx - centerX;
        const dy = cy - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const labelX = cx + (dx / dist) * 45;
        const labelY = cy + (dy / dist) * 45;

        return (
          <text
            key={tag}
            x={labelX}
            y={labelY}
            textAnchor="middle"
            className="text-[0.625rem] uppercase tracking-[0.15em] fill-bark-muted/40 select-none pointer-events-none"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {tag}
          </text>
        );
      })}
    </>
  );
}

// --- Tooltip ---

function Tooltip({
  node,
  pixelX,
  pixelY,
  pixelRadius,
  containerWidth,
  containerHeight,
  onClose,
  onNavigate,
  readOnly = false,
}: {
  node: TreeNode;
  pixelX: number;
  pixelY: number;
  pixelRadius: number;
  containerWidth: number;
  containerHeight: number;
  onClose: () => void;
  onNavigate: () => void;
  readOnly?: boolean;
}) {
  const d = node.decision;
  const tooltipW = 320;
  const tooltipH = 280; // approximate
  const gap = 12;

  // Flip to left if not enough room on the right
  const spaceRight = containerWidth - (pixelX + pixelRadius + gap + tooltipW);
  const flipLeft = spaceRight < 16;
  const left = flipLeft
    ? Math.max(8, pixelX - pixelRadius - gap - tooltipW)
    : pixelX + pixelRadius + gap;

  // Clamp vertical to stay within container
  const top = Math.max(8, Math.min(pixelY - 60, containerHeight - tooltipH - 8));

  return (
    <div
      className="absolute z-20 bg-paper border border-border rounded-xl shadow-lg w-[min(320px,calc(100vw-2rem))] overflow-hidden"
      style={{ left, top }}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs text-bark-muted font-medium tabular-nums">
              #{d.number}
            </span>
            <h3
              className="text-[0.9375rem] font-medium text-bark leading-snug mt-0.5"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {d.title}
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-bark-muted hover:text-bark shrink-0 mt-0.5"
            aria-label="Close decision detail"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2.5 text-xs text-bark-muted">
          <span>{formatDate(d.date)}</span>
          <span className="text-border-strong">·</span>
          <span>{METHOD_LABELS[d.method]}</span>
          <span className="text-border-strong">·</span>
          <span style={{ color: STATUS_COLORS[d.status].fill }}>
            {STATUS_LABELS[d.status]}
          </span>
        </div>

        <p className="text-sm text-bark-muted mt-3 leading-relaxed line-clamp-3">
          {d.outcome}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-bark-muted">
          <span>{d.participants.length} participants</span>
          {d.actionsCount > 0 && (
            <span className="flex items-center gap-1">
              <ListChecks size={11} />
              {d.actionsComplete}/{d.actionsCount} actions
            </span>
          )}
          {d.tags.map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded bg-paper-deep">
              {t}
            </span>
          ))}
        </div>
      </div>

      {!readOnly && (
        <button
          onClick={onNavigate}
          className="w-full px-5 py-3 text-sm text-canopy hover:bg-canopy-pale/50 border-t border-border text-left font-medium transition-colors"
        >
          View full decision →
        </button>
      )}
    </div>
  );
}

// --- Main Canvas ---

// --- Zoom & Pan Hook ---

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.3;

function clampViewBox(vb: ViewBox, fullW: number, fullH: number): ViewBox {
  const w = Math.max(fullW / MAX_ZOOM, Math.min(fullW, vb.w));
  const h = Math.max(fullH / MAX_ZOOM, Math.min(fullH, vb.h));
  const x = Math.max(0, Math.min(fullW - w, vb.x));
  const y = Math.max(0, Math.min(fullH - h, vb.y));
  return { x, y, w, h };
}

function useZoomPan(fullW: number, fullH: number, svgRef: React.RefObject<SVGSVGElement | null>) {
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: fullW, h: fullH });
  const pinchRef = useRef<{ startDist: number; startVB: ViewBox; cx: number; cy: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; startVB: ViewBox } | null>(null);

  const zoom = fullW / viewBox.w;

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    setViewBox((prev) => {
      const newW = prev.w / factor;
      const newH = prev.h / factor;
      // Zoom centered on (cx, cy) in viewBox coords
      const newX = cx - (cx - prev.x) / factor;
      const newY = cy - (cy - prev.y) / factor;
      return clampViewBox({ x: newX, y: newY, w: newW, h: newH }, fullW, fullH);
    });
  }, [fullW, fullH]);

  const zoomIn = useCallback(() => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    zoomAt(1 + ZOOM_STEP, cx, cy);
  }, [viewBox, zoomAt]);

  const zoomOut = useCallback(() => {
    const cx = viewBox.x + viewBox.w / 2;
    const cy = viewBox.y + viewBox.h / 2;
    zoomAt(1 / (1 + ZOOM_STEP), cx, cy);
  }, [viewBox, zoomAt]);

  const resetZoom = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: fullW, h: fullH });
  }, [fullW, fullH]);

  // Client point → SVG viewBox coordinates
  const clientToSVG = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: fullW / 2, y: fullH / 2 };
    const rect = svg.getBoundingClientRect();
    const ratioX = (clientX - rect.left) / rect.width;
    const ratioY = (clientY - rect.top) / rect.height;
    return {
      x: viewBox.x + ratioX * viewBox.w,
      y: viewBox.y + ratioY * viewBox.h,
    };
  }, [svgRef, viewBox, fullW, fullH]);

  // Wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const pt = clientToSVG(e.clientX, e.clientY);
      const delta = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(delta, pt.x, pt.y);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [svgRef, clientToSVG, zoomAt]);

  // Touch: pinch-to-zoom + two-finger pan
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const getTouchDist = (t: TouchList) => {
      if (t.length < 2) return 0;
      const dx = t[1].clientX - t[0].clientX;
      const dy = t[1].clientY - t[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };
    const getTouchCenter = (t: TouchList) => ({
      clientX: (t[0].clientX + t[1].clientX) / 2,
      clientY: (t[0].clientY + t[1].clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const center = getTouchCenter(e.touches);
        const svgPt = clientToSVG(center.clientX, center.clientY);
        pinchRef.current = { startDist: dist, startVB: { ...viewBox }, cx: svgPt.x, cy: svgPt.y };
      } else if (e.touches.length === 1 && zoom > 1.05) {
        // Single-finger pan when zoomed
        panRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, startVB: { ...viewBox } };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dist = getTouchDist(e.touches);
        const factor = dist / pinchRef.current.startDist;
        const prev = pinchRef.current.startVB;
        const newW = prev.w / factor;
        const newH = prev.h / factor;
        const cx = pinchRef.current.cx;
        const cy = pinchRef.current.cy;
        const newX = cx - (cx - prev.x) / factor;
        const newY = cy - (cy - prev.y) / factor;
        setViewBox(clampViewBox({ x: newX, y: newY, w: newW, h: newH }, fullW, fullH));
      } else if (e.touches.length === 1 && panRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panRef.current.startX;
        const dy = e.touches[0].clientY - panRef.current.startY;
        const rect = svg.getBoundingClientRect();
        const svgDX = -(dx / rect.width) * panRef.current.startVB.w;
        const svgDY = -(dy / rect.height) * panRef.current.startVB.h;
        setViewBox(clampViewBox({
          x: panRef.current.startVB.x + svgDX,
          y: panRef.current.startVB.y + svgDY,
          w: panRef.current.startVB.w,
          h: panRef.current.startVB.h,
        }, fullW, fullH));
      }
    };

    const onTouchEnd = () => {
      pinchRef.current = null;
      panRef.current = null;
    };

    svg.addEventListener("touchstart", onTouchStart, { passive: false });
    svg.addEventListener("touchmove", onTouchMove, { passive: false });
    svg.addEventListener("touchend", onTouchEnd);

    return () => {
      svg.removeEventListener("touchstart", onTouchStart);
      svg.removeEventListener("touchmove", onTouchMove);
      svg.removeEventListener("touchend", onTouchEnd);
    };
  // We intentionally use viewBox and zoom as deps here even though they change,
  // because the touch handlers need current values via closure for single-finger pan start.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svgRef, fullW, fullH, zoom]);

  return { viewBox, zoom, zoomIn, zoomOut, resetZoom };
}

// --- Main Canvas ---

export function GladeCanvas({ decisions, readOnly = false, now }: { decisions: Decision[]; readOnly?: boolean; now?: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredRootIndex, setHoveredRootIndex] = useState<number | null>(null);
  const [rootTooltip, setRootTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [viewMode, setViewMode] = useState<"trees" | "rings" | "silhouettes">("trees");
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();

  // Canvas dimensions
  const W = 1200;
  const H = 750;

  const { viewBox, zoom, zoomIn: rawZoomIn, zoomOut: rawZoomOut, resetZoom: rawResetZoom } = useZoomPan(W, H, svgRef);
  const { announce } = useLiveRegion();

  const zoomIn = useCallback(() => {
    rawZoomIn();
    // Announce after state updates (next tick)
    requestAnimationFrame(() => {
      const newZoom = Math.min(W / (viewBox.w / (1 + ZOOM_STEP)), MAX_ZOOM);
      announce(`Zoom ${Math.round(newZoom * 100)}%`);
    });
  }, [rawZoomIn, announce, viewBox.w]);

  const zoomOut = useCallback(() => {
    rawZoomOut();
    requestAnimationFrame(() => {
      const newZoom = Math.max(W / (viewBox.w * (1 + ZOOM_STEP)), MIN_ZOOM);
      announce(`Zoom ${Math.round(newZoom * 100)}%`);
    });
  }, [rawZoomOut, announce, viewBox.w]);

  const resetZoom = useCallback(() => {
    rawResetZoom();
    announce("Zoom reset to 100%");
  }, [rawResetZoom, announce]);

  const nodes = useMemo(() => layoutNodes(decisions, W, H), [decisions]);
  // Use a stable timestamp for age calculations to avoid SSR/client hydration mismatch
  const [stableNow] = useState(() => now ?? Date.now());
  const connections = useMemo(() => getRootConnections(nodes, stableNow), [nodes, stableNow]);

  // Pre-generate all root paths
  const rootPaths = useMemo(
    () =>
      connections.map((conn) => generateRootPaths(conn)),
    [connections]
  );

  const activeId = hoveredId || selectedId;

  // IDs of decisions connected to the active one
  const connectedIds = useMemo(() => {
    if (!activeId) return new Set<string>();
    const ids = new Set<string>();
    for (const conn of connections) {
      if (
        conn.from.decision.id === activeId ||
        conn.to.decision.id === activeId
      ) {
        ids.add(conn.from.decision.id);
        ids.add(conn.to.decision.id);
      }
    }
    return ids;
  }, [activeId, connections]);

  // Indices of connections touching active decision
  const highlightedConnections = useMemo(() => {
    if (!activeId) return new Set<number>();
    const set = new Set<number>();
    connections.forEach((conn, i) => {
      if (
        conn.from.decision.id === activeId ||
        conn.to.decision.id === activeId
      ) {
        set.add(i);
      }
    });
    return set;
  }, [activeId, connections]);

  const hasActiveHighlight = activeId !== null || hoveredRootIndex !== null;

  const selectedNode = selectedId
    ? nodes.find((n) => n.decision.id === selectedId)
    : null;

  // Convert SVG viewBox coordinates to container-relative pixel coordinates
  const svgToPixel = useCallback(
    (svgX: number, svgY: number) => {
      const svg = svgRef.current;
      const container = containerRef.current;
      if (!svg || !container) return { x: svgX, y: svgY };

      const pt = svg.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: svgX, y: svgY };
      const screenPt = pt.matrixTransform(ctm);
      const rect = container.getBoundingClientRect();
      return { x: screenPt.x - rect.left, y: screenPt.y - rect.top };
    },
    []
  );

  // Compute pixel-scale radius for tooltip offset
  const svgPixelScale = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return 1;
    const ctm = svg.getScreenCTM();
    if (!ctm) return 1;
    return ctm.a; // horizontal scale factor
  }, []);

  const handleNodeClick = useCallback(
    (id: string) => {
      setSelectedId(selectedId === id ? null : id);
    },
    [selectedId]
  );

  // Ground cover: scattered nature elements avoiding tree positions
  type GroundItem = {
    kind: "grass" | "flower" | "fern" | "stone" | "leaf";
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    variant: number; // 0–1, used for colour/shape variation
  };

  const groundCover = useMemo(() => {
    const rand = seededRandom(1337);
    const items: GroundItem[] = [];
    const kinds: GroundItem["kind"][] = ["grass", "grass", "grass", "flower", "flower", "fern", "fern", "stone", "leaf", "leaf"];

    for (let i = 0; i < 50; i++) {
      const gx = 50 + rand() * (W - 100);
      const gy = 50 + rand() * (H - 100);
      const tooClose = nodes.some((n) => {
        const dx = n.x - gx;
        const dy = n.y - gy;
        return Math.sqrt(dx * dx + dy * dy) < n.radius + 25;
      });
      if (tooClose) continue;
      items.push({
        kind: kinds[i % kinds.length],
        x: gx,
        y: gy,
        scale: 0.5 + rand() * 0.7,
        rotation: (rand() - 0.5) * 40,
        opacity: 0.15 + rand() * 0.2,
        variant: rand(),
      });
    }
    return items;
  }, [nodes]);

  return (
    <div ref={containerRef} className="relative flex-1 bg-paper overflow-hidden">
      {/* Header + view toggle */}
      <div className="absolute top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h1
            className="text-lg sm:text-xl font-medium tracking-tight text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            The Glade
          </h1>
          <p className="text-xs sm:text-sm text-bark-muted mt-0.5">
            {decisions.length} decisions · clustered by theme · sized by
            engagement
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-paper/90 backdrop-blur-sm rounded-lg border border-border px-1 py-1 self-start shrink-0">
          {(["trees", "rings", "silhouettes"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-canopy text-paper font-medium"
                  : "text-bark-muted hover:text-bark hover:bg-paper-deep"
              }`}
            >
              {mode === "trees" ? "Canopy" : mode === "rings" ? "Rings" : "Silhouette"}
            </button>
          ))}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 sm:bottom-6 right-3 sm:right-6 z-10 flex flex-col gap-1 bg-paper/90 backdrop-blur-sm rounded-lg border border-border p-1">
        <button
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="flex items-center justify-center w-8 h-8 rounded-md text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </button>
        {zoom > 1.05 && (
          <button
            onClick={resetZoom}
            className="flex items-center justify-center w-8 h-8 rounded-md text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
            aria-label="Reset zoom"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <button
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="flex items-center justify-center w-8 h-8 rounded-md text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        role="img"
        aria-labelledby="glade-canvas-title glade-canvas-desc"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        className="w-full h-full touch-none"
        style={{ minHeight: "600px" }}
        onClick={() => setSelectedId(null)}
      >
        <title id="glade-canvas-title">Decision relationship canvas</title>
        <desc id="glade-canvas-desc">
          Visual map showing {decisions.length} decisions and their connections
        </desc>

        {/* Defs: filters and gradients */}
        <defs>
          {/* Soft shadow for tree nodes */}
          <filter id="tree-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="6" />
            <feOffset dx="0" dy="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.08" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Root glow filter — applied to highlighted roots */}
          <filter id="root-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Dappled light spots */}
          <radialGradient id="light-spot-1" cx="0.3" cy="0.25">
            <stop offset="0%" stopColor="oklch(0.68 0.14 70)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="oklch(0.68 0.14 70)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="light-spot-2" cx="0.7" cy="0.6">
            <stop offset="0%" stopColor="oklch(0.52 0.07 155)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="oklch(0.52 0.07 155)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="light-spot-3" cx="0.5" cy="0.5">
            <stop offset="0%" stopColor="oklch(0.97 0.008 80)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="oklch(0.97 0.008 80)" stopOpacity="0" />
          </radialGradient>

          {/* Per-supersedes taper gradient */}
          {connections.map((conn, i) =>
            conn.relation === "supersedes" ? (
              <linearGradient
                key={`root-grad-${i}`}
                id={`root-grad-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={conn.from.x}
                y1={conn.from.y}
                x2={conn.to.x}
                y2={conn.to.y}
              >
                <stop offset="0%" stopColor={ROOT_STYLES.supersedes.color} stopOpacity="1" />
                <stop offset="100%" stopColor={ROOT_STYLES.supersedes.color} stopOpacity="0.5" />
              </linearGradient>
            ) : null
          )}

          {/* Per-node gradients */}
          {nodes.map((node) => (
            <radialGradient
              key={`grad-${node.decision.id}`}
              id={`tree-grad-${node.decision.id}`}
              cx="0.4"
              cy="0.35"
            >
              <stop offset="0%" stopColor={node.colorLight} stopOpacity="0.9" />
              <stop offset="50%" stopColor={node.colorMid} stopOpacity="0.5" />
              <stop offset="100%" stopColor={node.color} stopOpacity="0.25" />
            </radialGradient>
          ))}
        </defs>

        {/* Background light spots */}
        <rect x="0" y="0" width={W} height={H} fill="url(#light-spot-3)" />
        <ellipse cx={W * 0.3} cy={H * 0.25} rx="250" ry="200" fill="url(#light-spot-1)" />
        <ellipse cx={W * 0.7} cy={H * 0.6} rx="300" ry="250" fill="url(#light-spot-2)" />

        {/* Cluster labels */}
        <ClusterLabels nodes={nodes} width={W} height={H} />

        {/* Root paths — non-highlighted (below nodes) */}
        {connections.map((conn, ci) => {
          const style = ROOT_STYLES[conn.relation];
          const isHighlighted =
            highlightedConnections.has(ci) || hoveredRootIndex === ci;
          if (isHighlighted) return null;

          const scaledWidth =
            Math.round(style.strokeWidth * (0.8 + conn.ageFactor * 0.4) * 100) / 100;
          const opacity = hasActiveHighlight ? 0.04 : style.opacity;

          return rootPaths[ci].map((d, pi) => (
            <path
              key={`root-${ci}-${pi}`}
              d={d}
              stroke={
                conn.relation === "supersedes"
                  ? `url(#root-grad-${ci})`
                  : style.color
              }
              strokeWidth={scaledWidth}
              strokeLinecap="round"
              strokeDasharray={
                style.dasharray === "none" ? undefined : style.dasharray
              }
              fill="none"
              opacity={opacity}
              style={{ transition: "opacity 0.3s ease, stroke-width 0.3s ease" }}
            />
          ));
        })}

        {/* Root paths — highlighted (above non-highlighted, below nodes) */}
        {connections.map((conn, ci) => {
          const style = ROOT_STYLES[conn.relation];
          const isHighlighted =
            highlightedConnections.has(ci) || hoveredRootIndex === ci;
          if (!isHighlighted) return null;

          const scaledWidth =
            Math.round(style.strokeWidth * (0.8 + conn.ageFactor * 0.4) * 1.3 * 100) / 100;

          return rootPaths[ci].map((d, pi) => (
            <path
              key={`root-hl-${ci}-${pi}`}
              d={d}
              stroke={
                conn.relation === "supersedes"
                  ? `url(#root-grad-${ci})`
                  : style.colorHighlight
              }
              strokeWidth={scaledWidth}
              strokeLinecap="round"
              strokeDasharray={
                style.dasharray === "none" ? undefined : style.dasharray
              }
              fill="none"
              opacity={style.opacityHighlight}
              filter="url(#root-glow)"
              style={{ transition: "opacity 0.3s ease, stroke-width 0.3s ease" }}
            />
          ));
        })}

        {/* Invisible fat hit-area paths for root hover */}
        {connections.map((conn, ci) => {
          const style = ROOT_STYLES[conn.relation];
          return rootPaths[ci].map((d, pi) => (
            <path
              key={`root-hit-${ci}-${pi}`}
              d={d}
              stroke="transparent"
              strokeWidth={12}
              fill="none"
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => {
                setHoveredRootIndex(ci);
                const svg = e.currentTarget.ownerSVGElement;
                if (svg) {
                  const pt = svg.createSVGPoint();
                  pt.x = e.clientX;
                  pt.y = e.clientY;
                  const svgPt = pt.matrixTransform(
                    svg.getScreenCTM()?.inverse()
                  );
                  setRootTooltip({ x: svgPt.x, y: svgPt.y - 12, label: style.label });
                }
              }}
              onMouseLeave={() => {
                setHoveredRootIndex(null);
                setRootTooltip(null);
              }}
            />
          ));
        })}

        {/* Connected-node pulse rings */}
        {activeId &&
          nodes
            .filter(
              (n) =>
                connectedIds.has(n.decision.id) &&
                n.decision.id !== activeId
            )
            .map((node) => (
              <circle
                key={`pulse-${node.decision.id}`}
                cx={node.x}
                cy={node.y}
                r={node.radius + 6}
                fill="none"
                stroke={node.color}
                strokeWidth={1.5}
                className="root-pulse"
              />
            ))}

        {/* Ground cover — varied nature elements */}
        {groundCover.map((item, i) => (
          <g
            key={`ground-${i}`}
            transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation}) scale(${item.scale})`}
            opacity={item.opacity}
          >
            {item.kind === "grass" && (
              <>
                <path d="M 0 0 Q -2 -8 -1 -14" stroke="oklch(0.52 0.08 145)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                <path d="M 3 0 Q 4 -7 2 -12" stroke="oklch(0.50 0.07 150)" strokeWidth="1" fill="none" strokeLinecap="round" />
                <path d="M -3 0 Q -5 -6 -4 -10" stroke="oklch(0.48 0.06 140)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
              </>
            )}
            {item.kind === "flower" && (
              <>
                {/* Stem */}
                <path d="M 0 0 Q -1 -6 0 -11" stroke="oklch(0.50 0.07 145)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
                {/* Tiny leaf on stem */}
                <path d="M -0.5 -5 Q -3 -6 -2 -4" fill="oklch(0.52 0.08 145)" opacity="0.6" />
                {/* Flower head — 4-5 petals */}
                {[0, 1, 2, 3, 4].map((p) => {
                  const a = (p / 5) * Math.PI * 2;
                  const px = Math.round(Math.cos(a) * 2500) / 1000;
                  const py = Math.round((-11 + Math.sin(a) * 2.5) * 1000) / 1000;
                  const petalColor = item.variant < 0.33
                    ? "oklch(0.78 0.12 60)"   // buttercup yellow
                    : item.variant < 0.66
                    ? "oklch(0.75 0.08 320)"   // soft pink
                    : "oklch(0.82 0.06 280)";  // pale violet
                  return <circle key={p} cx={px} cy={py} r="1.4" fill={petalColor} opacity="0.8" />;
                })}
                {/* Centre */}
                <circle cx="0" cy="-11" r="1" fill="oklch(0.65 0.12 70)" />
              </>
            )}
            {item.kind === "fern" && (
              <>
                {/* Central spine */}
                <path d="M 0 0 Q -1 -10 0 -18" stroke="oklch(0.46 0.07 148)" strokeWidth="0.9" fill="none" strokeLinecap="round" />
                {/* Frond pairs — alternating leaflets */}
                {[3, 6, 9, 12, 15].map((y, fi) => {
                  const leafLen = 4 - fi * 0.5;
                  return (
                    <g key={fi}>
                      <path d={`M 0 ${-y} Q ${leafLen} ${-y - 1.5} ${leafLen + 1} ${-y + 0.5}`} stroke="oklch(0.48 0.06 150)" strokeWidth="0.6" fill="none" strokeLinecap="round" />
                      <path d={`M 0 ${-y} Q ${-leafLen} ${-y - 1.5} ${-leafLen - 1} ${-y + 0.5}`} stroke="oklch(0.48 0.06 150)" strokeWidth="0.6" fill="none" strokeLinecap="round" />
                    </g>
                  );
                })}
              </>
            )}
            {item.kind === "stone" && (
              <ellipse
                cx="0"
                cy="0"
                rx={2.5 + item.variant * 2}
                ry={1.5 + item.variant}
                fill={item.variant < 0.5 ? "oklch(0.72 0.01 80)" : "oklch(0.65 0.015 60)"}
                opacity="0.35"
              />
            )}
            {item.kind === "leaf" && (
              <>
                {/* Fallen leaf — rotated oval with midrib */}
                <ellipse cx="0" cy="0" rx="4" ry="2.2"
                  fill={item.variant < 0.5 ? "oklch(0.62 0.10 65)" : "oklch(0.55 0.08 45)"}
                  opacity="0.5"
                />
                <path d="M -3.5 0 L 3.5 0" stroke="oklch(0.45 0.05 50)" strokeWidth="0.4" opacity="0.4" />
              </>
            )}
          </g>
        ))}

        {/* Tree nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.decision.id;
          const isSelected = selectedId === node.decision.id;
          const isActive = isHovered || isSelected;
          const isConnected = connectedIds.has(node.decision.id);
          const scale = isActive ? 1.08 : 1;

          // Dim non-connected nodes when there's an active highlight
          const nodeOpacity =
            hasActiveHighlight && !isActive && !isConnected ? 0.4 : 1;

          const params = TREE_PARAMS[node.decision.status];
          const trunkH = node.radius * params.trunkScale;
          const trunkW = node.radius * params.trunkWidth;
          const trunkTop = node.radius * 0.4;
          const trunkBottom = trunkTop + trunkH;
          const rand = seededRandom(node.seed + 99);
          const labelY = viewMode === "trees" ? trunkBottom + 18 : viewMode === "rings" ? node.radius + 14 : node.radius * 0.15 + 14;

          return (
            <g
              key={node.decision.id}
              transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
              style={{
                transition:
                  "transform 0.25s cubic-bezier(0.33, 1, 0.68, 1), opacity 0.3s ease",
                transformOrigin: "0 0",
                cursor: "pointer",
                opacity: nodeOpacity,
              }}
              onMouseEnter={() => setHoveredId(node.decision.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node.decision.id);
              }}
            >
              {viewMode === "trees" && (<>
              {/* Trunk — tapered trapezoid */}
              <path
                d={`M ${-trunkW * 0.4} ${trunkTop} L ${-trunkW * 0.6} ${trunkBottom} L ${trunkW * 0.6} ${trunkBottom} L ${trunkW * 0.4} ${trunkTop} Z`}
                fill="oklch(0.42 0.04 55)"
                opacity={0.7}
              />

              {/* Root flares at trunk base */}
              {Array.from({ length: params.rootFlares }).map((_, fi) => {
                const side = fi % 2 === 0 ? -1 : 1;
                const flareW = trunkW * (0.8 + rand() * 0.4);
                return (
                  <path
                    key={`flare-${fi}`}
                    d={`M ${side * trunkW * 0.3} ${trunkBottom} Q ${side * flareW * 1.5} ${trunkBottom + 4} ${side * flareW * 1.8} ${trunkBottom + 2}`}
                    stroke="oklch(0.42 0.04 55)"
                    strokeWidth={1.5}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.5}
                  />
                );
              })}

              {/* Grass at base — 3 small blades */}
              {[
                { dx: -trunkW * 0.8, s: 0.7 },
                { dx: 0, s: 0.5 },
                { dx: trunkW * 0.8, s: 0.65 },
              ].map((blade, bi) => (
                <path
                  key={`grass-${bi}`}
                  d={`M ${blade.dx} ${trunkBottom} Q ${blade.dx + (bi - 1) * 3} ${trunkBottom - 6 * blade.s} ${blade.dx + (bi - 1) * 5} ${trunkBottom - 10 * blade.s}`}
                  stroke="oklch(0.52 0.08 145)"
                  strokeWidth="0.9"
                  fill="none"
                  strokeLinecap="round"
                  opacity={0.35}
                />
              ))}

              {/* Organic canopy */}
              <path
                d={node.canopyPath}
                fill={`url(#tree-grad-${node.decision.id})`}
                filter="url(#tree-shadow)"
                stroke={isActive ? node.color : "transparent"}
                strokeWidth={isActive ? 1.5 : 0}
                style={{ transition: "stroke 0.2s" }}
              />

              {/* Branch lines — subtle curves from trunk top into canopy */}
              {Array.from({ length: params.branches }).map((_, bi) => {
                const angle = ((bi + 0.5) / params.branches) * Math.PI * 2;
                const bx = Math.cos(angle) * node.radius * 0.5;
                const by = Math.sin(angle) * node.radius * 0.5;
                const cx = Math.cos(angle) * node.radius * 0.25 + (rand() - 0.5) * 4;
                const cy = Math.sin(angle) * node.radius * 0.25 + (rand() - 0.5) * 4;
                return (
                  <path
                    key={`branch-${bi}`}
                    d={`M 0 ${trunkTop} Q ${cx} ${cy} ${bx} ${by}`}
                    stroke="oklch(0.42 0.04 55)"
                    strokeWidth={0.8}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.12}
                  />
                );
              })}

              {/* Growth rings */}
              {node.ringRadii.map((r, i) => (
                <circle
                  key={i}
                  r={r}
                  fill="none"
                  stroke={node.color}
                  strokeWidth="0.75"
                  opacity={0.2 + i * 0.08}
                />
              ))}

              {/* Center mark */}
              <circle r={3} fill={node.color} opacity={0.6} />
              </>)}

              {/* === Ring stump (top-down cross-section) === */}
              {viewMode === "rings" && (() => {
                const stages: DecisionStatus[] = ["decided", "implemented", "reviewed", "learned"];
                const currentIdx = stages.indexOf(node.decision.status);
                const ringCount = currentIdx + 1;
                const nr = node.radius;
                const barkThick = nr * 0.08;
                const innerR = nr - barkThick;
                const rRand = seededRandom(node.seed + 200);
                const ringColors = [
                  "oklch(0.72 0.06 155)", // decided - sage green
                  "oklch(0.62 0.07 150)", // implemented - forest green
                  "oklch(0.70 0.10 72)",  // reviewed - warm amber
                  "oklch(0.58 0.06 48)",  // learned - rich earth
                ];
                const barkPts = canopyPoints(nr, node.seed + 300, 0.03, 24);
                const barkPath = smoothClosedPath(barkPts);
                const grainCount = 4 + currentIdx * 2;

                return (
                  <>
                    {/* Bark — dark brown irregular outer edge */}
                    <path d={barkPath} fill="oklch(0.35 0.04 55)" filter="url(#tree-shadow)" />

                    {/* Wood base — warm cream */}
                    <circle r={innerR} fill="oklch(0.82 0.02 80)" />

                    {/* Growth ring bands — outermost = current status, innermost = decided */}
                    {Array.from({ length: ringCount }).map((_, i) => {
                      const stageIdx = currentIdx - i;
                      const bandR = innerR * (1 - i / ringCount);
                      return (
                        <circle
                          key={`band-${i}`}
                          r={bandR}
                          fill={ringColors[stageIdx]}
                          opacity={0.35}
                        />
                      );
                    })}

                    {/* Ring boundary lines */}
                    {Array.from({ length: ringCount + 1 }).map((_, i) => {
                      const lineR = innerR * (i / ringCount);
                      return lineR > 3 ? (
                        <circle
                          key={`rl-${i}`}
                          r={lineR}
                          fill="none"
                          stroke="oklch(0.40 0.03 55)"
                          strokeWidth={0.6}
                          opacity={0.2}
                        />
                      ) : null;
                    })}

                    {/* Fine annual rings within each band */}
                    {Array.from({ length: ringCount }).map((_, bandIdx) => {
                      const outerBR = innerR * (1 - bandIdx / ringCount);
                      const nextBR = innerR * (1 - (bandIdx + 1) / ringCount);
                      const fineCount = Math.max(2, Math.floor((outerBR - nextBR) / 4));
                      return Array.from({ length: fineCount }).map((__, fi) => {
                        const fineR = nextBR + (outerBR - nextBR) * ((fi + 0.5) / fineCount);
                        return fineR > 3 ? (
                          <circle
                            key={`fr-${bandIdx}-${fi}`}
                            r={fineR}
                            fill="none"
                            stroke="oklch(0.42 0.03 55)"
                            strokeWidth={0.3}
                            opacity={0.08}
                          />
                        ) : null;
                      });
                    })}

                    {/* Radial medullary rays */}
                    {Array.from({ length: grainCount }).map((_, i) => {
                      const angle = (i / grainCount) * Math.PI * 2 + rRand() * 0.4;
                      const rayLen = innerR * (0.4 + rRand() * 0.5);
                      return (
                        <line
                          key={`ray-${i}`}
                          x1={Math.cos(angle) * 3}
                          y1={Math.sin(angle) * 3}
                          x2={Math.cos(angle) * rayLen}
                          y2={Math.sin(angle) * rayLen}
                          stroke="oklch(0.45 0.03 55)"
                          strokeWidth={0.3}
                          opacity={0.12}
                        />
                      );
                    })}

                    {/* Center pith */}
                    <circle r={3.5} fill="oklch(0.45 0.04 55)" opacity={0.5} />
                    <circle r={1.5} fill="oklch(0.55 0.03 60)" opacity={0.35} />

                    {/* Hover/selection outline */}
                    {isActive && (
                      <path d={barkPath} fill="none" stroke={node.color} strokeWidth={2} opacity={0.8} />
                    )}
                  </>
                );
              })()}

              {/* === Botanical silhouette === */}
              {viewMode === "silhouettes" && (() => {
                const nr = node.radius;
                const sRand = seededRandom(node.seed + 400);
                const silParams = {
                  decided:     { tH: 0.50, tTopW: 0.035, tBotW: 0.05,  cOffY: -0.45, cRx: 0.25, cRy: 0.22, bulges: 0, roots: false },
                  implemented: { tH: 0.55, tTopW: 0.045, tBotW: 0.07,  cOffY: -0.42, cRx: 0.35, cRy: 0.30, bulges: 2, roots: false },
                  reviewed:    { tH: 0.55, tTopW: 0.055, tBotW: 0.09,  cOffY: -0.38, cRx: 0.42, cRy: 0.36, bulges: 3, roots: true },
                  learned:     { tH: 0.50, tTopW: 0.065, tBotW: 0.12,  cOffY: -0.32, cRx: 0.50, cRy: 0.42, bulges: 4, roots: true },
                } as const;
                const sp = silParams[node.decision.status];
                const tH = nr * sp.tH;
                const tTopW = nr * sp.tTopW;
                const tBotW = nr * sp.tBotW;
                const tBase = nr * 0.15;
                const tTop = tBase - tH;
                const cY = nr * sp.cOffY;
                const cRx = nr * sp.cRx;
                const cRy = nr * sp.cRy;

                return (
                  <>
                    {/* Root flares for mature trees */}
                    {sp.roots && (
                      <>
                        <path
                          d={`M ${-tBotW * 0.8} ${tBase} Q ${-tBotW * 2.8} ${tBase + 3} ${-tBotW * 3.5} ${tBase + 1}`}
                          stroke="oklch(0.42 0.04 55)" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.45}
                        />
                        <path
                          d={`M ${tBotW * 0.8} ${tBase} Q ${tBotW * 2.8} ${tBase + 3} ${tBotW * 3.5} ${tBase + 1}`}
                          stroke="oklch(0.42 0.04 55)" strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.45}
                        />
                      </>
                    )}

                    {/* Trunk — organic taper with bezier curves */}
                    <path
                      d={`M ${-tBotW} ${tBase} C ${-tBotW} ${tBase - tH * 0.4} ${-tTopW} ${tTop + tH * 0.4} ${-tTopW} ${tTop} L ${tTopW} ${tTop} C ${tTopW} ${tTop + tH * 0.4} ${tBotW} ${tBase - tH * 0.4} ${tBotW} ${tBase} Z`}
                      fill="oklch(0.42 0.04 55)"
                      opacity={0.75}
                    />

                    {/* Crown — main ellipse */}
                    <ellipse
                      cx={0} cy={cY} rx={cRx} ry={cRy}
                      fill={`url(#tree-grad-${node.decision.id})`}
                      filter="url(#tree-shadow)"
                    />

                    {/* Crown texture — overlapping circles for organic canopy feel */}
                    {Array.from({ length: sp.bulges }).map((_, i) => {
                      const bAngle = ((i + 0.3) / Math.max(sp.bulges, 1)) * Math.PI + sRand() * 0.5 - 0.25;
                      const bDist = cRx * (0.35 + sRand() * 0.25);
                      const bx = Math.cos(bAngle) * bDist;
                      const by = cY - Math.abs(Math.sin(bAngle)) * cRy * 0.35 - sRand() * cRy * 0.15;
                      const br = cRx * (0.28 + sRand() * 0.12);
                      return (
                        <circle key={`bulge-${i}`} cx={bx} cy={by} r={br} fill={node.colorMid} opacity={0.25} />
                      );
                    })}

                    {/* Crown highlight on hover */}
                    {isActive && (
                      <ellipse cx={0} cy={cY} rx={cRx + 1.5} ry={cRy + 1.5} fill="none" stroke={node.color} strokeWidth={1.5} />
                    )}

                    {/* Crown center mark */}
                    <circle cx={0} cy={cY} r={2.5} fill={node.color} opacity={0.4} />
                  </>
                );
              })()}

              {/* Action satellites */}
              {node.actions.map((action, i) => {
                const orbitR = node.radius + 10;
                const ax = Math.cos(action.angle) * orbitR;
                const ay = Math.sin(action.angle) * orbitR;
                return (
                  <circle
                    key={i}
                    cx={ax}
                    cy={ay}
                    r={3.5}
                    fill={action.complete ? node.color : "transparent"}
                    stroke={node.color}
                    strokeWidth={action.complete ? 0 : 1.2}
                    opacity={action.complete ? 0.7 : 0.4}
                  />
                );
              })}

              {/* Decision number label */}
              <text
                y={labelY}
                textAnchor="middle"
                className="text-[0.6875rem] fill-bark-muted select-none pointer-events-none"
                style={{ fontFamily: "var(--font-display)" }}
                opacity={isActive ? 1 : 0.6}
              >
                #{node.decision.number}
              </text>
            </g>
          );
        })}

        {/* Root tooltip */}
        {rootTooltip && (
          <g transform={`translate(${rootTooltip.x}, ${rootTooltip.y})`}>
            <rect
              x={-30}
              y={-20}
              width={60}
              height={18}
              rx={4}
              fill="oklch(0.25 0.02 55)"
              opacity={0.9}
            />
            <text
              textAnchor="middle"
              y={-8}
              className="text-[0.5625rem] fill-paper select-none pointer-events-none"
              style={{ fontFamily: "var(--font-body)" }}
            >
              {rootTooltip.label}
            </text>
          </g>
        )}
      </svg>

      {/* Screen-reader text alternative for the canvas */}
      <div className="sr-only" role="region" aria-label="Decision relationships summary">
        <h2>Decision relationships</h2>
        <ul>
          {nodes.map((node) => {
            const d = node.decision;
            const linked = d.linkedDecisions || [];
            return (
              <li key={d.id}>
                Decision #{d.number}: {d.title} — {STATUS_LABELS[d.status]}
                {linked.length > 0 && (
                  <ul>
                    {linked.map((link) => (
                      <li key={link.id}>
                        {ROOT_STYLES[link.relation as RelationType]?.label || link.relation} #{link.number}: {link.title}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Tooltip for selected node */}
      {selectedNode && (() => {
        const pos = svgToPixel(selectedNode.x, selectedNode.y);
        const scale = svgPixelScale();
        const cw = containerRef.current?.clientWidth || W;
        const ch = containerRef.current?.clientHeight || H;
        return (
          <Tooltip
            node={selectedNode}
            pixelX={pos.x}
            pixelY={pos.y}
            pixelRadius={selectedNode.radius * scale}
            containerWidth={cw}
            containerHeight={ch}
            onClose={() => setSelectedId(null)}
            onNavigate={() =>
              !readOnly && router.push(`/decisions/${selectedNode.decision.number}`)
            }
            readOnly={readOnly}
          />
        );
      })()}

      {/* Legend */}
      <Legend />
    </div>
  );
}
