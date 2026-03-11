"use client";

import { Project } from "@/lib/types";
import { Clock, FileText, Trash2 } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const activeVersion = project.versions.find((v) => v.id === project.activeVersionId);
  const typeLabel = activeVersion?.workflow.problemTypeLabel || "Not analyzed";
  const versionCount = project.versions.length;
  const date = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="card p-5 hover:shadow-md transition-shadow group relative">
      <Link href={`/project/${project.id}`} className="block">
        <h3 className="font-semibold text-lg mb-2 group-hover:text-brand-600 transition-colors">
          {project.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
          {project.problemText}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {typeLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {date}
          </span>
          <span>{versionCount} version{versionCount !== 1 ? "s" : ""}</span>
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (confirm("Delete this project?")) {
            onDelete(project.id);
          }
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500 transition-all"
        aria-label="Delete project"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
