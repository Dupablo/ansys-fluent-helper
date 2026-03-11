"use client";

import { Version } from "@/lib/types";
import { History, RotateCcw, GitCompare } from "lucide-react";

interface VersionSidebarProps {
  versions: Version[];
  activeVersionId: string;
  onSelect: (versionId: string) => void;
  onRestore: (versionId: string) => void;
  onCompare: (versionId: string) => void;
  compareVersionId?: string;
}

export function VersionSidebar({
  versions,
  activeVersionId,
  onSelect,
  onRestore,
  onCompare,
  compareVersionId,
}: VersionSidebarProps) {
  if (versions.length <= 1) return null;

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <History className="w-4 h-4" />
        Version History
      </h3>
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {[...versions].reverse().map((version) => {
          const isActive = version.id === activeVersionId;
          const isComparing = version.id === compareVersionId;
          const date = new Date(version.createdAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          return (
            <div
              key={version.id}
              className={`p-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                isActive
                  ? "bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800"
                  : isComparing
                  ? "bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-transparent"
              }`}
              onClick={() => onSelect(version.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  v{version.number}
                  {isActive && (
                    <span className="ml-1.5 text-xs text-brand-600 dark:text-brand-400">active</span>
                  )}
                </span>
                <span className="text-xs text-gray-400">{date}</span>
              </div>
              {version.revisionPrompt && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {version.revisionPrompt}
                </p>
              )}
              {!isActive && (
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRestore(version.id);
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Restore
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare(version.id);
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 inline-flex items-center gap-1"
                  >
                    <GitCompare className="w-3 h-3" />
                    Compare
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
