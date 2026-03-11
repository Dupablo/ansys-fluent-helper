"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/header";
import { ProblemInput } from "@/components/problem-input";
import { ClarificationPanel } from "@/components/clarification-panel";
import { WorkflowOutput } from "@/components/workflow-output";
import { RevisionInput } from "@/components/revision-input";
import { VersionSidebar } from "@/components/version-sidebar";
import { VersionCompare } from "@/components/version-compare";
import { Project, Version, PreAnalysis } from "@/lib/types";
import * as storage from "@/lib/storage";
import { analyzeWorkflow, preAnalyze } from "@/lib/analyzer";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Phase = "input" | "clarifying" | "ready";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState<string | undefined>();

  // Clarification flow state
  const [phase, setPhase] = useState<Phase>("input");
  const [pendingText, setPendingText] = useState("");
  const [pendingImage, setPendingImage] = useState<string | undefined>();
  const [preAnalysis, setPreAnalysis] = useState<PreAnalysis | null>(null);

  const loadProject = useCallback(() => {
    const p = storage.getProject(projectId);
    if (p) {
      setProject(p);
      // If project already has versions, go straight to ready
      if (p.versions.length > 0) {
        setPhase("ready");
      }
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

  // Step 1: User submits image + text → pre-analyze → clarify or generate
  const handleInputSubmit = (text: string, image?: string) => {
    if (!project) return;

    setPendingText(text);
    setPendingImage(image);

    const analysis = preAnalyze(text, !!image);

    // If we have high confidence and no required clarifications, skip to generation
    const hasRequiredQuestions = analysis.clarifications.some((q) => q.required);
    if (analysis.problemType !== "unknown" && !hasRequiredQuestions) {
      generateWorkflow(text, image);
      return;
    }

    // Otherwise, show clarification
    setPreAnalysis(analysis);
    setPhase("clarifying");
  };

  // Step 2: User answers clarifications → combine answers with text → generate
  const handleClarificationSubmit = (answers: Record<string, string>) => {
    // Build supplemental text from answers
    const supplementParts: string[] = [];
    for (const [key, value] of Object.entries(answers)) {
      if (value.trim()) {
        supplementParts.push(value);
      }
    }
    const combinedText = pendingText + "\n\n" + supplementParts.join(". ") + ".";
    generateWorkflow(combinedText, pendingImage);
  };

  // Generate workflow and create version
  const generateWorkflow = (text: string, image?: string) => {
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
    setPhase("ready");
    setPreAnalysis(null);
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

        {/* Phase: Input */}
        {phase === "input" && (
          <div className="max-w-4xl">
            <ProblemInput
              onSubmit={handleInputSubmit}
              initialText={project.problemText}
              initialImage={project.problemImage}
            />
          </div>
        )}

        {/* Phase: Clarification */}
        {phase === "clarifying" && preAnalysis && (
          <div className="max-w-3xl">
            <ClarificationPanel
              preAnalysis={preAnalysis}
              problemImage={pendingImage}
              onSubmit={handleClarificationSubmit}
              onBack={() => setPhase("input")}
            />
          </div>
        )}

        {/* Phase: Ready — show workflow */}
        {phase === "ready" && activeVersion && (
          <div className="flex gap-6">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Problem text (collapsed) */}
              <details className="card">
                <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  Problem Statement
                </summary>
                <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400">
                  {project.problemImage && (
                    <img
                      src={project.problemImage}
                      alt="Problem reference"
                      className="mb-3 max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  )}
                  <div className="whitespace-pre-wrap">{project.problemText}</div>
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
              <WorkflowOutput workflow={activeVersion.workflow} problemText={project.problemText} />

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
