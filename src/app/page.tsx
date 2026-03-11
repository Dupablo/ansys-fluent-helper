"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ProjectCard } from "@/components/project-card";
import { useProjects } from "@/hooks/use-projects";
import { createSampleProjects } from "@/lib/sample-data";
import * as storage from "@/lib/storage";
import { Plus, BookOpen } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, loaded, createProject, deleteProject, refresh } = useProjects();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const name = newName.trim() || "New Project";
    const project = createProject(name, "");
    router.push(`/project/${project.id}`);
  };

  const handleLoadSamples = () => {
    const samples = createSampleProjects();
    for (const sample of samples) {
      storage.saveProject(sample);
    }
    refresh();
  };

  if (!loaded) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center text-gray-400">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ANSYS Fluent workflow generator for heat transfer &amp; fluid flow coursework
            </p>
          </div>
          <div className="flex gap-2">
            {projects.length === 0 && (
              <button onClick={handleLoadSamples} className="btn-secondary text-sm inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Load Samples
              </button>
            )}
            <button
              onClick={() => setShowNew(true)}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {showNew && (
          <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name..."
              className="input-field flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") setShowNew(false);
              }}
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary text-sm">
                Create
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
              No projects yet
            </h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              Create a new project or load sample problems to get started.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={handleLoadSamples} className="btn-secondary text-sm inline-flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                Load Sample Projects
              </button>
              <button onClick={() => setShowNew(true)} className="btn-primary text-sm inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                New Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={deleteProject} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
