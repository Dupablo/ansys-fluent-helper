"use client";

import { useState } from "react";
import { WorkflowOutput } from "@/lib/types";
import { Copy, Download, Check } from "lucide-react";

interface ExportMenuProps {
  workflow: WorkflowOutput;
}

function workflowToMarkdown(workflow: WorkflowOutput): string {
  const lines: string[] = [];
  lines.push(`# ${workflow.problemTypeLabel}`);
  lines.push(`**Problem Type:** ${workflow.problemType}`);
  lines.push(`**Confidence:** ${Math.round(workflow.confidence * 100)}%`);
  lines.push("");

  for (const section of workflow.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(section.content);
    lines.push("");

    if (section.tips?.length) {
      lines.push("**Tips:**");
      for (const tip of section.tips) {
        lines.push(`- ${tip}`);
      }
      lines.push("");
    }

    if (section.warnings?.length) {
      lines.push("**Warnings:**");
      for (const warn of section.warnings) {
        lines.push(`- ⚠️ ${warn}`);
      }
      lines.push("");
    }

    if (section.fluentMenuPaths?.length) {
      lines.push("**Fluent Menu Paths:**");
      for (const path of section.fluentMenuPaths) {
        lines.push(`- \`${path}\``);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function ExportMenu({ workflow }: ExportMenuProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    const md = workflowToMarkdown(workflow);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.problemType}-workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleCopyMarkdown} className="btn-secondary text-sm inline-flex items-center gap-1.5">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Markdown"}
      </button>
      <button onClick={handleExportJSON} className="btn-secondary text-sm inline-flex items-center gap-1.5">
        <Download className="w-4 h-4" />
        Export JSON
      </button>
    </div>
  );
}
