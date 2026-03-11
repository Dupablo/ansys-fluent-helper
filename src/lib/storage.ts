import { Project, Version } from "./types";

const STORAGE_KEY = "ansys-fluent-projects";

function readAll(): Project[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function getProjects(): Project[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const projects = readAll();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = project;
  } else {
    projects.push(project);
  }
  writeAll(projects);
}

export function deleteProject(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function addVersion(projectId: string, version: Version): Project | undefined {
  const projects = readAll();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return undefined;
  project.versions.push(version);
  project.activeVersionId = version.id;
  project.updatedAt = new Date().toISOString();
  writeAll(projects);
  return project;
}

export function setActiveVersion(projectId: string, versionId: string): Project | undefined {
  const projects = readAll();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return undefined;
  const version = project.versions.find((v) => v.id === versionId);
  if (!version) return undefined;
  project.activeVersionId = versionId;
  project.updatedAt = new Date().toISOString();
  writeAll(projects);
  return project;
}
