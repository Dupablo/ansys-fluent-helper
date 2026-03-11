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
  {
    name: "2D Heat Conduction — Composite Wall",
    text: "A composite wall consists of three layers: 10mm steel (k=50 W/m·K), 50mm insulation (k=0.04 W/m·K), and 20mm concrete (k=1.4 W/m·K). The inner surface is at 300°C and the outer surface is exposed to convection with h=25 W/m²·K and ambient temperature 25°C. Find the temperature distribution through the wall and heat flux using steady-state conduction analysis in ANSYS Fluent.",
  },
  {
    name: "Radiation in a Furnace Enclosure",
    text: "A rectangular furnace enclosure has dimensions 2m × 1m. The top wall is a heater at 1200K with emissivity 0.9. The bottom wall is the workpiece at 400K with emissivity 0.8. The side walls are refractory (adiabatic, re-radiating) with emissivity 0.7. Model the surface-to-surface radiation heat transfer using the S2S model. Determine the net radiative heat flux on each surface.",
  },
  {
    name: "Rectangular Fin Heat Transfer",
    text: "A rectangular aluminum fin (k=202 W/m·K) extends from a wall at 120°C into air at 25°C. The fin is 50mm long, 1mm thick, and 10mm wide. The convection coefficient is h=50 W/m²·K. The fin tip is adiabatic. Determine the temperature distribution along the fin, heat dissipation, and fin efficiency. Compare with analytical solution.",
  },
  {
    name: "Flow Through Porous Media",
    text: "Air flows through a packed bed of spherical particles (diameter 5mm, porosity 0.4) in a cylindrical column of diameter 100mm and length 300mm. The inlet velocity is 0.5 m/s at 25°C. The packed bed is modeled as a porous zone. Determine the pressure drop and compare with the Ergun equation. The permeability and inertial resistance factor should be computed from the Ergun correlation.",
  },
  {
    name: "Supersonic Nozzle Flow",
    text: "Air flows through a converging-diverging (de Laval) nozzle. The inlet total pressure is 300 kPa and total temperature is 500K. The nozzle throat diameter is 20mm and the exit diameter is 40mm. Model the compressible flow using the density-based solver. Determine the Mach number distribution, pressure ratio, and check for shock formation in the diverging section.",
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
