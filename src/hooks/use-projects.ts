"use client";

import { useState, useEffect, useCallback } from "react";
import { Project } from "@/lib/types";
import * as storage from "@/lib/storage";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setProjects(storage.getProjects());
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);
  }, [refresh]);

  const createProject = useCallback(
    (name: string, problemText: string, problemImage?: string) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const project: Project = {
        id,
        name,
        createdAt: now,
        updatedAt: now,
        problemText,
        problemImage,
        versions: [],
        activeVersionId: "",
      };
      storage.saveProject(project);
      refresh();
      return project;
    },
    [refresh]
  );

  const deleteProject = useCallback(
    (id: string) => {
      storage.deleteProject(id);
      refresh();
    },
    [refresh]
  );

  return { projects, loaded, createProject, deleteProject, refresh };
}
