"use client";

import { useState } from "react";
import { WorkflowSection } from "@/lib/types";
import { ChevronDown, ChevronRight, AlertTriangle, Lightbulb, Terminal } from "lucide-react";

interface SectionCardProps {
  section: WorkflowSection;
  defaultOpen?: boolean;
}

export function SectionCard({ section, defaultOpen = false }: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <h3 className="font-semibold text-sm">{section.title}</h3>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {section.content}
          </div>

          {section.tips && section.tips.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 space-y-1.5">
              {section.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {section.warnings && section.warnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 space-y-1.5">
              {section.warnings.map((warn, i) => (
                <div key={i} className="flex gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {section.fluentMenuPaths && section.fluentMenuPaths.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Fluent Menu Path
              </p>
              {section.fluentMenuPaths.map((path, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
                  <Terminal className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-400" />
                  <span>{path}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
