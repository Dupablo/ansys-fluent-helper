"use client";

import { WorkflowOutput as WorkflowOutputType } from "@/lib/types";
import { SectionCard } from "./section-card";
import { ExportMenu } from "./export-menu";
import { VisualizationPanel } from "./visualization-panel";
import { CheckCircle, AlertCircle } from "lucide-react";

interface WorkflowOutputProps {
  workflow: WorkflowOutputType;
  problemText?: string;
}

export function WorkflowOutput({ workflow, problemText = "" }: WorkflowOutputProps) {
  const confidencePercent = Math.round(workflow.confidence * 100);
  const isHighConfidence = workflow.confidence >= 0.5;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{workflow.problemTypeLabel}</h2>
            {isHighConfidence ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Confidence: {confidencePercent}% &middot; {workflow.sections.length} sections
          </p>
        </div>
        <ExportMenu workflow={workflow} />
      </div>

      {!isHighConfidence && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-300">
          Low confidence detection. Consider adding more specific keywords to your problem description, or request a revision to adjust the workflow.
        </div>
      )}

      {/* Visualizations */}
      <VisualizationPanel problemType={workflow.problemType} text={problemText} />

      <div className="space-y-2">
        {workflow.sections.map((section, i) => (
          <SectionCard key={section.id} section={section} defaultOpen={i < 3} />
        ))}
      </div>
    </div>
  );
}
