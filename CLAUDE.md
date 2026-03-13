# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**ANSYS Fluent Helper** — a client-side Next.js 14 app that generates structured ANSYS Fluent solution workflows for Computational Heat Transfer and Fluid Flow coursework. Users submit problems via text (+ optional image), answer clarification questions, and receive a step-by-step Fluent workflow with programmatic visualizations. No backend, no API keys — all analysis is template-based and runs in the browser. Data persists in localStorage.

## Commands

```bash
cd ansys-fluent-helper
npm run dev       # dev server on :3000
npm run build     # type-check + production build
npm run lint      # ESLint
```

**Config note**: Next 14.2 requires `next.config.mjs` (not `.ts`). Do not rename it.

## Architecture

```
User input (text + optional image)
  → preAnalyze()          # keyword detection → problem type + clarification questions
  → User answers questions
  → analyzeWorkflow()     # template matching → WorkflowOutput (structured JSON)
  → Rendered sections + visualizations in UI
  → Revision loop (re-analyze with combined text → new version)
  → Version history in localStorage
```

### Core Engine (`src/lib/`)

- **`analyzer.ts`** (~4000 lines) — The big file. Contains `PROBLEM_KEYWORDS` dict, `detectProblemType()` scorer, `preAnalyze()` (generates clarification questions per type), `analyzeWorkflow()` (returns `WorkflowOutput` with 15-18 sections), and 14 template functions. Revision handling via `analyzeWorkflow(combinedText)`.
- **`types.ts`** — Core types: `Project`, `Version`, `WorkflowOutput`, `WorkflowSection`, `ClarificationQuestion`, `PreAnalysis`, `ProblemType` (14 types + "unknown").
- **`field-generators.ts`** (~1000 lines) — Generates synthetic 2D fields (80x120 grids) for temperature/velocity/Mach contour plots, residual convergence data, and surface monitor data. Uses simplified analytical solutions per physics type.
- **`colormap.ts`** — Jet colormap function matching ANSYS Fluent's default contour colors.
- **`storage.ts`** — localStorage CRUD under key `"ansys-fluent-projects"`.
- **`sample-data.ts`** — 8 sample projects spanning all major problem categories.

### 14 Problem Types

`pipe-flow`, `external-flow`, `natural-convection`, `forced-convection`, `conjugate-heat-transfer`, `heat-exchanger`, `lid-driven-cavity`, `backward-facing-step`, `conduction`, `radiation`, `fin-heat-transfer`, `porous-media`, `boiling-condensation`, `compressible-flow`

### Visualizations (`src/components/`)

- **`geometry-diagram.tsx`** — SVG diagrams for all 14 types with labeled boundaries, flow arrows, dimensions.
- **`contour-plot.tsx`** — Canvas-based contour renderer with colorbar and axis labels.
- **`line-chart.tsx`** — Canvas-based line chart with log scale support, legend, grid (for residuals and monitors).
- **`visualization-panel.tsx`** — Tabbed panel combining Geometry, Temperature Contour, Residual Plot, Monitor Plot.

### Input Flow (Phase State Machine)

The project workspace (`src/app/project/[id]/page.tsx`) uses a `Phase` type: `'input' → 'clarifying' → 'ready'`.

1. **Input** — Two-section grid: image upload + problem text description
2. **Clarifying** — Pre-analysis shows detected type, asks targeted questions based on missing info
3. **Ready** — Full workflow output with visualizations, revision input, version sidebar

### Key Patterns

- **Adding a new problem type**: Add to `ProblemType` union in `types.ts` → add keywords to `PROBLEM_KEYWORDS` in `analyzer.ts` → write template function → add to `TEMPLATES` dict → add clarification generator in `generateClarifications()` → add field generator in `field-generators.ts` → add geometry diagram in `geometry-diagram.tsx` → add sample in `sample-data.ts`.
- **Keyword scoring**: Multi-word keywords get bonus weight. `detectProblemType()` returns best match + confidence (0-1).
- **Revision system**: Combines original text + revision prompt, re-runs `analyzeWorkflow()`. Specific keyword overrides for "change to turbulent", "add radiation", "make transient", etc.

## Dependencies

Next 14.2, React 18, lucide-react (icons), Tailwind CSS 3.4. No other runtime dependencies.
