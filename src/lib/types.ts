export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  problemText: string;
  problemImage?: string; // base64 data URL
  versions: Version[];
  activeVersionId: string;
}

export interface Version {
  id: string;
  number: number;
  createdAt: string;
  revisionPrompt?: string;
  workflow: WorkflowOutput;
}

export interface WorkflowOutput {
  problemType: ProblemType;
  problemTypeLabel: string;
  confidence: number;
  sections: WorkflowSection[];
}

export interface WorkflowSection {
  id: string;
  title: string;
  content: string;
  tips?: string[];
  warnings?: string[];
  fluentMenuPaths?: string[];
}

export type ProblemType =
  | "pipe-flow"
  | "external-flow"
  | "natural-convection"
  | "forced-convection"
  | "conjugate-heat-transfer"
  | "heat-exchanger"
  | "lid-driven-cavity"
  | "backward-facing-step"
  | "unknown";
