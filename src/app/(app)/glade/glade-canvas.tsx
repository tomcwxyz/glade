"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { ListChecks, X } from "lucide-react";

// --- Types & Constants ---

type DecisionStatus = "decided" | "implemented" | "reviewed" | "learned";

interface LinkedDecision {
  id: string;
  number: number;
  title: string;
  relation: string;
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
  decided: {
    fill: "oklch(0.52 0.09 155)",
    light: "oklch(0.88 0.05 155)",
    mid: "oklch(0.70 0.07 155)",
  },
  implemented: {
    fill: "oklch(0.45 0.08 150)",
    light: "oklch(0.85 0.04 150)",
    mid: "oklch(0.65 0.06 150)",
  },
  reviewed: {
    fill: "oklch(0.58 0.12 70)",
    light: "oklch(0.90 0.06 75)",
    mid: "oklch(0.75 0.09 72)",
  },
  learned: {
    fill: "oklch(0.45 0.06 45)",
    light: "oklch(0.85 0.03 50)",
    mid: "oklch(0.65 0.05 48)",
  },
};

// Cluster positions (tag → rough position on canvas)
const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
  "service delivery": { x: 0.3, y: 0.3 },
  strategy: { x: 0.25, y: 0.45 },
  partnerships: { x: 0.55, y: 0.25 },
  finance: { x: 0.7, y: 0.55 },
  HR: { x: 0.35, y: 0.7 },
  governance: { x: 0.6, y: 0.75 },
  compliance: { x: 0.75, y: 0.8 },
  operations: { x: 0.8, y: 0.4 },
  communications: { x: 0.45, y: 0.55 },
};

function layoutNodes(
  decisions: Decision[],
  width: number,
  height: number
): TreeNode[] {
  const rand = seededRandom(42);
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

    // Position: cluster by primary tag
    const primaryTag = d.tags[0] || "governance";
    const cluster =
      CLUSTER_CENTERS[primaryTag] || CLUSTER_CENTERS["governance"];
    const jitterX = (rand() - 0.5) * usableW * 0.18;
    const jitterY = (rand() - 0.5) * usableH * 0.18;
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

// Find connections between decisions
function getConnections(
  nodes: TreeNode[]
): { from: TreeNode; to: TreeNode }[] {
  const connections: { from: TreeNode; to: TreeNode }[] = [];
  for (const node of nodes) {
    const linked = node.decision.linkedDecisions || [];
    for (const link of linked) {
      const target = nodes.find((n) => n.decision.id === link.id);
      if (target) {
        // Avoid duplicates
        const exists = connections.some(
          (c) =>
            (c.from === node && c.to === target) ||
            (c.from === target && c.to === node)
        );
        if (!exists) {
          connections.push({ from: node, to: target });
        }
      }
    }
  }
  return connections;
}

// Curved path between two nodes
function connectionPath(from: TreeNode, to: TreeNode): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  // Perpendicular offset for curve
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const offset = Math.sqrt(dx * dx + dy * dy) * 0.15;
  const cx = mx - (dy / Math.sqrt(dx * dx + dy * dy)) * offset;
  const cy = my + (dx / Math.sqrt(dx * dx + dy * dy)) * offset;
  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

// --- Legend ---

function Legend() {
  return (
    <div className="absolute bottom-6 left-6 flex items-center gap-6 text-xs text-bark-muted bg-paper/90 backdrop-blur-sm rounded-xl px-5 py-3 border border-border">
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
            <circle
              cx="5"
              cy="5"
              r="4.5"
              fill={STATUS_COLORS[status].fill}
            />
          </svg>
          <span>{label}</span>
        </div>
      ))}
      <span className="text-border-strong">|</span>
      <span className="font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
        Size
      </span>
      <span>= engagement</span>
      <span className="text-border-strong">|</span>
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10">
          <circle cx="5" cy="5" r="3.5" fill="oklch(0.52 0.07 155)" />
        </svg>
        <span>action done</span>
      </div>
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10">
          <circle
            cx="5"
            cy="5"
            r="3"
            fill="none"
            stroke="oklch(0.52 0.07 155)"
            strokeWidth="1"
          />
        </svg>
        <span>action open</span>
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
  onClose,
  onNavigate,
}: {
  node: TreeNode;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const d = node.decision;
  return (
    <div
      className="absolute z-20 bg-paper border border-border rounded-xl shadow-lg w-[320px] overflow-hidden"
      style={{
        left: Math.min(node.x + node.radius + 16, window.innerWidth - 400),
        top: Math.max(node.y - 60, 16),
      }}
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

        <div className="flex items-center gap-4 mt-3 text-xs text-bark-muted">
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

      <button
        onClick={onNavigate}
        className="w-full px-5 py-3 text-sm text-canopy hover:bg-canopy-pale/50 border-t border-border text-left font-medium transition-colors"
      >
        View full decision →
      </button>
    </div>
  );
}

// --- Main Canvas ---

export function GladeCanvas({ decisions }: { decisions: Decision[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  // Canvas dimensions (fixed for now, could be responsive)
  const W = 1200;
  const H = 750;

  const nodes = useMemo(() => layoutNodes(decisions, W, H), [decisions]);
  const connections = useMemo(() => getConnections(nodes), [nodes]);

  const selectedNode = selectedId
    ? nodes.find((n) => n.decision.id === selectedId)
    : null;

  const handleNodeClick = useCallback(
    (id: string) => {
      setSelectedId(selectedId === id ? null : id);
    },
    [selectedId]
  );

  return (
    <div className="relative flex-1 bg-paper overflow-hidden">
      {/* Header */}
      <div className="absolute top-6 left-6 z-10">
        <h1
          className="text-xl font-medium tracking-tight text-bark"
          style={{ fontFamily: "var(--font-display)" }}
        >
          The Glade
        </h1>
        <p className="text-sm text-bark-muted mt-0.5">
          {decisions.length} decisions · clustered by theme · sized by
          engagement
        </p>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        style={{ minHeight: "600px" }}
        onClick={() => setSelectedId(null)}
      >
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

        {/* Connection lines */}
        {connections.map(({ from, to }, i) => (
          <path
            key={`conn-${i}`}
            d={connectionPath(from, to)}
            stroke="oklch(0.38 0.08 155 / 0.1)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            fill="none"
          />
        ))}

        {/* Tree nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.decision.id;
          const isSelected = selectedId === node.decision.id;
          const isActive = isHovered || isSelected;
          const scale = isActive ? 1.08 : 1;

          return (
            <g
              key={node.decision.id}
              transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
              style={{
                transition: "transform 0.25s cubic-bezier(0.33, 1, 0.68, 1)",
                transformOrigin: "0 0",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredId(node.decision.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleNodeClick(node.decision.id);
              }}
            >
              {/* Outer canopy */}
              <circle
                r={node.radius}
                fill={`url(#tree-grad-${node.decision.id})`}
                filter="url(#tree-shadow)"
                stroke={isActive ? node.color : "transparent"}
                strokeWidth={isActive ? 1.5 : 0}
                style={{ transition: "stroke 0.2s" }}
              />

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
                y={node.radius + 24}
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
      </svg>

      {/* Tooltip for selected node */}
      {selectedNode && (
        <Tooltip
          node={selectedNode}
          onClose={() => setSelectedId(null)}
          onNavigate={() =>
            router.push(`/decisions/${selectedNode.decision.number}`)
          }
        />
      )}

      {/* Legend */}
      <Legend />
    </div>
  );
}
