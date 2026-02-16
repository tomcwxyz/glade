"use client";

import { useState, useMemo } from "react";
import { diffLines } from "diff";
import { tiptapToText } from "@/lib/tiptap-utils";
import { GitCompareArrows } from "lucide-react";

interface VersionData {
  id: string;
  versionNumber: number;
  content: unknown;
}

export function VersionDiff({ versions }: { versions: VersionData[] }) {
  const sorted = useMemo(
    () => [...versions].sort((a, b) => a.versionNumber - b.versionNumber),
    [versions]
  );

  const [fromVersion, setFromVersion] = useState(
    sorted.length >= 2 ? sorted[sorted.length - 2].versionNumber : sorted[0]?.versionNumber ?? 1
  );
  const [toVersion, setToVersion] = useState(
    sorted[sorted.length - 1]?.versionNumber ?? 1
  );

  const diffResult = useMemo(() => {
    const fromV = sorted.find((v) => v.versionNumber === fromVersion);
    const toV = sorted.find((v) => v.versionNumber === toVersion);
    if (!fromV || !toV) return [];

    const fromText = tiptapToText(fromV.content as Parameters<typeof tiptapToText>[0]);
    const toText = tiptapToText(toV.content as Parameters<typeof tiptapToText>[0]);

    return diffLines(fromText, toText);
  }, [sorted, fromVersion, toVersion]);

  if (sorted.length < 2) return null;

  const selectClass =
    "px-3 py-1.5 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

  return (
    <div className="mt-10">
      <h2
        className="text-lg font-medium tracking-tight mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Compare versions
      </h2>

      <div className="flex items-center gap-3 mb-4">
        <select
          value={fromVersion}
          onChange={(e) => setFromVersion(Number(e.target.value))}
          className={selectClass}
        >
          {sorted.map((v) => (
            <option key={v.id} value={v.versionNumber}>
              Version {v.versionNumber}
            </option>
          ))}
        </select>
        <GitCompareArrows size={16} className="text-bark-muted" />
        <select
          value={toVersion}
          onChange={(e) => setToVersion(Number(e.target.value))}
          className={selectClass}
        >
          {sorted.map((v) => (
            <option key={v.id} value={v.versionNumber}>
              Version {v.versionNumber}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-paper-warm">
        <pre className="text-sm leading-relaxed p-4 overflow-x-auto">
          {diffResult.map((part, i) => {
            if (part.added) {
              return (
                <span key={i} className="bg-canopy/10 text-canopy block">
                  {part.value.split("\n").filter(Boolean).map((line, j) => (
                    <span key={j} className="block">+ {line}</span>
                  ))}
                </span>
              );
            }
            if (part.removed) {
              return (
                <span key={i} className="bg-earth/10 text-earth block">
                  {part.value.split("\n").filter(Boolean).map((line, j) => (
                    <span key={j} className="block">- {line}</span>
                  ))}
                </span>
              );
            }
            return (
              <span key={i} className="text-bark-muted block">
                {part.value.split("\n").filter(Boolean).map((line, j) => (
                  <span key={j} className="block">  {line}</span>
                ))}
              </span>
            );
          })}
          {diffResult.length === 0 && (
            <span className="text-bark-muted italic">No differences found.</span>
          )}
        </pre>
      </div>
    </div>
  );
}
