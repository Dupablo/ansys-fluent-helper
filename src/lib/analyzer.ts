import { ProblemType, WorkflowOutput, WorkflowSection } from "./types";

// ---------------------------------------------------------------------------
// Keyword detection — same pattern as task_analyzer.py
// ---------------------------------------------------------------------------

const PROBLEM_KEYWORDS: Record<Exclude<ProblemType, "unknown">, string[]> = {
  "pipe-flow": [
    "pipe", "tube", "duct", "internal flow", "pipe flow", "tube flow",
    "fully developed", "entrance length", "pressure drop", "friction factor",
    "darcy", "moody", "hagen-poiseuille", "poiseuille", "reynolds number",
    "hydraulic diameter", "mass flow rate", "volume flow", "flow rate",
    "roughness", "smooth pipe", "rough pipe", "circular pipe", "annular",
  ],
  "external-flow": [
    "external flow", "flow over", "cylinder", "sphere", "flat plate",
    "boundary layer", "drag", "lift", "drag coefficient", "bluff body",
    "streamlined", "wake", "vortex shedding", "strouhal", "airfoil",
    "aerodynamic", "cross flow", "crossflow", "freestream",
  ],
  "natural-convection": [
    "natural convection", "free convection", "buoyancy", "buoyancy-driven",
    "rayleigh", "grashof", "vertical plate", "vertical wall", "heated plate",
    "hot wall", "cold wall", "enclosure", "cavity", "boussinesq",
    "gravity", "density difference", "thermal expansion",
  ],
  "forced-convection": [
    "forced convection", "convective heat transfer", "nusselt",
    "heat transfer coefficient", "thermal boundary layer", "heated surface",
    "cooling", "heated wall", "constant heat flux", "constant temperature",
    "convection coefficient", "film temperature",
  ],
  "conjugate-heat-transfer": [
    "conjugate", "solid-fluid", "conduction convection", "coupled",
    "solid region", "heat sink", "fin", "electronic cooling", "chip cooling",
    "pcb", "heat spreader", "thermal interface", "multi-region",
    "solid domain", "fluid domain",
  ],
  "heat-exchanger": [
    "heat exchanger", "shell and tube", "counter flow", "parallel flow",
    "counterflow", "cross-flow heat exchanger", "lmtd", "effectiveness",
    "ntu", "double pipe", "tube bank", "baffle", "fouling",
    "hot fluid", "cold fluid", "overall heat transfer",
  ],
  "lid-driven-cavity": [
    "lid driven", "lid-driven", "driven cavity", "cavity flow",
    "moving wall", "moving lid", "square cavity", "recirculating flow",
    "benchmark", "ghia",
  ],
  "backward-facing-step": [
    "backward facing step", "backward-facing step", "bfs",
    "sudden expansion", "step flow", "reattachment", "recirculation zone",
    "expansion ratio", "step height", "separated flow",
  ],
};

const PROBLEM_LABELS: Record<Exclude<ProblemType, "unknown">, string> = {
  "pipe-flow": "Internal Pipe Flow",
  "external-flow": "External Flow Over Bodies",
  "natural-convection": "Natural Convection",
  "forced-convection": "Forced Convection Heat Transfer",
  "conjugate-heat-transfer": "Conjugate Heat Transfer",
  "heat-exchanger": "Heat Exchanger Analysis",
  "lid-driven-cavity": "Lid-Driven Cavity Flow",
  "backward-facing-step": "Backward-Facing Step Flow",
};

interface DetectionResult {
  type: ProblemType;
  label: string;
  confidence: number;
}

function detectProblemType(text: string): DetectionResult {
  const lower = text.toLowerCase();
  let bestType: ProblemType = "unknown";
  let bestScore = 0;
  let totalKeywords = 0;

  for (const [type, keywords] of Object.entries(PROBLEM_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.includes(" ") ? 2 : 1; // multi-word keywords worth more
      }
    }
    totalKeywords += keywords.length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type as ProblemType;
    }
  }

  if (bestType === "unknown" || bestScore === 0) {
    return { type: "unknown", label: "Unknown Problem Type", confidence: 0 };
  }

  const maxPossible = PROBLEM_KEYWORDS[bestType as Exclude<ProblemType, "unknown">].length * 1.5;
  const confidence = Math.min(0.95, Math.max(0.3, bestScore / maxPossible));

  return {
    type: bestType,
    label: PROBLEM_LABELS[bestType as Exclude<ProblemType, "unknown">],
    confidence: Math.round(confidence * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Helper: detect sub-characteristics from text
// ---------------------------------------------------------------------------

function isLaminar(text: string): boolean {
  const l = text.toLowerCase();
  if (l.includes("turbulent")) return false;
  if (l.includes("laminar")) return true;
  const re = extractNumber(text, "reynolds", 0) || extractNumber(text, "re", 0);
  if (re > 0 && re < 2300) return true;
  return false; // default to turbulent for safety
}

function isTransient(text: string): boolean {
  const l = text.toLowerCase();
  return l.includes("transient") || l.includes("unsteady") || l.includes("time-dependent");
}

function hasRadiation(text: string): boolean {
  const l = text.toLowerCase();
  return l.includes("radiation") || l.includes("radiative") || l.includes("s2s") || l.includes("do model");
}

function hasHeating(text: string): boolean {
  const l = text.toLowerCase();
  return (
    l.includes("heat") || l.includes("temperature") || l.includes("thermal") ||
    l.includes("hot") || l.includes("cold") || l.includes("heated") || l.includes("cooled")
  );
}

function extractNumber(text: string, keyword: string, defaultVal: number): number {
  const re = new RegExp(keyword + "\\s*[=:of ]*\\s*([\\d.]+)", "i");
  const m = text.match(re);
  return m ? parseFloat(m[1]) : defaultVal;
}

// ---------------------------------------------------------------------------
// Section builder helper
// ---------------------------------------------------------------------------

let sectionCounter = 0;

function sec(
  title: string,
  content: string,
  opts?: { tips?: string[]; warnings?: string[]; fluentMenuPaths?: string[] }
): WorkflowSection {
  sectionCounter++;
  return {
    id: `sec-${sectionCounter}`,
    title,
    content,
    ...opts,
  };
}

// ---------------------------------------------------------------------------
// Revision handling
// ---------------------------------------------------------------------------

function applyRevisionOverrides(text: string, base: string): string {
  const l = text.toLowerCase();
  let combined = base;

  if (l.includes("change to turbulent") || l.includes("make turbulent") || l.includes("switch to turbulent")) {
    combined = combined.replace(/laminar/gi, "turbulent");
    combined += " turbulent flow k-epsilon";
  }
  if (l.includes("change to laminar") || l.includes("make laminar") || l.includes("switch to laminar")) {
    combined = combined.replace(/turbulent/gi, "laminar");
    combined += " laminar flow";
  }
  if (l.includes("add radiation") || l.includes("include radiation")) {
    combined += " radiation radiative heat transfer";
  }
  if (l.includes("make transient") || l.includes("change to transient") || l.includes("make unsteady")) {
    combined += " transient unsteady time-dependent";
  }

  return combined + " " + text;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function templatePipeFlow(text: string): WorkflowSection[] {
  const laminar = isLaminar(text);
  const transient = isTransient(text);
  const heated = hasHeating(text);
  const regime = laminar ? "Laminar" : "Turbulent";
  const turbModel = laminar ? "None (Viscous → Laminar)" : "k-epsilon Realizable with Enhanced Wall Treatment";

  return [
    sec("Problem Summary", `Internal pipe flow analysis — ${regime} regime, ${heated ? "with heat transfer" : "isothermal"}${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      "This problem is governed by:",
      `- Continuity equation (mass conservation)`,
      `- Navier-Stokes equations (momentum conservation)`,
      heated ? "- Energy equation (heat transfer)" : "",
      !laminar ? `- Turbulence transport equations (${turbModel})` : "",
      "",
      `Flow regime: ${regime}`,
      transient ? "Time dependence: Transient" : "Time dependence: Steady-state",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Incompressible flow (Mach < 0.3)",
      `- ${regime} flow regime`,
      "- Newtonian fluid",
      "- No-slip condition at walls",
      heated ? "- Constant fluid properties (or Boussinesq approximation if buoyancy matters)" : "- Isothermal conditions",
      "- Gravity effects neglected (unless vertical orientation specified)",
      transient ? "- Time-dependent solution required" : "- Steady-state conditions",
    ].join("\n")),

    sec("Required Inputs", [
      "Before starting, gather these values from your problem statement:",
      "- Pipe diameter (D) and length (L)",
      "- Inlet velocity or mass flow rate",
      heated ? "- Wall temperature or heat flux" : "",
      heated ? "- Inlet temperature" : "",
      "- Fluid properties (density, viscosity, specific heat, thermal conductivity)",
      "- Operating pressure",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "Set fluid material properties. Common choices:",
      "",
      "**Water (at ~25°C):**",
      "- Density: 997 kg/m³",
      "- Dynamic viscosity: 8.9×10⁻⁴ Pa·s",
      "- Specific heat: 4182 J/(kg·K)",
      "- Thermal conductivity: 0.607 W/(m·K)",
      "",
      "**Air (at ~25°C):**",
      "- Density: 1.185 kg/m³",
      "- Dynamic viscosity: 1.849×10⁻⁵ Pa·s",
      "- Specific heat: 1006 J/(kg·K)",
      "- Thermal conductivity: 0.0262 W/(m·K)",
    ].join("\n"), {
      fluentMenuPaths: ["Materials → Fluid → Create/Edit"],
    }),

    sec("Geometry Guidance", [
      "Create a 2D axisymmetric or 3D pipe geometry:",
      "",
      "**2D Axisymmetric (recommended for circular pipes):**",
      "- Create a rectangle: width = L (pipe length), height = D/2 (radius)",
      "- The bottom edge is the axis of symmetry",
      "- Top edge = pipe wall, left edge = inlet, right edge = outlet",
      "",
      "**3D (if needed):**",
      "- Create a cylinder: diameter = D, length = L",
      "- Add upstream extension (~5D) for flow development if studying entrance effects",
    ].join("\n"), {
      tips: [
        "For fully developed flow studies, use L/D > 50 for laminar, L/D > 10 for turbulent",
        "2D axisymmetric saves significant computation time for circular pipes",
      ],
    }),

    sec("Meshing Guidance", [
      "**2D Axisymmetric:**",
      `- Use a structured quad mesh`,
      `- Near-wall first cell height: ${laminar ? "ensure at least 10-15 cells across the radius" : "y+ ≈ 1 for Enhanced Wall Treatment (first cell ≈ 0.01-0.05 mm)"}`,
      "- Bias/growth ratio near wall: 1.1-1.2",
      "- Axial divisions: uniform spacing is usually fine",
      `- Total cells: ${laminar ? "5,000-20,000" : "20,000-80,000"}`,
      "",
      "**3D:**",
      "- Use sweep mesh or multizone",
      "- O-grid near wall for boundary layer resolution",
      `- Total cells: ${laminar ? "50,000-200,000" : "200,000-1,000,000"}`,
      "",
      "**Quality targets:**",
      "- Orthogonal quality > 0.7",
      "- Skewness < 0.5",
      "- Aspect ratio < 20 (near wall can be higher)",
    ].join("\n"), {
      tips: ["Always check mesh quality before proceeding to solver setup"],
      warnings: laminar ? [] : ["For k-epsilon with Enhanced Wall Treatment, y+ must be ~1. Check after initial run with Plots → Y+ Plot"],
      fluentMenuPaths: ["Mesh → Check", "Mesh → Quality"],
    }),

    sec("Solver Setup", [
      "**General Settings:**",
      `- Solver Type: Pressure-Based`,
      `- Time: ${transient ? "Transient" : "Steady"}`,
      "- 2D Space: Axisymmetric (if 2D)",
      "- Velocity Formulation: Absolute",
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-epsilon → Realizable → Enhanced Wall Treatment"}`,
      heated ? "- Energy: ON" : "- Energy: OFF",
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → General",
        `Setup → Models → Viscous → ${laminar ? "Laminar" : "k-epsilon"}`,
        ...(heated ? ["Setup → Models → Energy → ON"] : []),
      ],
    }),

    sec("Boundary Conditions", [
      "**Inlet:**",
      "- Type: Velocity-Inlet",
      "- Velocity Magnitude: [from problem]",
      !laminar ? "- Turbulence Specification: Intensity and Hydraulic Diameter" : "",
      !laminar ? "- Turbulent Intensity: 5% (typical for pipe flow)" : "",
      !laminar ? "- Hydraulic Diameter: D (pipe diameter)" : "",
      heated ? "- Temperature: [inlet temperature from problem]" : "",
      "",
      "**Outlet:**",
      "- Type: Pressure-Outlet",
      "- Gauge Pressure: 0 Pa",
      !laminar ? "- Backflow Turbulent Intensity: 5%" : "",
      !laminar ? "- Backflow Hydraulic Diameter: D" : "",
      "",
      "**Wall:**",
      "- Type: Wall",
      "- No-slip condition",
      heated ? "- Thermal: Constant Temperature or Constant Heat Flux (as specified)" : "- Thermal: default (adiabatic if energy is on)",
      "",
      "**Axis (if 2D axisymmetric):**",
      "- Type: Axis",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Inlet",
        "Setup → Boundary Conditions → Outlet",
        "Setup → Boundary Conditions → Wall",
      ],
    }),

    sec("Solution Methods", [
      "**Scheme:** SIMPLE (or SIMPLEC for faster convergence)",
      "",
      "**Spatial Discretization:**",
      "- Gradient: Least Squares Cell Based",
      `- Pressure: ${laminar ? "Standard" : "Second Order"}`,
      "- Momentum: Second Order Upwind",
      heated ? "- Energy: Second Order Upwind" : "",
      !laminar ? "- Turbulent Kinetic Energy: Second Order Upwind" : "",
      !laminar ? "- Turbulent Dissipation Rate: Second Order Upwind" : "",
      "",
      transient ? "**Transient Formulation:** Second Order Implicit" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
    }),

    sec("Initialization", [
      "**Method:** Hybrid Initialization (recommended)",
      "",
      "Or Standard Initialization:",
      "- Velocity: inlet velocity value",
      "- Pressure: 0 Pa",
      heated ? "- Temperature: inlet temperature" : "",
      !laminar ? "- Turbulent Kinetic Energy: calculated from 5% intensity" : "",
      "",
      "After initialization, check the initial field looks reasonable.",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Initialization → Hybrid → Initialize"],
    }),

    sec("Solution Strategy", [
      transient
        ? [
            "**Time Step:** Start with Δt = L / (100 × U_inlet)",
            "- Max Iterations per Time Step: 20",
            "- Number of Time Steps: enough to reach quasi-steady state",
            "- Run until flow is fully developed",
          ].join("\n")
        : [
            `**Number of Iterations:** Start with ${laminar ? "500-1000" : "1000-2000"}`,
            "- Monitor residuals and convergence",
            "- Run until all residuals drop below target",
          ].join("\n"),
      "",
      "**Under-Relaxation Factors (if convergence issues):**",
      "- Pressure: 0.3 → try 0.2",
      "- Momentum: 0.7 → try 0.5",
      heated ? "- Energy: 1.0 → try 0.8" : "",
      !laminar ? "- Turbulent Kinetic Energy: 0.8 → try 0.5" : "",
    ].filter(Boolean).join("\n"), {
      tips: ["If solution diverges, reduce under-relaxation factors and restart from initialization"],
      fluentMenuPaths: ["Solution → Run Calculation"],
    }),

    sec("Residual Monitoring", [
      "**Convergence Criteria:**",
      "- Continuity: < 1×10⁻⁴ (ideally 10⁻⁶)",
      "- x-velocity, y-velocity: < 1×10⁻⁴",
      heated ? "- Energy: < 1×10⁻⁶" : "",
      !laminar ? "- k, epsilon: < 1×10⁻⁴" : "",
      "",
      "**Important:** Residuals alone are not sufficient for convergence. Also monitor physical quantities.",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Monitors → Residual"],
      warnings: ["Never rely on residuals alone — always check surface monitors too"],
    }),

    sec("Monitor Points", [
      "Set up surface monitors to track convergence of physical quantities:",
      "",
      "1. **Outlet average velocity** — Surface Monitor → Area-Weighted Average of Velocity at outlet",
      heated ? "2. **Outlet average temperature** — Surface Monitor → Area-Weighted Average of Temperature at outlet" : "",
      "3. **Pressure drop** — Create expression: inlet area-avg pressure minus outlet area-avg pressure",
      heated ? "4. **Wall heat flux** — Surface Monitor → Area-Weighted Average of Wall Heat Flux" : "",
      "",
      "Solution is converged when all monitors reach constant values (not just residuals).",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Monitors → Surface Monitor → Create"],
    }),

    sec("Post-Processing", [
      "After convergence, create the following visualizations:",
      "",
      "**Contour Plots:**",
      "- Velocity magnitude contour",
      "- Pressure contour",
      heated ? "- Temperature contour" : "",
      !laminar ? "- Turbulent kinetic energy contour" : "",
      "",
      "**XY Plots:**",
      "- Velocity profile at outlet (radial direction) — compare with analytical solution",
      `  ${laminar ? "- Analytical: u(r) = 2U_avg(1 - (r/R)²) for fully developed laminar" : "- Compare with 1/7th power law profile"}`,
      "- Pressure along pipe centerline (should be linear for fully developed flow)",
      heated ? "- Temperature profile at outlet" : "",
      heated ? "- Wall temperature or Nusselt number along pipe length" : "",
      "",
      "**Key Results to Report:**",
      "- Pressure drop (ΔP)",
      `- Friction factor: f = ΔP × D / (½ρU²L)${laminar ? " — compare with f = 64/Re" : " — compare with Moody chart"}`,
      heated ? "- Average Nusselt number" : "",
      heated ? "- Outlet bulk temperature" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → New",
        "Results → Plots → XY Plot → New",
      ],
    }),

    sec("Sanity Checks", [
      "Verify your results make physical sense:",
      "",
      "- Mass conservation: inlet mass flow = outlet mass flow (check Reports → Fluxes)",
      heated ? "- Energy conservation: heat added through walls = enthalpy rise of fluid" : "",
      `- Friction factor should match correlations: ${laminar ? "f = 64/Re for fully developed laminar" : "Moody chart or Colebrook equation"}`,
      "- Velocity profile shape: " + (laminar ? "parabolic for fully developed laminar" : "flatter profile for turbulent (1/7th power law)"),
      "- Pressure should decrease linearly along pipe length (for fully developed flow)",
      heated ? "- Nusselt number comparison: " + (laminar ? "Nu = 3.66 (constant T) or 4.36 (constant q) for fully developed" : "Use Dittus-Boelter: Nu = 0.023 Re⁰·⁸ Pr⁰·⁴") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
      warnings: ["If mass imbalance > 0.1%, the solution is not converged — run more iterations"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Divergence after a few iterations:**",
      "- Reduce under-relaxation factors (Pressure: 0.2, Momentum: 0.5)",
      "- Check mesh quality — fix any negative volumes",
      "- Ensure boundary conditions are physically consistent",
      "",
      "**Residuals stall at high values:**",
      "- Switch from First Order to Second Order Upwind after initial convergence",
      !laminar ? "- Try different turbulence model (k-omega SST)" : "",
      "- Refine mesh in areas of high gradients",
      "",
      "**Unphysical results:**",
      "- Check units consistency",
      "- Verify material properties",
      "- Ensure correct axis boundary condition (2D axisymmetric)",
      heated ? "- Check if energy equation is turned ON" : "",
      !laminar ? "- Verify y+ values are appropriate for chosen wall treatment" : "",
    ].filter(Boolean).join("\n"), {
      tips: [
        "Start with first-order discretization, then switch to second-order after partial convergence",
        "Save your case file before making major changes",
      ],
    }),
  ];
}

function templateExternalFlow(text: string): WorkflowSection[] {
  const laminar = isLaminar(text);
  const transient = isTransient(text);
  const heated = hasHeating(text);
  const regime = laminar ? "Laminar" : "Turbulent";

  const isCylinder = text.toLowerCase().includes("cylinder");
  const isFlatPlate = text.toLowerCase().includes("flat plate") || text.toLowerCase().includes("plate");
  const bodyType = isCylinder ? "cylinder" : isFlatPlate ? "flat plate" : "body";

  return [
    sec("Problem Summary", `External flow over a ${bodyType} — ${regime} regime, ${heated ? "with heat transfer" : "isothermal"}${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      `External flow over a ${bodyType} involves:`,
      "- Boundary layer development along the surface",
      isCylinder ? "- Flow separation and wake formation behind the cylinder" : "",
      "- Pressure distribution around the body",
      !laminar ? "- Turbulent wake and vortex structures" : "",
      heated ? "- Thermal boundary layer development" : "",
      transient && isCylinder ? "- Periodic vortex shedding (von Kármán street) if Re > ~47" : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Incompressible flow",
      `- ${regime} regime`,
      "- Newtonian fluid",
      `- ${isCylinder ? "2D analysis (infinite cylinder span)" : "2D or 3D as appropriate"}`,
      "- Far-field boundaries sufficiently far from body",
      heated ? "- Constant fluid properties or temperature-dependent" : "",
    ].join("\n")),

    sec("Required Inputs", [
      "- Freestream velocity (U∞)",
      `- ${isCylinder ? "Cylinder diameter (D)" : isFlatPlate ? "Plate length (L)" : "Characteristic dimension"}`,
      "- Fluid properties (density, viscosity)",
      heated ? "- Surface temperature or heat flux" : "",
      heated ? "- Freestream temperature" : "",
    ].filter(Boolean).join("\n")),

    sec("Geometry Guidance", [
      `**Domain sizing for ${bodyType}:**`,
      isCylinder ? [
        "- Upstream: 10-15D from cylinder center",
        "- Downstream: 20-30D from cylinder center",
        "- Top/Bottom: 10-15D from center",
        "- Create a circle (cylinder cross-section) and subtract from rectangular domain",
      ].join("\n") : [
        "- Upstream: 5L from leading edge",
        "- Downstream: 10L from trailing edge",
        "- Top: 5L from surface",
        "- Create the plate as a wall boundary at the bottom",
      ].join("\n"),
      "",
      "Use a C-grid or O-grid topology for better mesh quality around the body.",
    ].join("\n"), {
      tips: ["Domain should be large enough that boundaries don't affect the flow around the body"],
      warnings: ["Too-small domain will give incorrect drag/lift coefficients"],
    }),

    sec("Meshing Guidance", [
      `**Near-${bodyType} mesh:**`,
      `- First cell height: ${laminar ? "calculate for adequate boundary layer resolution (10-20 cells across BL)" : "y+ ≈ 1 for k-omega SST"}`,
      "- Growth ratio: 1.1-1.2",
      isCylinder ? "- O-grid around cylinder with ~200-300 cells circumferentially" : "- Structured mesh along plate surface",
      "",
      "**Wake region:**",
      "- Refine mesh in the wake region downstream",
      "- Gradual coarsening toward far-field boundaries",
      "",
      `**Total cells:** ${laminar ? "20,000-80,000" : "100,000-500,000"}`,
      "",
      "**Quality:** Orthogonal quality > 0.5, Skewness < 0.8",
    ].join("\n"), {
      fluentMenuPaths: ["Mesh → Check"],
    }),

    sec("Solver Setup", [
      "**General:**",
      `- Solver: Pressure-Based`,
      `- Time: ${transient ? "Transient" : "Steady"}`,
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-omega SST (recommended for external flows with separation)"}`,
      heated ? "- Energy: ON" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → General",
        `Setup → Models → Viscous → ${laminar ? "Laminar" : "k-omega SST"}`,
      ],
    }),

    sec("Boundary Conditions", [
      "**Inlet (far-field upstream):**",
      "- Type: Velocity-Inlet",
      "- Velocity: U∞ (freestream velocity)",
      !laminar ? "- Turbulent Intensity: 1% (freestream)" : "",
      !laminar ? "- Turbulent Viscosity Ratio: 10" : "",
      heated ? "- Temperature: T∞" : "",
      "",
      "**Outlet (downstream):**",
      "- Type: Pressure-Outlet",
      "- Gauge Pressure: 0 Pa",
      "",
      `**${isCylinder ? "Cylinder" : "Body"} Surface:**`,
      "- Type: Wall, No-Slip",
      heated ? "- Thermal: Constant Temperature or Heat Flux" : "",
      "",
      "**Top/Bottom (far-field):**",
      "- Type: Symmetry (or Velocity-Inlet with freestream conditions)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions"],
    }),

    sec("Solution Methods", [
      "**Scheme:** Coupled (better for external flows) or SIMPLE",
      "",
      "**Spatial Discretization:**",
      "- Gradient: Least Squares Cell Based",
      "- Pressure: Second Order",
      "- Momentum: Second Order Upwind",
      !laminar ? "- Turbulent Kinetic Energy: Second Order Upwind" : "",
      !laminar ? "- Specific Dissipation Rate: Second Order Upwind" : "",
      heated ? "- Energy: Second Order Upwind" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
    }),

    sec("Initialization", [
      "**Hybrid Initialization** recommended.",
      "",
      "Or Standard Initialization with freestream values:",
      "- Velocity: U∞ in flow direction",
      "- Pressure: 0 Pa",
      heated ? "- Temperature: T∞" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Initialization"],
    }),

    sec("Solution Strategy", [
      transient
        ? [
            "**Time Step:** Δt ≈ D / (20 × U∞) for resolving vortex shedding",
            "- Max Iterations/Time Step: 20",
            "- Run for multiple shedding cycles to get time-averaged results",
          ].join("\n")
        : `**Iterations:** ${laminar ? "1000-2000" : "2000-5000"}`,
      "",
      "If convergence is difficult:",
      "- Start with first-order discretization",
      "- Use Coupled solver with Courant number = 50 initially, increase to 200",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Run Calculation"],
    }),

    sec("Residual & Monitor Setup", [
      "**Residual targets:** All < 1×10⁻⁴, energy < 1×10⁻⁶",
      "",
      "**Surface monitors:**",
      `- Drag coefficient (C_D) on ${bodyType} surface → Reports → Force → Drag`,
      isCylinder ? "- Lift coefficient (C_L) → Reports → Force → Lift" : "",
      heated ? `- Average Nusselt number on ${bodyType} surface` : "",
      `- Area-weighted average pressure on ${bodyType}`,
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Solution → Monitors → Surface Monitor → Create",
        "Results → Reports → Forces",
      ],
    }),

    sec("Post-Processing", [
      "**Contours:**",
      "- Velocity magnitude",
      "- Pressure coefficient",
      "- Streamlines around the body",
      !laminar ? "- Turbulent kinetic energy" : "",
      heated ? "- Temperature field" : "",
      "",
      "**XY Plots:**",
      isCylinder ? "- Pressure coefficient (Cp) vs angle around cylinder" : "- Cf along plate surface",
      "- Velocity profiles at several downstream stations",
      heated ? "- Local Nusselt number along surface" : "",
      "",
      "**Validation:**",
      isCylinder
        ? "- Compare C_D with experimental data (e.g., C_D ≈ 1.0 for Re ≈ 1000)"
        : "- Compare Cf with Blasius solution (laminar) or empirical correlations",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Plots → XY Plot"],
    }),

    sec("Sanity Checks", [
      "- Mass conservation: check Reports → Fluxes",
      `- Drag coefficient in expected range for Re and ${bodyType} shape`,
      isCylinder ? "- Separation point location consistent with Re" : "",
      "- Boundary layer thickness consistent with analytical estimates",
      heated ? "- Average Nu compared with correlations" : "",
      "- Far-field boundaries not affecting solution (velocity = freestream at boundaries)",
    ].filter(Boolean).join("\n")),

    sec("Common Errors & Troubleshooting", [
      "- **Reverse flow at outlet:** Extend downstream domain or use larger pressure outlet",
      "- **Asymmetric solution for symmetric problem:** Check mesh symmetry, try initializing with symmetry",
      "- **Drag coefficient too high/low:** Check domain size and mesh resolution",
      !laminar ? "- **y+ too high:** Refine near-wall mesh" : "",
      "- **Convergence issues:** Start with first-order, switch to second-order after 500 iterations",
    ].filter(Boolean).join("\n"), {
      tips: ["Save intermediate results — external flow problems can take many iterations"],
    }),
  ];
}

function templateNaturalConvection(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const radiation = hasRadiation(text);
  const isEnclosure = text.toLowerCase().includes("enclosure") || text.toLowerCase().includes("cavity");

  return [
    sec("Problem Summary", `Natural (free) convection ${isEnclosure ? "in an enclosure" : "along a heated surface"} — buoyancy-driven flow${radiation ? " with radiation" : ""}${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      "Natural convection is driven by buoyancy forces due to density differences caused by temperature gradients:",
      "- Boussinesq approximation: ρ ≈ ρ₀(1 - β(T - T₀))",
      "- Key dimensionless numbers: Rayleigh (Ra = Gr × Pr), Grashof (Gr), Prandtl (Pr)",
      "- Ra determines flow regime: Ra < 10⁹ → laminar, Ra > 10⁹ → turbulent",
      radiation ? "- Surface-to-surface or participating media radiation included" : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Boussinesq approximation valid (small temperature differences, β(T-T₀) << 1)",
      "- Incompressible flow",
      "- Gravity included in -y direction (g = 9.81 m/s²)",
      isEnclosure ? "- Enclosed domain with specified wall temperatures" : "- Open domain with far-field conditions",
      radiation ? "- Surface emissivity specified" : "- Radiation neglected",
    ].join("\n"), {
      warnings: ["Boussinesq approximation requires small ΔT. For large temperature differences, use ideal gas law instead."],
    }),

    sec("Required Inputs", [
      "- Hot wall temperature (Th) and cold wall temperature (Tc) or ambient temperature",
      isEnclosure ? "- Enclosure dimensions (H × W)" : "- Plate/surface height (L)",
      "- Fluid properties at reference temperature T_ref = (Th + Tc)/2",
      "- Thermal expansion coefficient (β) — for ideal gas: β = 1/T (in Kelvin)",
      radiation ? "- Surface emissivities" : "",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "Use properties evaluated at film temperature Tf = (Th + Tc)/2.",
      "",
      "**Critical: Enable Boussinesq model:**",
      "- Density: Set to Boussinesq",
      "- Enter reference density (ρ at Tf)",
      "- Enter thermal expansion coefficient β",
      "",
      "**Or use Ideal Gas for large ΔT:**",
      "- Density: Ideal Gas",
      "- Operating pressure: 101325 Pa",
    ].join("\n"), {
      fluentMenuPaths: [
        "Materials → Fluid → Properties → Density → Boussinesq",
        "Setup → General → Operating Conditions → Gravity → ON",
      ],
    }),

    sec("Geometry Guidance", [
      isEnclosure
        ? [
            "**Enclosure geometry:**",
            "- Create a rectangle: H (height) × W (width)",
            "- Left wall = hot, Right wall = cold (or as specified)",
            "- Top/Bottom = adiabatic (typically)",
          ].join("\n")
        : [
            "**Vertical plate in open domain:**",
            "- Plate height: L",
            "- Domain: extend 2-3L away from plate, 0.5L below, 1L above",
            "- Open boundaries at far-field for air entrainment",
          ].join("\n"),
    ].join("\n")),

    sec("Meshing Guidance", [
      "**Boundary layer mesh is critical for natural convection:**",
      "- Thermal boundary layer thickness ≈ L / (Ra^0.25)",
      "- Need 15-20 cells within the boundary layer",
      "- First cell height: BL thickness / 20",
      "- Growth ratio: 1.1",
      "",
      isEnclosure
        ? "- Refine near both hot and cold walls"
        : "- Refine near heated surface and any sharp edges",
      "",
      "**Total cells:** 20,000-100,000 for 2D",
    ].join("\n"), {
      warnings: ["Natural convection is very sensitive to mesh resolution near walls — under-resolved BL gives wrong heat transfer rates"],
    }),

    sec("Solver Setup", [
      "**General:**",
      "- Solver: Pressure-Based",
      `- Time: ${transient ? "Transient" : "Steady"}`,
      "- Gravity: ON → g_y = -9.81 m/s²",
      "",
      "**Models:**",
      "- Viscous: Laminar (if Ra < 10⁹) or k-epsilon with Enhanced Wall Treatment",
      "- Energy: ON (mandatory)",
      radiation ? "- Radiation: S2S (Surface-to-Surface) or DO (Discrete Ordinates)" : "",
      "",
      "**Operating Conditions:**",
      "- Operating Temperature: T_ref (film temperature)",
      "- Gravity: -9.81 m/s² in y-direction",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → General → Gravity → [0, -9.81, 0]",
        "Setup → Models → Energy → ON",
        "Setup → General → Operating Conditions",
      ],
    }),

    sec("Boundary Conditions", [
      "**Hot Wall:**",
      "- Type: Wall",
      "- Thermal: Constant Temperature → Th",
      radiation ? "- Emissivity: [specified value, e.g., 0.9]" : "",
      "",
      "**Cold Wall:**",
      "- Type: Wall",
      "- Thermal: Constant Temperature → Tc",
      radiation ? "- Emissivity: [specified value]" : "",
      "",
      isEnclosure
        ? "**Top/Bottom Walls:**\n- Type: Wall\n- Thermal: Adiabatic (heat flux = 0)"
        : "**Open Boundaries:**\n- Type: Pressure-Outlet\n- Gauge Pressure: 0\n- Backflow Temperature: T_ambient",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions"],
    }),

    sec("Solution Methods", [
      "**Scheme:** SIMPLE",
      "**Pressure-Velocity Coupling:** SIMPLE or Coupled (Coupled often better for natural convection)",
      "",
      "**Spatial Discretization:**",
      "- Pressure: PRESTO! (recommended for buoyancy-driven flows)",
      "- Momentum: Second Order Upwind (start with First Order if difficult)",
      "- Energy: Second Order Upwind",
      "",
      "**Body-Force Weighted pressure discretization is also acceptable.**",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
      tips: ["PRESTO! or Body-Force Weighted pressure interpolation is important for buoyancy flows — Standard scheme can give poor results"],
    }),

    sec("Initialization & Solution Strategy", [
      "**Initialize:** Hybrid initialization",
      "",
      "**Strategy:**",
      "1. Start with first-order upwind for all",
      "2. Run 200-500 iterations",
      "3. Switch to second-order upwind",
      `4. Run ${transient ? "with appropriate time step (Δt ≈ 1-10 s depending on Ra)" : "until converged (1000-3000 iterations)"}`,
      "",
      "**Under-Relaxation (if needed):**",
      "- Pressure: 0.3, Momentum: 0.5, Energy: 0.9",
      "- Body Forces: 0.5 (reduce if oscillating)",
    ].join("\n"), {
      warnings: ["Natural convection problems often converge slowly — be patient and monitor physical quantities"],
    }),

    sec("Post-Processing", [
      "**Contours:**",
      "- Temperature field",
      "- Velocity vectors / streamlines (show circulation patterns)",
      "- Stream function (if 2D)",
      "",
      "**Key Results:**",
      isEnclosure
        ? "- Average Nusselt number on hot wall: Nu = q″L/(k×ΔT)"
        : "- Local and average Nusselt number along heated surface",
      "- Maximum velocity in the domain",
      "- Temperature profiles at mid-height",
      "",
      "**Validation:**",
      isEnclosure
        ? "- Compare Nu with correlations (e.g., Berkovsky-Polevikov for enclosures)"
        : "- Compare with Churchill-Chu correlation for vertical plates",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Vectors"],
    }),

    sec("Sanity Checks", [
      "- Flow should rise along hot wall and descend along cold wall",
      "- Maximum velocity should be within thermal boundary layer",
      "- Temperature profiles should be smooth (no wiggles — mesh issue if present)",
      "- Heat flux on hot wall ≈ -heat flux on cold wall (energy conservation)",
      "- Nu number in expected range for Ra number",
    ].join("\n")),

    sec("Common Errors", [
      "- **No flow develops:** Check that gravity is ON and Boussinesq/ideal gas density is set",
      "- **Operating temperature wrong:** Must be set to reference temperature for Boussinesq",
      "- **Wiggly temperature contours:** Mesh too coarse near walls",
      "- **Energy imbalance:** Check adiabatic walls are truly adiabatic, refine mesh",
    ].join("\n")),
  ];
}

function templateForcedConvection(text: string): WorkflowSection[] {
  const laminar = isLaminar(text);
  const transient = isTransient(text);
  const regime = laminar ? "Laminar" : "Turbulent";

  return [
    sec("Problem Summary", `Forced convection heat transfer — ${regime} regime${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      "Forced convection involves heat transfer driven by an external flow field:",
      "- Energy equation coupled with momentum equations",
      "- Thermal boundary layer develops alongside velocity boundary layer",
      "- Key parameters: Re, Pr, Nu",
      `- ${laminar ? "Laminar thermal BL: δ_t/δ ≈ Pr^(-1/3)" : "Turbulent heat transfer enhanced by eddy diffusivity"}`,
    ].join("\n")),

    sec("Assumptions", [
      `- ${regime} flow regime`,
      "- Incompressible flow",
      "- Constant or temperature-dependent fluid properties",
      "- No radiation (unless specified)",
      "- No viscous dissipation (low-speed flow)",
    ].join("\n")),

    sec("Required Inputs", [
      "- Flow velocity or Reynolds number",
      "- Geometry dimensions",
      "- Wall thermal condition (constant T or constant q″)",
      "- Inlet temperature",
      "- Fluid properties (ρ, μ, cp, k)",
    ].join("\n")),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-omega SST or k-epsilon Realizable with Enhanced Wall Treatment"}`,
      "- Energy: ON",
      "",
      "**Materials:** Set all thermal properties (density, specific heat, thermal conductivity, viscosity)",
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Energy → ON",
        `Setup → Models → Viscous → ${laminar ? "Laminar" : "k-omega SST"}`,
      ],
    }),

    sec("Boundary Conditions", [
      "**Inlet:**",
      "- Velocity-Inlet with specified velocity and temperature",
      !laminar ? "- Turbulence: Intensity + Hydraulic Diameter" : "",
      "",
      "**Outlet:**",
      "- Pressure-Outlet, gauge pressure = 0",
      "",
      "**Heated Wall:**",
      "- Constant Temperature: T_wall, OR",
      "- Constant Heat Flux: q″ [W/m²]",
      "",
      "**Other Walls:** Adiabatic (zero heat flux)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions"],
    }),

    sec("Meshing Requirements", [
      "Adequate resolution of both velocity and thermal boundary layers:",
      `- First cell height: ${laminar ? "ensure 15-20 cells across BL" : "y+ ≈ 1"}`,
      "- Growth ratio: 1.1-1.15",
      "- Refine near heated walls especially",
      "",
      "For Pr >> 1 (oils): thermal BL thinner than velocity BL — mesh for thermal BL",
      "For Pr << 1 (liquid metals): thermal BL thicker — mesh for velocity BL is sufficient",
    ].join("\n")),

    sec("Solution Methods & Strategy", [
      "**Scheme:** SIMPLE or Coupled",
      "- Pressure: Second Order",
      "- All other: Second Order Upwind",
      "",
      "**Strategy:**",
      "1. Initialize with Hybrid method",
      "2. First-order for 200 iterations",
      "3. Switch to second-order until converged",
      "",
      "**Convergence:**",
      "- Residuals: continuity/momentum < 10⁻⁴, energy < 10⁻⁶",
      "- Monitor outlet temperature and wall heat flux",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Methods", "Solution → Run Calculation"],
    }),

    sec("Post-Processing", [
      "**Contours:** Temperature, velocity, " + (laminar ? "" : "turbulent kinetic energy"),
      "",
      "**XY Plots:**",
      "- Temperature profile at various x-stations",
      "- Local heat transfer coefficient along heated wall",
      "- Local Nusselt number: Nu_x = h_x × x / k",
      "",
      "**Key Results:**",
      "- Average heat transfer coefficient",
      "- Average Nusselt number",
      "- Outlet bulk temperature: verify with energy balance T_out = T_in + q/(ṁcp)",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Plots → XY Plot"],
    }),

    sec("Validation", [
      "Compare with analytical/empirical correlations:",
      laminar
        ? "- Flat plate: Nu_x = 0.332 Re_x^0.5 Pr^(1/3)\n- Pipe: Nu = 3.66 (const T) or 4.36 (const q)"
        : "- Flat plate: Nu_x = 0.0296 Re_x^0.8 Pr^(1/3)\n- Pipe: Dittus-Boelter Nu = 0.023 Re^0.8 Pr^0.4",
      "",
      "Energy balance: total heat input = ṁ × cp × (T_out - T_in)",
    ].join("\n")),

    sec("Common Errors", [
      "- Energy equation not turned ON — no temperature variation",
      "- Wrong thermal boundary condition type",
      "- Insufficient mesh near heated wall — inaccurate Nu",
      !laminar ? "- y+ too high for chosen wall treatment" : "",
      "- Fluid properties not matching the working fluid",
    ].filter(Boolean).join("\n")),
  ];
}

function templateConjugateHeatTransfer(text: string): WorkflowSection[] {
  const laminar = isLaminar(text);
  const transient = isTransient(text);

  return [
    sec("Problem Summary", `Conjugate heat transfer — coupled solid-fluid thermal analysis${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      "Conjugate heat transfer couples:",
      "- Fluid: Navier-Stokes + energy equation (convection + conduction)",
      "- Solid: Heat conduction equation (∇²T = 0 for steady, ρcp ∂T/∂t = k∇²T for transient)",
      "- Interface: continuous temperature and heat flux at solid-fluid boundary",
      "",
      "The heat transfer coefficient is NOT specified — it is computed as part of the solution.",
    ].join("\n"), {
      tips: ["In conjugate problems, you don't prescribe h — Fluent calculates it from the coupled solution"],
    }),

    sec("Assumptions", [
      "- Solid is opaque and stationary",
      "- Perfect thermal contact at solid-fluid interface",
      "- No contact resistance (unless modeled with thin wall)",
      `- ${laminar ? "Laminar" : "Turbulent"} flow in fluid region`,
    ].join("\n")),

    sec("Required Inputs", [
      "- Solid geometry and material (thermal conductivity, density, specific heat)",
      "- Fluid geometry and material properties",
      "- Heat source: volumetric heat generation in solid, or heated boundary",
      "- Flow conditions: inlet velocity and temperature",
    ].join("\n")),

    sec("Geometry & Meshing", [
      "**Geometry:**",
      "- Create separate solid and fluid regions",
      "- Ensure shared interface between solid and fluid domains",
      "- In Fluent, use Cell Zone Conditions to assign solid/fluid materials",
      "",
      "**Meshing:**",
      "- Conformal mesh at solid-fluid interface (shared nodes)",
      "- Fine mesh near interface on both sides",
      `- Fluid side: ${laminar ? "resolve velocity BL" : "y+ ≈ 1 at interface"}`,
      "- Solid side: adequate resolution for temperature gradients",
      "- Solid mesh can be coarser if conductivity is high (uniform T)",
    ].join("\n"), {
      fluentMenuPaths: ["Setup → Cell Zone Conditions"],
      warnings: ["Non-conformal interface requires explicit interface creation — conformal is easier and more accurate"],
    }),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-omega SST"}`,
      "- Energy: ON",
      "",
      "**Materials:**",
      "- Create/assign solid material (e.g., aluminum: k=202 W/m·K, ρ=2719 kg/m³, cp=871 J/kg·K)",
      "- Create/assign fluid material",
      "",
      "**Cell Zone Conditions:**",
      "- Mark solid regions as 'Solid'",
      "- Set material for each zone",
      "- Add volumetric heat source if applicable",
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Energy → ON",
        "Setup → Cell Zone Conditions → [zone] → Type: Solid",
        "Setup → Cell Zone Conditions → [zone] → Source Terms",
      ],
    }),

    sec("Boundary Conditions", [
      "**Fluid Inlet:** Velocity-Inlet with temperature",
      "**Fluid Outlet:** Pressure-Outlet",
      "**Solid-Fluid Interface:** Coupled wall (automatic — just ensure matching faces)",
      "**External solid boundaries:** Adiabatic, constant T, or convection BC",
      "- For convection BC: specify external h and T_ambient",
    ].join("\n")),

    sec("Solution Strategy", [
      "1. Hybrid initialization",
      "2. Run with first-order upwind initially",
      "3. Switch to second-order after 200-500 iterations",
      "",
      "**Monitors:**",
      "- Maximum temperature in solid",
      "- Interface heat flux",
      "- Outlet fluid temperature",
      "",
      "**Convergence:** energy residual < 10⁻⁶, others < 10⁻⁴",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Run Calculation"],
    }),

    sec("Post-Processing", [
      "**Contours:** Temperature across both domains (solid + fluid), velocity in fluid",
      "**Vectors:** Flow field near solid surfaces",
      "**XY Plots:** Temperature along solid-fluid interface",
      "",
      "**Key Results:**",
      "- Maximum solid temperature and its location",
      "- Heat transfer rate at interface",
      "- Effective heat transfer coefficient: h = q″ / (T_surface - T_fluid)",
      "- Thermal resistance: R = ΔT / Q",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Reports → Surface Integrals"],
    }),

    sec("Sanity Checks & Common Errors", [
      "**Checks:**",
      "- Heat generated in solid = heat removed by fluid (energy balance)",
      "- Temperature continuous across interface (no jumps)",
      "- Solid temperature > fluid temperature if solid is heat source",
      "",
      "**Common Errors:**",
      "- Solid zone not marked as solid — Fluent tries to solve flow in it",
      "- Interface not properly coupled — shows temperature discontinuity",
      "- Volumetric heat source units wrong (W/m³, not W)",
      "- Missing solid material properties",
    ].join("\n"), {
      warnings: ["Always verify solid zones are correctly set as 'Solid' in Cell Zone Conditions"],
    }),
  ];
}

function templateHeatExchanger(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const isCounterFlow = text.toLowerCase().includes("counter") || text.toLowerCase().includes("counterflow");
  const isParallelFlow = text.toLowerCase().includes("parallel flow");
  const flowConfig = isCounterFlow ? "counter-flow" : isParallelFlow ? "parallel-flow" : "counter-flow";

  return [
    sec("Problem Summary", `Heat exchanger analysis — ${flowConfig} configuration${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      "Heat exchanger involves two fluid streams exchanging thermal energy:",
      "- Hot fluid transfers heat to cold fluid through separating wall",
      "- Overall heat transfer: Q = U × A × LMTD",
      `- Configuration: ${flowConfig} (${isCounterFlow ? "most efficient" : isParallelFlow ? "less efficient but simpler" : "check problem statement"})`,
      "",
      "Key parameters: LMTD, effectiveness (ε), NTU, overall heat transfer coefficient (U)",
    ].join("\n")),

    sec("Required Inputs", [
      "- Hot fluid: inlet temperature, flow rate, properties",
      "- Cold fluid: inlet temperature, flow rate, properties",
      "- Tube/shell dimensions (diameter, length, wall thickness)",
      "- Wall material and thermal conductivity",
      "- Number of tubes (if shell-and-tube)",
    ].join("\n")),

    sec("Geometry Guidance", [
      "**Simple double-pipe HX (2D axisymmetric):**",
      "- Inner tube: fluid 1 flows inside",
      "- Annular region: fluid 2 flows outside",
      "- Separating wall: solid region between",
      "",
      "**Shell-and-tube (3D — simplified):**",
      "- Model single tube with periodic boundaries",
      "- Or model full sector with symmetry",
      "",
      `**Flow direction:** ${isCounterFlow ? "Fluids flow in opposite directions" : isParallelFlow ? "Fluids flow in same direction" : "Set up per problem statement"}`,
    ].join("\n"), {
      tips: ["Start with 2D axisymmetric for double-pipe — much faster than 3D"],
    }),

    sec("Meshing", [
      "- Fine mesh near tube walls (both sides)",
      "- Resolve thermal boundary layers in both fluid streams",
      "- Solid wall: at least 3-5 cells across thickness",
      "- Conformal mesh at solid-fluid interfaces",
      "- Axial direction: uniform spacing adequate",
    ].join("\n")),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "**Energy:** ON",
      "**Viscous:** Depends on Re — likely turbulent for industrial HX",
      "",
      "**Cell Zone Conditions:**",
      "- Inner fluid zone: fluid material (e.g., water)",
      "- Outer fluid zone: fluid material (could be different fluid)",
      "- Wall zone: solid material (e.g., steel, copper)",
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Energy → ON",
        "Setup → Cell Zone Conditions",
      ],
    }),

    sec("Boundary Conditions", [
      "**Hot fluid inlet:** Velocity-Inlet, T_hot_in, flow rate",
      `**Hot fluid outlet:** Pressure-Outlet (at ${isCounterFlow ? "opposite end" : "same end"} as cold inlet)`,
      "**Cold fluid inlet:** Velocity-Inlet, T_cold_in, flow rate",
      `**Cold fluid outlet:** Pressure-Outlet`,
      "**Tube wall:** Coupled (automatic at solid-fluid interfaces)",
      "**Outer wall:** Adiabatic (insulated) or specify heat loss",
    ].join("\n")),

    sec("Solution & Post-Processing", [
      "**Run** with second-order upwind, monitor outlet temperatures of both streams.",
      "",
      "**Key Results:**",
      "- Hot fluid outlet temperature",
      "- Cold fluid outlet temperature",
      "- Total heat transfer rate: Q = ṁ_h × cp_h × (T_h,in - T_h,out)",
      "- Verify: Q_hot = Q_cold (energy balance)",
      "- Overall heat transfer coefficient U from Q = U × A × LMTD",
      "- Effectiveness: ε = Q / Q_max",
      "",
      "**Contours:** Temperature in both fluids and wall",
      "**XY Plot:** Bulk temperature of each fluid along HX length",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Reports → Surface Integrals"],
    }),

    sec("Validation", [
      "- Energy balance: heat lost by hot fluid = heat gained by cold fluid",
      "- Compare computed U with textbook correlations",
      "- LMTD method: Q_analytical = U × A × LMTD — compare with Fluent result",
      "- ε-NTU method: check effectiveness against charts for given geometry",
    ].join("\n")),

    sec("Common Errors", [
      "- Flow direction wrong for counter-flow — double check inlet/outlet positions",
      "- Forgetting to set wall zone as solid with appropriate conductivity",
      "- Outer boundary not insulated — heat leaking out",
      "- Wrong fluid assigned to wrong zone",
      "- Not checking energy balance between the two streams",
    ].join("\n")),
  ];
}

function templateLidDrivenCavity(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const heated = hasHeating(text);
  const laminar = isLaminar(text);
  const re = extractNumber(text, "re", 0) || extractNumber(text, "reynolds", 1000);

  return [
    sec("Problem Summary", `Lid-driven cavity flow — Re = ${re || "[from problem]"}, ${laminar ? "laminar" : "turbulent"}${heated ? " with heat transfer" : ""}${transient ? ", transient" : ", steady-state"}. Classic CFD benchmark problem.`),

    sec("Governing Physics", [
      "The lid-driven cavity is a fundamental benchmark in CFD:",
      "- Square cavity with one moving wall (lid) at constant velocity",
      "- Other three walls are stationary (no-slip)",
      "- Primary vortex forms in center, secondary corner vortices at higher Re",
      "- Well-documented reference results (Ghia et al., 1982)",
      heated ? "- With differential heating: natural + forced convection (mixed convection)" : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- 2D flow (infinite cavity in z-direction)",
      "- Incompressible, Newtonian fluid",
      `- ${laminar ? "Laminar" : "Turbulent"} flow (Re = ${re || "[specified]"})`,
      "- Cavity dimensions: L × L (square)",
      heated ? "- Boussinesq approximation for buoyancy if vertical walls heated" : "",
    ].filter(Boolean).join("\n")),

    sec("Required Inputs", [
      "- Cavity side length: L",
      "- Lid velocity: U (or Reynolds number → U = Re × μ / (ρ × L))",
      "- Fluid properties: ρ, μ (choose to match target Re)",
      heated ? "- Wall temperatures (which walls are hot/cold)" : "",
    ].filter(Boolean).join("\n"), {
      tips: ["You can choose convenient fluid properties. E.g., set ρ=1, μ=1/Re, U=1, L=1 to get desired Re directly."],
    }),

    sec("Geometry", [
      "- Simple square: L × L",
      "- No need for far-field or inlet/outlet boundaries",
      "- All boundaries are walls",
    ].join("\n")),

    sec("Meshing", [
      "**Uniform structured mesh:**",
      re <= 1000
        ? "- 81×81 or 129×129 quad mesh for Re ≤ 1000"
        : "- 129×129 or 257×257 for Re > 1000",
      "- Non-uniform: cluster cells near walls (growth ratio 1.05-1.1)",
      "- Uniform mesh is acceptable for this benchmark",
      "",
      "**Quality:** All quads, orthogonal quality = 1.0 for uniform grid",
    ].join("\n")),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      `- Viscous: ${laminar || re <= 1000 ? "Laminar" : "Laminar (even at moderate Re — DNS approach) or k-omega SST"}`,
      heated ? "- Energy: ON" : "",
      heated ? "- Gravity: ON if buoyancy-driven component" : "",
      "",
      "**Materials:** Set ρ and μ to achieve target Re = ρUL/μ",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → General", "Setup → Models → Viscous"],
    }),

    sec("Boundary Conditions", [
      "**Top Wall (Lid):**",
      "- Type: Wall",
      "- Moving Wall → Translational → U in x-direction",
      heated ? "- Thermal: adiabatic or as specified" : "",
      "",
      "**Bottom Wall:**",
      "- Type: Wall, No-Slip, Stationary",
      "",
      "**Left & Right Walls:**",
      "- Type: Wall, No-Slip, Stationary",
      heated ? "- Left: T_hot, Right: T_cold (or as specified)" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions → Wall → Moving Wall"],
      warnings: ["Set lid velocity as a MOVING WALL condition, not as a velocity inlet"],
    }),

    sec("Solution Methods", [
      "**Scheme:** SIMPLE or Coupled",
      "- Pressure: Second Order",
      "- Momentum: Second Order Upwind or QUICK",
      heated ? "- Energy: Second Order Upwind" : "",
      "",
      `**Iterations:** ${re <= 400 ? "500-1000" : re <= 1000 ? "2000-5000" : "5000-10000"}`,
      "- Higher Re requires more iterations",
    ].filter(Boolean).join("\n")),

    sec("Post-Processing & Validation", [
      "**Contours:** Velocity magnitude, stream function, pressure",
      "**Vectors:** Velocity vectors showing vortex structure",
      "**Streamlines:** Show primary and secondary vortices",
      "",
      "**Validation against Ghia et al. (1982):**",
      "- Plot u-velocity along vertical centerline (x = L/2)",
      "- Plot v-velocity along horizontal centerline (y = L/2)",
      "- Compare with published data points",
      "",
      "**Expected features:**",
      "- Primary vortex in cavity center (slightly offset toward lid)",
      re >= 400 ? "- Bottom corner vortices visible" : "- Minimal secondary vortices at this Re",
      re >= 1000 ? "- Secondary vortex in bottom-right corner" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Contours", "Results → Plots → XY Plot"],
      tips: ["The Ghia et al. data is the gold standard — your centerline velocity profiles should match closely"],
    }),

    sec("Common Errors", [
      "- Lid velocity applied as inlet instead of moving wall",
      "- Corner singularity causing convergence issues — this is expected, don't worry",
      "- Mesh too coarse — primary vortex center location will be wrong",
      "- Forgetting that the velocity is zero at the side walls where they meet the lid (singularity)",
    ].join("\n")),
  ];
}

function templateBackwardFacingStep(text: string): WorkflowSection[] {
  const laminar = isLaminar(text);
  const heated = hasHeating(text);
  const transient = isTransient(text);
  const expansionRatio = extractNumber(text, "expansion ratio", 2);

  return [
    sec("Problem Summary", `Backward-facing step flow — ${laminar ? "laminar" : "turbulent"}, expansion ratio = ${expansionRatio}${heated ? ", with heat transfer" : ""}. Classic CFD benchmark for separated flows.`),

    sec("Governing Physics", [
      "Flow separates at the step edge and reattaches downstream:",
      "- Separation at step corner (fixed separation point)",
      "- Recirculation zone behind the step",
      "- Reattachment point downstream (key result to predict)",
      !laminar ? "- Turbulent mixing in shear layer" : "",
      heated ? "- Heat transfer enhanced near reattachment point" : "",
      "",
      `Expansion ratio: H_outlet / H_inlet = ${expansionRatio}`,
    ].filter(Boolean).join("\n")),

    sec("Required Inputs", [
      "- Step height (h)",
      "- Inlet channel height (H_inlet) → H_outlet = H_inlet + h",
      "- Inlet velocity or Reynolds number (based on step height: Re_h = U × h / ν)",
      "- Channel length upstream (5-10 × H_inlet) and downstream (20-30 × h)",
      heated ? "- Heated wall temperature or heat flux" : "",
    ].filter(Boolean).join("\n")),

    sec("Geometry", [
      "**2D geometry:**",
      "- Upstream channel: height = H_inlet, length = 5-10 × H_inlet",
      "- Step: sudden expansion at downstream end of inlet",
      "- Downstream channel: height = H_outlet = H_inlet + h, length = 30h minimum",
      "",
      "The step is on the bottom wall (typically).",
    ].join("\n"), {
      tips: ["Make downstream section long enough (30×h) to capture full reattachment and recovery"],
    }),

    sec("Meshing", [
      "**Critical regions:**",
      "- Fine mesh near step corner (separation point)",
      "- Fine mesh along bottom wall downstream (reattachment zone)",
      "- Refine in shear layer region",
      "",
      `- First cell height: ${laminar ? "h/50" : "y+ ≈ 1 at walls"}`,
      "- Growth ratio: 1.1-1.15",
      "- Cluster cells in reattachment region (5-15h downstream of step)",
      "",
      `**Total cells:** ${laminar ? "10,000-40,000" : "40,000-150,000"}`,
    ].join("\n"), {
      warnings: ["Inadequate mesh near step corner will give wrong reattachment length"],
    }),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-omega SST (best for separated flows) or k-epsilon Realizable"}`,
      heated ? "- Energy: ON" : "",
      "",
      "Set inlet as fully developed channel flow profile (parabolic for laminar).",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → General", "Setup → Models → Viscous"],
      tips: ["k-omega SST performs better than k-epsilon for flows with separation and reattachment"],
    }),

    sec("Boundary Conditions", [
      "**Inlet:**",
      "- Velocity-Inlet with uniform or parabolic profile",
      "- For fully developed inlet: use a separate simulation or UDF for parabolic profile",
      !laminar ? "- Turbulent Intensity: 2-5%, Hydraulic Diameter: 2 × H_inlet" : "",
      heated ? "- Temperature: T_inlet" : "",
      "",
      "**Outlet:**",
      "- Pressure-Outlet, gauge pressure = 0",
      "- Place far downstream where flow is fully recovered",
      "",
      "**Top Wall:** No-slip, stationary" + (heated ? ", adiabatic" : ""),
      "**Bottom Wall (downstream of step):** No-slip" + (heated ? ", constant T or heat flux" : ""),
      "**Step Face:** No-slip wall",
    ].filter(Boolean).join("\n")),

    sec("Solution Methods & Strategy", [
      "**Scheme:** Coupled (recommended) or SIMPLE",
      "**Discretization:** Second Order Upwind for all",
      "",
      "**Strategy:**",
      "1. Hybrid initialization",
      "2. First-order upwind for 300-500 iterations",
      "3. Switch to second-order",
      `4. Run for ${laminar ? "1000-2000" : "3000-5000"} total iterations`,
      "",
      "**Monitor:** Wall shear stress along bottom wall (reattachment = where τ_w crosses zero)",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Methods", "Solution → Run Calculation"],
    }),

    sec("Post-Processing", [
      "**Key Result: Reattachment Length**",
      "- Plot wall shear stress (skin friction) along bottom wall",
      "- Reattachment point = where wall shear stress changes sign (τ_w = 0)",
      `- Express as x_r / h (normalized by step height)`,
      `- Expected: ${laminar ? "x_r/h ≈ 5-7 for laminar Re ~ 200-400" : "x_r/h ≈ 6-7 for turbulent Re ~ 30,000-50,000"}`,
      "",
      "**Contours:** Velocity, pressure, streamlines showing recirculation",
      "**XY Plots:**",
      "- Velocity profiles at several x-stations (x/h = 1, 3, 5, 7, 10, 15)",
      "- Skin friction coefficient along bottom wall",
      heated ? "- Local Nusselt number along bottom wall (peaks near reattachment)" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Plots → XY Plot → Wall Shear Stress"],
    }),

    sec("Validation", [
      "Compare with experimental/benchmark data:",
      laminar
        ? "- Armaly et al. (1983) — laminar BFS experimental data"
        : "- Driver & Seegmiller (1985) — turbulent BFS",
      "- Reattachment length should match published values for your Re",
      "- Velocity profiles at downstream stations should match",
    ].join("\n")),

    sec("Common Errors", [
      "- Downstream domain too short — flow not fully recovered at outlet, affects reattachment",
      "- Outlet placed at reattachment zone — causes incorrect results",
      "- Reverse flow warnings at outlet — extend domain",
      !laminar ? "- Wrong turbulence model — k-omega SST is preferred for separated flows" : "",
      "- Mesh not refined enough near step corner and reattachment zone",
      "- Inlet profile not fully developed — affects reattachment length",
    ].filter(Boolean).join("\n")),
  ];
}

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

const TEMPLATES: Record<Exclude<ProblemType, "unknown">, (text: string) => WorkflowSection[]> = {
  "pipe-flow": templatePipeFlow,
  "external-flow": templateExternalFlow,
  "natural-convection": templateNaturalConvection,
  "forced-convection": templateForcedConvection,
  "conjugate-heat-transfer": templateConjugateHeatTransfer,
  "heat-exchanger": templateHeatExchanger,
  "lid-driven-cavity": templateLidDrivenCavity,
  "backward-facing-step": templateBackwardFacingStep,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function analyzeWorkflow(text: string, revisionPrompt?: string, originalText?: string): WorkflowOutput {
  sectionCounter = 0;

  let combinedText = text;
  if (revisionPrompt && originalText) {
    combinedText = applyRevisionOverrides(revisionPrompt, originalText);
  }

  const detection = detectProblemType(combinedText);

  if (detection.type === "unknown") {
    return {
      problemType: "unknown",
      problemTypeLabel: "Unknown Problem Type",
      confidence: 0,
      sections: [
        sec("Unable to Detect Problem Type", [
          "The analyzer could not confidently identify your problem type. Please try:",
          "",
          "- Including keywords like: pipe flow, external flow, natural convection, heat exchanger, lid-driven cavity, backward-facing step",
          "- Describing the geometry (pipe, cylinder, plate, enclosure)",
          "- Mentioning the physics (buoyancy, forced convection, conjugate heat transfer)",
          "",
          "**Supported problem types:**",
          "1. Internal Pipe Flow",
          "2. External Flow Over Bodies",
          "3. Natural Convection",
          "4. Forced Convection Heat Transfer",
          "5. Conjugate Heat Transfer",
          "6. Heat Exchanger Analysis",
          "7. Lid-Driven Cavity Flow",
          "8. Backward-Facing Step Flow",
        ].join("\n")),
      ],
    };
  }

  const templateFn = TEMPLATES[detection.type];
  const sections = templateFn(combinedText);

  return {
    problemType: detection.type,
    problemTypeLabel: detection.label,
    confidence: detection.confidence,
    sections,
  };
}
