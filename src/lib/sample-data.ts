import { Project } from "./types";
import { analyzeWorkflow } from "./analyzer";

const SAMPLE_PROBLEMS = [
  {
    name: "Heated Pipe Flow (Turbulent)",
    text: "Water flows through a circular pipe of diameter 25mm and length 2m. The inlet velocity is 1.5 m/s and the inlet temperature is 20°C. The pipe wall is maintained at a constant temperature of 80°C. Reynolds number is approximately 40000 (turbulent flow). Determine the outlet temperature, heat transfer rate, and Nusselt number using ANSYS Fluent.",
  },
  {
    name: "Flow Over a Cylinder",
    text: "Simulate external flow of air over a circular cylinder of diameter 10mm at Reynolds number 200. The freestream velocity is such that Re = 200 based on cylinder diameter. The cylinder surface is at 350K and the freestream temperature is 300K. Analyze the drag coefficient, Nusselt number distribution, and observe any vortex shedding patterns.",
  },
  {
    name: "Lid-Driven Cavity (Re=1000)",
    text: "Set up a lid-driven cavity simulation at Reynolds number 1000. The cavity is a square with side length 1m. The top lid moves at constant velocity. This is a benchmark problem - compare velocity profiles along the centerlines with Ghia et al. (1982) reference data.",
  },
];

export function createSampleProjects(): Project[] {
  const now = new Date().toISOString();

  return SAMPLE_PROBLEMS.map((sample, i) => {
    const id = `sample-${i + 1}`;
    const workflow = analyzeWorkflow(sample.text);
    const versionId = `v-${id}-1`;

    return {
      id,
      name: sample.name,
      createdAt: now,
      updatedAt: now,
      problemText: sample.text,
      versions: [
        {
          id: versionId,
          number: 1,
          createdAt: now,
          workflow,
        },
      ],
      activeVersionId: versionId,
    };
  });
}
