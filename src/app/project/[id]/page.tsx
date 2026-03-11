"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ProblemInput } from "@/components/problem-input";
import { WorkflowOutput } from "@/components/workflow-output";
import { RevisionInput } from "@/components/revision-input";
import { VersionSidebar } from "@/components/version-sidebar";
import { VersionCompare } from "@/components/version-compare";
import { Project, Version } from "@/lib/types";
import * as storage from "@/lib/storage";
import { analyzeWorkflow } from "@/lib/analyzer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | undefined>();

  const loadProject = useCallback(() => {
    const p = storage.getProject(projectId);
    if (p) {
      setProject(p);
    }
    setLoaded(true);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const activeVersion = project?.versions.find((v) => v.id === project.activeVersionId);
  const compareVersion = compareVersionId
    ? project?.versions.find((v) => v.id === compareVersionId)
    : undefined;

  const handleAnalyze = (text: string, image?: string) => {
    if (!project) return;

    const workflow = analyzeWorkflow(text);
    const versionId = crypto.randomUUID();
    const newVersion: Version = {
      id: versionId,
      number: project.versions.length + 1,
      createdAt: new Date().toISOString(),
      workflow,
    };

    const updated: Project = {
      ...project,
      problemText: text,
      problemImage: image,
      versions: [...project.versions, newVersion],
      activeVersionId: versionId,
      updatedAt: new Date().toISOString(),
    };
    storage.saveProject(updated);
    setProject(updated);
  };

  const handleRevise = (revisionPrompt: string) => {
    if (!project) return;

    const workflow = analyzeWorkflow(project.problemText, revisionPrompt, project.problemText);
    const versionId = crypto.randomUUID();
    const newVersion: Version = {
      id: versionId,
      number: project.versions.length + 1,
      createdAt: new Date().toISOString(),
      revisionPrompt,
      workflow,
    };

    const updated = storage.addVersion(project.id, newVersion);
    if (updated) setProject(updated);
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!project) return;
    const updated = storage.setActiveVersion(project.id, versionId);
    if (updated) setProject(updated);
  };

  const handleSelectVersion = (versionId: string) => {
    if (!project) return;
    const updated = storage.setActiveVersion(project.id, versionId);
    if (updated) setProject(updated);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
          <p className="text-gray-500 mb-4">Project not found.</p>
          <Link href="/" className="text-brand-600 hover:text-brand-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasWorkflow = project.versions.length > 0 && activeVersion;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
          <h1 className="text-xl font-bold mt-2">{project.name}</h1>
        </div>

        {!hasWorkflow ? (
          /* Initial input — no analysis yet */
          <div className="max-w-2xl">
            <ProblemInput
              onSubmit={handleAnalyze}
              initialText={project.problemText}
              initialImage={project.problemImage}
            />
          </div>
        ) : (
          /* Workflow display + sidebar */
          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Problem text (collapsed) */}
              <details className="card">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Problem Statement
                </summary>
                <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {project.problemText}
                  {project.problemImage && (
                    <img
                      src={project.problemImage}
                      alt="Problem reference"
                      className="mt-3 max-h-48 rounded-lg"
                    />
                  )}
                </div>
              </details>

              {/* Version comparison view */}
              {compareVersion && activeVersion && (
                <VersionCompare
                  versionA={compareVersion}
                  versionB={activeVersion}
                  onClose={() => setCompareVersionId(undefined)}
                />
              )}

              {/* Workflow output */}
              <WorkflowOutput workflow={activeVersion.workflow} />

              {/* Revision input */}
              <RevisionInput onRevise={handleRevise} />
            </div>

            {/* Sidebar */}
            <div className="hidden lg:block w-72 flex-shrink-0 space-y-4">
              <VersionSidebar
                versions={project.versions}
                activeVersionId={project.activeVersionId}
                onSelect={handleSelectVersion}
                onRestore={handleRestoreVersion}
                onCompare={(vId) =>
                  setCompareVersionId(compareVersionId === vId ? undefined : vId)
                }
                compareVersionId={compareVersionId}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
