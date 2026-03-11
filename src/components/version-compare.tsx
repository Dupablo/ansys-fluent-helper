"use client";

import { Version } from "@/lib/types";
import { X } from "lucide-react";

interface VersionCompareProps {
  versionA: Version;
  versionB: Version;
  onClose: () => void;
}

export function VersionCompare({ versionA, versionB, onClose }: VersionCompareProps) {
  const sectionsA = versionA.workflow.sections;
  const sectionsB = versionB.workflow.sections;

  // Match sections by title — deduplicated, preserving order
  const allTitles = Array.from(
    new Set([...sectionsA.map((s) => s.title), ...sectionsB.map((s) => s.title)])
  );

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Comparing v{versionA.number} vs v{versionB.number}
        </h3>
        <button onClick={onClose} className="btn-ghost p-1.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {allTitles.map((title) => {
          const a = sectionsA.find((s) => s.title === title);
          const b = sectionsB.find((s) => s.title === title);
          const changed = a?.content !== b?.content;

          return (
            <div key={title} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div
                className={`px-3 py-2 text-sm font-medium ${
                  changed
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400"
                }`}
              >
                {title}
                {!a && <span className="ml-2 text-xs text-green-600">(added in v{versionB.number})</span>}
                {!b && <span className="ml-2 text-xs text-red-600">(removed in v{versionB.number})</span>}
                {changed && a && b && <span className="ml-2 text-xs">(modified)</span>}
              </div>
              {changed && (
                <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                  <div className="p-3 text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400 bg-red-50/30 dark:bg-red-950/10">
                    <div className="text-xs font-medium text-gray-500 mb-1">v{versionA.number}</div>
                    {a?.content || "(not present)"}
                  </div>
                  <div className="p-3 text-xs whitespace-pre-wrap text-gray-600 dark:text-gray-400 bg-green-50/30 dark:bg-green-950/10">
                    <div className="text-xs font-medium text-gray-500 mb-1">v{versionB.number}</div>
                    {b?.content || "(not present)"}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
