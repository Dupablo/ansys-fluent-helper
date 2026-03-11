import { ProblemType, WorkflowOutput, WorkflowSection, ClarificationQuestion, PreAnalysis } from "./types";

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
  "conduction": [
    "conduction", "heat conduction", "thermal conduction", "solid conduction",
    "fourier", "fourier's law", "thermal conductivity", "composite wall",
    "multilayer", "multi-layer", "insulation", "steady conduction",
    "transient conduction", "lumped capacitance", "biot number",
    "thermal resistance", "contact resistance", "heat generation",
    "temperature distribution", "1d conduction", "2d conduction", "3d conduction",
    "radial conduction", "spherical conduction", "cylindrical conduction",
  ],
  "radiation": [
    "radiation", "radiative", "radiative heat transfer", "thermal radiation",
    "emissivity", "absorptivity", "stefan-boltzmann", "stefan boltzmann",
    "view factor", "shape factor", "configuration factor",
    "blackbody", "black body", "gray body", "grey body",
    "surface to surface", "surface-to-surface", "s2s",
    "discrete ordinates", "do model", "p1 model", "p-1",
    "participating media", "absorption coefficient", "scattering",
    "enclosure radiation", "radiosity", "irradiation",
    "optically thick", "optically thin",
  ],
  "fin-heat-transfer": [
    "fin", "fins", "extended surface", "extended surfaces",
    "fin efficiency", "fin effectiveness", "fin array",
    "rectangular fin", "annular fin", "pin fin", "spine",
    "fin tip", "fin base", "fin length", "fin thickness",
    "heat sink", "finned surface", "finned tube",
    "cylindrical fin", "tapered fin", "triangular fin",
    "fin performance", "fin parameter",
  ],
  "porous-media": [
    "porous", "porous media", "porous medium", "porous zone",
    "packed bed", "packed column", "porous plate",
    "permeability", "porosity", "darcy", "forchheimer",
    "darcy-forchheimer", "inertial resistance", "viscous resistance",
    "filter", "filtration", "catalytic converter", "catalyst bed",
    "porous baffle", "porous jump", "pebble bed",
    "superficial velocity", "interstitial velocity",
    "ergun equation", "kozeny-carman",
  ],
  "boiling-condensation": [
    "boiling", "condensation", "phase change", "two-phase",
    "two phase", "evaporation", "vaporization",
    "nucleate boiling", "film boiling", "pool boiling", "flow boiling",
    "film condensation", "dropwise condensation",
    "melting", "solidification", "freezing",
    "latent heat", "heat of vaporization", "saturation temperature",
    "vapor", "vapour", "bubble", "void fraction",
    "volume of fluid", "vof", "lee model", "mixture model",
    "multiphase", "liquid-vapor", "liquid-vapour",
  ],
  "compressible-flow": [
    "compressible", "compressible flow", "supersonic", "transonic",
    "mach number", "mach", "shock", "shock wave", "shock tube",
    "nozzle", "converging-diverging", "convergent-divergent", "de laval",
    "choked flow", "critical pressure", "isentropic",
    "normal shock", "oblique shock", "expansion fan",
    "prandtl-meyer", "fanno flow", "rayleigh flow",
    "density-based", "density based solver",
    "jet", "supersonic jet", "underexpanded", "overexpanded",
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
  "conduction": "Heat Conduction",
  "radiation": "Radiation Heat Transfer",
  "fin-heat-transfer": "Fin & Extended Surface Heat Transfer",
  "porous-media": "Porous Media Flow",
  "boiling-condensation": "Boiling & Condensation (Phase Change)",
  "compressible-flow": "Compressible / Supersonic Flow",
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

function templateConduction(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const lower = text.toLowerCase();
  const isComposite = lower.includes("composite") || lower.includes("multilayer") || lower.includes("multi-layer") || lower.includes("layered");
  const is2D = lower.includes("2d") || lower.includes("2-d") || lower.includes("two-dimensional");
  const is3D = lower.includes("3d") || lower.includes("3-d") || lower.includes("three-dimensional");
  const hasGeneration = lower.includes("heat generation") || lower.includes("heat source") || lower.includes("internal generation");
  const isCylindrical = lower.includes("cylinder") || lower.includes("cylindrical") || lower.includes("radial");
  const isSpherical = lower.includes("sphere") || lower.includes("spherical");
  const geometry = isSpherical ? "spherical" : isCylindrical ? "cylindrical" : "planar";

  return [
    sec("Problem Summary", `Pure heat conduction in a ${geometry} solid — ${isComposite ? "composite/multilayer, " : ""}${hasGeneration ? "with internal heat generation, " : ""}${transient ? "transient" : "steady-state"}${is2D ? ", 2D" : is3D ? ", 3D" : ""}.`),

    sec("Governing Physics", [
      "Heat conduction in solids governed by Fourier's law and the heat equation:",
      `- Steady-state: ∇·(k∇T)${hasGeneration ? " + q̇ₘₑₙ" : ""} = 0`,
      transient ? `- Transient: ρcₚ ∂T/∂t = ∇·(k∇T)${hasGeneration ? " + q̇ₘₑₙ" : ""}` : "",
      "",
      isCylindrical ? "- Cylindrical coordinates: (1/r)∂/∂r(kr ∂T/∂r) for radial conduction" : "",
      isSpherical ? "- Spherical coordinates: (1/r²)∂/∂r(kr² ∂T/∂r) for radial conduction" : "",
      isComposite ? "- Thermal resistance in series: R_total = ΣR_i = Σ(L_i / k_i A) for planar walls" : "",
      "- Key parameters: thermal conductivity (k), Biot number (Bi = hL/k) for convection BCs",
      transient ? "- Fourier number: Fo = αt/L² (dimensionless time)" : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- No fluid flow — pure conduction problem",
      isComposite ? "- Perfect thermal contact between layers (no contact resistance, unless specified)" : "- Homogeneous solid material",
      `- ${transient ? "Transient: uniform initial temperature distribution (unless specified)" : "Steady-state conditions"}`,
      "- Constant thermal properties (unless temperature-dependent)",
      hasGeneration ? "- Uniform volumetric heat generation (unless spatially varying)" : "",
      "- No radiation (unless specified at surfaces)",
    ].filter(Boolean).join("\n")),

    sec("Required Inputs", [
      "Before starting, gather:",
      `- Geometry dimensions (${isCylindrical ? "inner/outer radius, length" : isSpherical ? "inner/outer radius" : "wall thickness, height, width"})`,
      isComposite ? "- Layer thicknesses and individual material properties" : "- Solid material thermal properties (k, ρ, cₚ)",
      "- Boundary conditions at each surface (temperature, heat flux, or convection h + T∞)",
      hasGeneration ? "- Volumetric heat generation rate q̇ [W/m³]" : "",
      transient ? "- Initial temperature distribution T(x,0)" : "",
      transient ? "- Time duration of interest" : "",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "Set solid material properties in Fluent:",
      "",
      "**Common solids:**",
      "- Aluminum: k = 202 W/(m·K), ρ = 2719 kg/m³, cₚ = 871 J/(kg·K)",
      "- Steel (AISI 1010): k = 63.9 W/(m·K), ρ = 7832 kg/m³, cₚ = 434 J/(kg·K)",
      "- Copper: k = 387 W/(m·K), ρ = 8978 kg/m³, cₚ = 381 J/(kg·K)",
      "- Brick: k = 0.72 W/(m·K), ρ = 1920 kg/m³, cₚ = 835 J/(kg·K)",
      "- Glass wool insulation: k = 0.038 W/(m·K), ρ = 32 kg/m³, cₚ = 835 J/(kg·K)",
      "",
      isComposite ? "For composite walls, create a separate material for each layer." : "",
      "If temperature-dependent k is needed, use piecewise-linear or polynomial input.",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Materials → Solid → Create/Edit",
        "Materials → Solid → Properties → Thermal Conductivity",
      ],
    }),

    sec("Geometry Guidance", [
      `**${geometry.charAt(0).toUpperCase() + geometry.slice(1)} conduction geometry:**`,
      "",
      isCylindrical ? [
        "- 2D axisymmetric: model cross-section (rectangle with r_inner to r_outer on x-axis, length on y-axis)",
        "- Bottom edge = axis of symmetry",
        isComposite ? "- Create separate regions for each cylindrical layer" : "",
      ].filter(Boolean).join("\n") : isSpherical ? [
        "- 2D axisymmetric: model as a wedge/sector from r_inner to r_outer",
        "- Use axisymmetric with angular span",
        isComposite ? "- Create concentric shells for each layer" : "",
      ].filter(Boolean).join("\n") : [
        "- 1D/2D: create a rectangle with thickness in x-direction",
        isComposite ? "- Stack rectangles for each layer, sharing edges at interfaces" : "",
        is2D ? "- Include full 2D cross-section for multi-dimensional effects" : "",
      ].filter(Boolean).join("\n"),
      "",
      "Ensure geometry is clean with shared edges at material interfaces for conformal meshing.",
    ].join("\n"), {
      tips: [
        "For 1D conduction, a simple rectangle is sufficient — mesh only in the thickness direction",
        isComposite ? "Use Named Selections for each layer's cell zone for easy material assignment" : "",
      ].filter(Boolean),
    }),

    sec("Meshing Guidance", [
      "**Structured mesh recommended for conduction problems:**",
      `- Through-thickness: ${isComposite ? "at least 10-20 cells per layer" : "at least 20-40 cells"}`,
      "- Use bias/inflation near surfaces with convection BCs (gradient is steepest there)",
      "- Growth ratio: 1.05-1.1",
      "",
      isComposite ? "- Ensure conformal mesh at material interfaces (shared topology)" : "",
      transient ? "- Finer mesh needed for transient problems to resolve thermal waves" : "",
      "",
      `**Total cells:** ${is3D ? "50,000-500,000" : "500-10,000 (2D), much fewer for 1D"}`,
      "",
      "**Quality:**",
      "- Orthogonal quality > 0.9 (easy for structured mesh)",
      "- Conduction-only problems are very mesh-forgiving — coarser meshes work well",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Mesh → Check"],
      tips: ["Conduction problems converge easily even on coarse meshes — start coarse and refine if needed"],
    }),

    sec("Solver Setup", [
      "**General Settings:**",
      "- Solver Type: Pressure-Based (even for solid-only — Fluent requires it)",
      `- Time: ${transient ? "Transient" : "Steady"}`,
      "",
      "**Models:**",
      "- Energy: ON (mandatory)",
      "- Viscous: OFF / Laminar (no flow equations solved)",
      "",
      "**Cell Zone Conditions:**",
      "- Set ALL zones as Solid",
      "- Assign correct material to each zone",
      hasGeneration ? "- Source Terms → Energy → specify volumetric heat generation [W/m³]" : "",
      "",
      "**IMPORTANT:** Since there is no fluid flow, you may suppress the flow equations:",
      "- In Solution → Controls: set flow Courant number to 0 or disable momentum equations",
      "- Or simply accept that Fluent will solve trivial flow equations (they converge instantly)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Energy → ON",
        "Setup → Cell Zone Conditions → [zone] → Type: Solid",
        ...(hasGeneration ? ["Setup → Cell Zone Conditions → [zone] → Source Terms → Energy"] : []),
      ],
      warnings: ["All cell zones MUST be set to Solid — if left as Fluid, Fluent will try to solve Navier-Stokes"],
    }),

    sec("Boundary Conditions", [
      "Set thermal boundary conditions on each surface:",
      "",
      "**Option 1 — Constant Temperature (Dirichlet):**",
      "- Wall → Thermal → Temperature → specify T [K or °C]",
      "",
      "**Option 2 — Constant Heat Flux (Neumann):**",
      "- Wall → Thermal → Heat Flux → specify q″ [W/m²]",
      "- Use q″ = 0 for adiabatic (insulated) surfaces",
      "",
      "**Option 3 — Convection:**",
      "- Wall → Thermal → Convection",
      "- Heat Transfer Coefficient: h [W/(m²·K)]",
      "- Free Stream Temperature: T∞ [K]",
      "",
      isCylindrical ? "**Axis:** Set bottom edge (r = 0) as Axis boundary for axisymmetric" : "",
      isComposite ? "**Material interfaces:** Should be coupled walls (automatic if mesh is conformal)" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Wall → Thermal",
        "Setup → Boundary Conditions → Wall → Thermal → Convection",
      ],
      tips: ["For insulated surfaces, set heat flux = 0 W/m² explicitly to be safe"],
    }),

    sec("Solution Methods", [
      "Conduction problems are simple and converge quickly:",
      "",
      "**Scheme:** SIMPLE (default is fine)",
      "**Energy:** Second Order Upwind (or even First Order is adequate for conduction)",
      "",
      transient ? [
        "**Transient Formulation:** Second Order Implicit",
        "",
        "**Time Stepping:**",
        "- Estimate thermal diffusion time scale: t_d = L²/α where α = k/(ρcₚ)",
        "- Time step: Δt = t_d / 50 to t_d / 200",
        "- Total simulation time: 3-5 × t_d to reach steady state",
        "- Max Iterations per Time Step: 10-20 (usually converges in < 5)",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
    }),

    sec("Initialization & Solution Strategy", [
      transient
        ? [
            "**Initial Condition:** Set T = T_initial throughout the domain",
            "- Standard Initialization → Temperature = T_initial",
            "",
            "**Run Calculation:**",
            "- Number of Time Steps: enough to cover the time range of interest",
            "- Monitor temperature at key locations vs. time",
          ].join("\n")
        : [
            "**Hybrid Initialization** (or set T to average of boundary temperatures)",
            "",
            "**Run Calculation:**",
            "- Iterations: 100-500 (conduction converges very fast)",
            "- Energy residual target: < 1×10⁻⁶",
          ].join("\n"),
      "",
      "**Under-Relaxation:** Energy = 1.0 (no need to reduce for pure conduction)",
    ].join("\n"), {
      fluentMenuPaths: [
        "Solution → Initialization",
        "Solution → Run Calculation",
      ],
      tips: ["Pure conduction problems typically converge in 50-200 iterations — if not, check boundary conditions"],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Temperature distribution through the solid",
      isComposite ? "- Note temperature jumps at material interfaces (if contact resistance) or continuous T (if perfect contact)" : "",
      "",
      "**XY Plots:**",
      `- Temperature vs. ${isCylindrical ? "radial position" : isSpherical ? "radial position" : "x-position (through thickness)"}`,
      transient ? "- Temperature at specific points vs. time" : "",
      isComposite ? "- Temperature profile showing different slopes in each material layer" : "",
      "",
      "**Key Results to Report:**",
      "- Heat flux through the solid (Reports → Surface Integrals → Heat Flux)",
      isComposite ? "- Overall thermal resistance: R_total = ΔT / q″" : "",
      "- Maximum and minimum temperatures",
      `- Compare with analytical: ${isCylindrical ? "T(r) = T₁ - (T₁-T₂)ln(r/r₁)/ln(r₂/r₁) for cylindrical" : isSpherical ? "T(r) = T₁ - (T₁-T₂)(1/r₁ - 1/r)/(1/r₁ - 1/r₂) for spherical" : "T(x) = T₁ + (T₂-T₁)(x/L) for planar without generation"}`,
      hasGeneration ? "- With generation: T_max at center = T_surface + q̇L²/(2k) for planar wall" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → Temperature",
        "Results → Plots → XY Plot",
        "Results → Reports → Surface Integrals → Heat Flux",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "Verify results against analytical solutions:",
      "",
      "- **Energy conservation:** heat in = heat out (check Reports → Fluxes on all boundaries)",
      "- **Temperature range:** all temperatures must lie between boundary temperature extremes" + (hasGeneration ? " (with generation, max T can exceed boundary T)" : ""),
      `- **Linear/logarithmic profile:** ${isCylindrical ? "T should vary logarithmically with r" : isSpherical ? "T should vary as 1/r" : "T should vary linearly with x (no generation)"}`,
      isComposite ? "- **Slope change at interfaces:** dT/dx should change proportional to 1/k at each material boundary" : "",
      "- **Heat flux consistency:** q″ should be constant through all layers in steady 1D conduction",
      transient ? "- **Biot number check:** if Bi < 0.1, lumped capacitance applies — compare with T(t) = T∞ + (Tᵢ - T∞)exp(-t/τ)" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
      warnings: ["If energy imbalance > 0.1%, the solution is not converged — run more iterations or refine mesh"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Zone not set as solid:**",
      "- If zone is fluid, Fluent solves flow equations unnecessarily — set Cell Zone to Solid",
      "",
      "**Incorrect thermal conductivity:**",
      "- Double-check units: W/(m·K). Common mistake is using BTU values with SI geometry.",
      "",
      isComposite ? [
        "**Interface not coupled:**",
        "- If layers have separate meshes, create an interface pair",
        "- For conformal meshes, the coupling is automatic",
        "",
      ].join("\n") : "",
      "**Wrong boundary condition type:**",
      "- Ensure adiabatic surfaces have heat flux = 0, not some default value",
      "- For convection BC: h = 0 means insulated, not 'default'",
      "",
      transient ? [
        "**Time step too large:**",
        "- Temperature oscillations indicate Δt is too large",
        "- Reduce Δt to Fo < 0.5 per time step (Fo = αΔt/Δx²)",
      ].join("\n") : "",
      "**Convergence issues (rare for conduction):**",
      "- If it doesn't converge in ~100 iterations, something is fundamentally wrong with setup",
    ].filter(Boolean).join("\n"), {
      tips: [
        "Pure conduction is the easiest CFD problem — if it's not converging, recheck zone types and BCs",
        "Save a case file with just the thermal setup before running — easy to restart if needed",
      ],
    }),
  ];
}

function templateRadiation(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const lower = text.toLowerCase();
  const isS2S = lower.includes("s2s") || lower.includes("surface to surface") || lower.includes("surface-to-surface");
  const isDO = lower.includes("discrete ordinates") || lower.includes("do model");
  const isP1 = lower.includes("p1") || lower.includes("p-1");
  const isParticipating = lower.includes("participating") || lower.includes("absorption") || lower.includes("scattering") || lower.includes("optically");
  const isEnclosure = lower.includes("enclosure") || lower.includes("cavity") || lower.includes("furnace");

  const radModel = isS2S ? "S2S (Surface-to-Surface)" : isDO ? "DO (Discrete Ordinates)" : isP1 ? "P-1" : isParticipating ? "DO (Discrete Ordinates) — required for participating media" : "S2S (Surface-to-Surface) — default for surface radiation";

  return [
    sec("Problem Summary", `Radiation heat transfer — ${isParticipating ? "participating media" : "surface-to-surface"} radiation${isEnclosure ? " in an enclosure" : ""}${transient ? ", transient" : ", steady-state"}. Model: ${radModel}.`),

    sec("Governing Physics", [
      "Thermal radiation governed by:",
      "- Stefan-Boltzmann law: q = εσT⁴ (surface emission)",
      "- View factors: F_ij determines radiative exchange between surfaces",
      isParticipating ? "- Radiative Transfer Equation (RTE): dI/ds = κIb - (κ + σs)I + (σs/4π)∫I dΩ" : "",
      "",
      "**Key parameters:**",
      "- Emissivity (ε): 0 (reflective) to 1 (blackbody)",
      "- Stefan-Boltzmann constant: σ = 5.67×10⁻⁸ W/(m²·K⁴)",
      isParticipating ? "- Absorption coefficient (κ): characterizes medium opacity" : "",
      isParticipating ? "- Optical thickness: τ = κ·L (thin < 1, thick > 1)" : "",
      "",
      "Radiation becomes significant at high temperatures (T > ~500 K) or in vacuum/gas environments.",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Surfaces are diffuse (emit/reflect uniformly in all directions)",
      "- Gray surfaces (emissivity independent of wavelength) — unless band model specified",
      isParticipating ? "- Participating medium (absorbing/emitting/scattering gas)" : "- Non-participating medium (transparent between surfaces)",
      isEnclosure ? "- Enclosed geometry (all radiation accounted for by enclosure surfaces)" : "",
      "- Emissivities are constant (not temperature-dependent, unless specified)",
      transient ? "- Time-dependent surface temperatures or heat sources" : "- Steady-state radiation equilibrium",
    ].filter(Boolean).join("\n"), {
      warnings: [
        "Radiation calculations involve T⁴ — even small temperature errors get amplified. Ensure unit consistency (Kelvin!).",
        "Non-gray radiation (spectral dependence) requires DO model with band specification — much more complex.",
      ],
    }),

    sec("Required Inputs", [
      "- Surface emissivities for all participating surfaces",
      "- Surface temperatures or heat flux boundary conditions",
      "- Geometry of the enclosure / surfaces",
      isParticipating ? "- Absorption coefficient of the medium (constant or WSGGM for combustion gases)" : "",
      isParticipating ? "- Scattering coefficient (if applicable)" : "",
      "- Decide if radiation is the only mode or combined with convection/conduction",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "**Surface properties (set under Boundary Conditions → Wall):**",
      "- Internal Emissivity: ε (0 to 1)",
      "- Common values:",
      "  - Oxidized steel: ε ≈ 0.8",
      "  - Polished aluminum: ε ≈ 0.05",
      "  - Black paint / soot: ε ≈ 0.95",
      "  - Brick / ceramic: ε ≈ 0.9",
      "  - Glass: ε ≈ 0.9 (opaque to IR)",
      "",
      isParticipating ? [
        "**Medium properties (for participating media):**",
        "- Absorption coefficient: κ [1/m]",
        "- For combustion gases (CO₂, H₂O): use WSGGM (Weighted Sum of Gray Gases Model)",
        "- Scattering coefficient: σs [1/m] (for particle-laden flows)",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Wall → Radiation",
        ...(isParticipating ? ["Materials → Fluid → Properties → Absorption Coefficient"] : []),
      ],
    }),

    sec("Geometry Guidance", [
      isEnclosure ? [
        "**Enclosure geometry:**",
        "- Model the complete enclosure — all surfaces must be accounted for",
        "- S2S model requires a closed enclosure (all view factors sum to 1)",
        "- Name each surface for easy emissivity/temperature assignment",
      ].join("\n") : [
        "**Open geometry with radiation:**",
        "- Model radiating surfaces and any nearby objects",
        "- Far-field boundaries can be set as blackbody at ambient temperature",
      ].join("\n"),
      "",
      "**Symmetry:**",
      "- Symmetry planes can be used if radiation is symmetric",
      "- For S2S: symmetry boundaries are treated as perfectly reflecting (ε = 0)",
    ].join("\n"), {
      tips: [
        "For S2S model, all surfaces participating in radiation must form a closed enclosure",
        "Simplify geometry where possible — complex geometries increase view factor computation time dramatically",
      ],
    }),

    sec("Meshing Guidance", [
      "**Radiation problems are less mesh-sensitive than convection, but:**",
      "- Surface mesh quality matters for view factor computation (S2S)",
      "- Mesh faces on radiating surfaces should be of similar size for accurate view factors",
      "- Avoid very elongated surface cells on radiating walls",
      "",
      isParticipating ? [
        "**For participating media (DO model):**",
        "- Volume mesh must resolve temperature gradients in the medium",
        "- Optical thickness per cell: κ·Δx should be < 1 ideally",
        "- Refine mesh where absorption/emission gradients are large",
      ].join("\n") : "",
      "",
      "**Quality targets:** Orthogonal quality > 0.5, Skewness < 0.7",
    ].filter(Boolean).join("\n")),

    sec("Solver & Radiation Model Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Energy:** ON (mandatory for radiation)",
      "",
      "**Radiation Model Selection:**",
      "",
      isS2S || (!isDO && !isP1 && !isParticipating) ? [
        "**S2S (Surface-to-Surface) — recommended for surface radiation:**",
        "- Best for enclosed environments with non-participating media",
        "- Computes view factors between surface clusters",
        "- Setup: Radiation → S2S → Compute View Factors",
        "- Clustering: use face-to-face method; increase clusters for accuracy",
      ].join("\n") : "",
      isDO || isParticipating ? [
        "**DO (Discrete Ordinates) — required for participating media:**",
        "- Solves RTE along discrete directions",
        "- Theta/Phi Divisions: 2×2 minimum, 3×3 for accuracy, 5×5 for high accuracy",
        "- Pixels: 1×1 to 3×3",
        "- Enable non-gray model for spectral radiation (bands)",
      ].join("\n") : "",
      isP1 ? [
        "**P-1 model — simplified participating media:**",
        "- Faster but less accurate than DO",
        "- Best for optically thick media (τ > 1)",
        "- Not suitable for surface radiation problems",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Radiation → S2S (or DO or P-1)",
        ...(isS2S || (!isDO && !isP1 && !isParticipating) ? ["Setup → Models → Radiation → S2S → View Factors → Compute"] : []),
        ...(isDO || isParticipating ? ["Setup → Models → Radiation → DO → Angular Discretization"] : []),
      ],
      warnings: [
        "S2S requires view factor computation before running — can be slow for complex geometry",
        "DO model with many directions (5×5) significantly increases computation time",
      ],
    }),

    sec("Boundary Conditions", [
      "**Radiating Walls:**",
      "- Wall → Radiation → Internal Emissivity = ε",
      "- Thermal condition: Temperature, Heat Flux, or Coupled",
      "",
      "**Non-radiating walls:**",
      "- Internal Emissivity = 0 (perfectly reflecting)",
      "- Or exclude from radiation participation",
      "",
      isEnclosure ? [
        "**Enclosure walls:**",
        "- Set each wall's emissivity and temperature/heat-flux",
        "- Adiabatic radiating walls: set heat flux = 0 but ε > 0 (re-radiating surface)",
      ].join("\n") : [
        "**Open boundaries:**",
        "- Pressure-Outlet or Inlet: set external blackbody temperature for radiation",
      ].join("\n"),
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Wall → Radiation → Internal Emissivity",
      ],
    }),

    sec("Solution Methods", [
      "**Scheme:** SIMPLE or Coupled",
      "**Pressure:** Second Order",
      "**Energy:** Second Order Upwind",
      "",
      "**Radiation-specific:**",
      isS2S || (!isDO && !isP1) ? "- S2S: no additional transport equations — view factors pre-computed" : "",
      isDO || isParticipating ? "- DO: solve radiation intensity equations every flow iteration (default) or every N iterations" : "",
      isP1 ? "- P-1: one additional transport equation for incident radiation G" : "",
      "",
      "**Under-Relaxation:**",
      "- Energy: 0.9-1.0",
      isDO || isParticipating ? "- Discrete Ordinates: 0.8-1.0" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods", "Solution → Controls"],
    }),

    sec("Initialization & Solution Strategy", [
      "**Initialize:** Set temperature to average of boundary temperatures",
      "",
      "**Strategy:**",
      "1. Start with a good initial temperature guess (reduces radiation source term nonlinearity)",
      "2. Run with lower under-relaxation for energy (0.8) initially",
      "3. Radiation problems can be stiff due to T⁴ nonlinearity — converge slowly",
      `4. ${transient ? "Time step: Δt based on thermal diffusion and radiation response time" : "Run 500-2000 iterations"}`,
      "",
      "**Convergence monitors:**",
      "- Energy residual < 1×10⁻⁶",
      "- Monitor heat flux on radiating surfaces",
      "- Monitor temperature of re-radiating surfaces (should stabilize)",
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Initialization", "Solution → Run Calculation"],
      warnings: ["Radiation problems converge more slowly than pure conduction due to T⁴ nonlinearity — be patient"],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Temperature distribution",
      "- Surface heat flux (total, radiative component)",
      isParticipating ? "- Incident radiation (G)" : "",
      isParticipating ? "- Absorption / emission contours" : "",
      "",
      "**Key Results:**",
      "- Radiative heat flux on each surface: Reports → Surface Integrals → Radiation Heat Flux",
      "- Net radiation heat transfer between surfaces",
      "- Surface temperatures (for re-radiating surfaces)",
      "",
      "**Validation:**",
      isEnclosure ? "- Compare with analytical view factor × σ(T₁⁴ - T₂⁴) calculations" : "",
      "- Energy balance: net radiation from hot surfaces = net absorption by cold surfaces",
      "- For two-surface enclosure: Q₁₂ = σ(T₁⁴ - T₂⁴) / (1/ε₁ + 1/ε₂ - 1) × A₁",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → Temperature",
        "Results → Reports → Surface Integrals → Radiation Heat Flux",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "- **Energy conservation:** total heat radiated = total heat absorbed in enclosure",
      "- **Temperature range:** all T values must be > 0 K (absolute)",
      "- **View factor reciprocity:** A₁F₁₂ = A₂F₂₁ (check if analytical VFs available)",
      "- **Summation rule:** ΣF_ij = 1 for each surface in enclosure",
      "- **Black body limit:** if ε = 1 on all surfaces, result should match blackbody exchange",
      "- Heat flows from hot to cold — net flux direction must be physically correct",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**View factors not computed (S2S):**",
      "- Must click 'Compute' in radiation model settings before running",
      "- Error: 'view factors not available' — recompute after mesh changes",
      "",
      "**Temperature in Celsius instead of Kelvin:**",
      "- Radiation uses T⁴ — MUST use absolute temperature (Kelvin)",
      "- If using Celsius, set offset correctly in Fluent",
      "",
      "**Emissivity = 0 on all surfaces:**",
      "- No radiation exchange occurs — at least one surface needs ε > 0",
      "",
      "**Divergence with DO model:**",
      "- Reduce under-relaxation for Discrete Ordinates to 0.5",
      "- Start with fewer angular divisions (2×2) and increase later",
      "",
      "**Very slow convergence:**",
      "- Normal for radiation-dominated problems",
      "- Ensure initial temperature guess is reasonable (not 0 K!)",
    ].join("\n"), {
      tips: [
        "Always use Kelvin for radiation problems — Fluent handles the offset but double-check",
        "For S2S: view factor computation is a one-time cost — save the case file after computing",
      ],
    }),
  ];
}

function templateFinHeatTransfer(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const lower = text.toLowerCase();
  const isPin = lower.includes("pin fin") || lower.includes("pin") || lower.includes("spine");
  const isAnnular = lower.includes("annular") || lower.includes("annular fin");
  const isRectangular = lower.includes("rectangular") || lower.includes("plate fin");
  const isArray = lower.includes("array") || lower.includes("heat sink") || lower.includes("fin array");
  const finType = isPin ? "pin fin" : isAnnular ? "annular fin" : isRectangular ? "rectangular fin" : "fin";
  const radiation = hasRadiation(text);

  return [
    sec("Problem Summary", `${finType.charAt(0).toUpperCase() + finType.slice(1)} heat transfer — ${isArray ? "fin array / heat sink, " : "single fin, "}${transient ? "transient" : "steady-state"}${radiation ? ", with radiation" : ""}.`),

    sec("Governing Physics", [
      "Fin/extended surface heat transfer involves:",
      "- Conduction along the fin from base to tip",
      "- Convection from fin surface to surrounding fluid",
      radiation ? "- Radiation from fin surface" : "",
      "",
      "**Governing equation (1D fin):**",
      "- d²T/dx² - (hP)/(kA_c)(T - T∞) = 0 (steady, no radiation)",
      "- m = √(hP/(kA_c)) — fin parameter",
      "",
      "**Key parameters:**",
      "- Fin efficiency: η_f = Q_actual / Q_max (if entire fin were at base temperature)",
      "- Fin effectiveness: ε_f = Q_with_fin / Q_without_fin",
      "- Biot number: Bi = h·(t/2)/k (t = fin thickness) — should be < 0.1 for 1D assumption",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Steady-state" + (transient ? " or transient heat transfer" : ""),
      "- Uniform convection coefficient h over fin surface (can be refined in CFD)",
      "- Fin base at constant temperature T_b",
      "- Tip condition: adiabatic, convective, or prescribed temperature",
      `- ${isPin ? "Cylindrical cross-section" : isAnnular ? "Annular geometry" : "Rectangular cross-section, width >> thickness"}`,
      "- Constant thermal conductivity (unless temperature-dependent)",
      radiation ? "- Surface radiation included (significant for high-T or vacuum applications)" : "- Radiation neglected",
    ].filter(Boolean).join("\n"), {
      tips: ["CFD can capture the actual flow field around the fin — no need to assume uniform h"],
    }),

    sec("Required Inputs", [
      "- Fin material and thermal conductivity (k)",
      `- Fin geometry: ${isPin ? "diameter and length" : isAnnular ? "inner radius, outer radius, thickness" : "length, thickness, width"}`,
      isArray ? "- Number of fins, fin spacing/pitch" : "",
      "- Base temperature (T_b)",
      "- Ambient fluid temperature (T∞)",
      "- Convection coefficient (h) — or let CFD compute it from flow field",
      "- Fluid properties if solving the flow",
      "- Tip boundary condition (adiabatic, convective, or temperature)",
      radiation ? "- Surface emissivity" : "",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "**Fin (solid) material:**",
      "- Aluminum (common for heat sinks): k = 202 W/(m·K), ρ = 2719 kg/m³, cₚ = 871 J/(kg·K)",
      "- Copper: k = 387 W/(m·K), cₚ = 381 J/(kg·K)",
      "- Steel: k = 50 W/(m·K)",
      "",
      "**Surrounding fluid:**",
      "- Air at ~25°C: ρ = 1.185 kg/m³, μ = 1.849×10⁻⁵ Pa·s, k = 0.0262 W/(m·K), cₚ = 1006 J/(kg·K)",
      "- Set Boussinesq density if natural convection drives the flow around fins",
    ].join("\n"), {
      fluentMenuPaths: [
        "Materials → Solid → Create/Edit",
        "Materials → Fluid → Create/Edit",
      ],
    }),

    sec("Geometry Guidance", [
      "**Two approaches:**",
      "",
      "**Approach 1 — Conjugate (flow + fin, recommended for accurate h):**",
      `- Model the fin geometry: ${isPin ? "cylinder protruding from base plate" : isAnnular ? "annular disc on a tube" : "rectangular plate extending from base"}`,
      "- Model surrounding fluid domain (extend 5-10× fin length in each direction)",
      isArray ? "- Model single fin + half-spacing on each side, use symmetry/periodic BCs" : "",
      "- Shared topology between solid (fin) and fluid domains",
      "",
      "**Approach 2 — Solid-only (prescribed h):**",
      "- Model only the fin geometry (solid)",
      "- Apply convection BC on all exposed surfaces with specified h and T∞",
      "- Much simpler but h must be known a priori",
      "",
      isArray ? [
        "**Heat sink array:**",
        "- Use symmetry: model a single fin channel (half-fin + half-gap)",
        "- Periodic BCs if fins repeat identically",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      tips: [
        "For homework/course problems with given h, Approach 2 (solid-only) is sufficient",
        "For real-world design, Approach 1 captures the actual flow patterns and local h variations",
      ],
    }),

    sec("Meshing Guidance", [
      "**Fin (solid) meshing:**",
      `- ${isPin ? "Use sweep mesh along fin length, O-grid cross-section" : "Structured hex/quad mesh preferred"}`,
      "- At least 5 cells across fin thickness (Bi check: should be < 0.1 for 1D assumption to hold)",
      "- Finer mesh near base (highest temperature gradient) and tip",
      "",
      "**Fluid domain (if conjugate):**",
      "- Fine mesh near fin surfaces (inflation layers, y+ ≈ 1 for turbulent or 10+ cells in BL for laminar)",
      "- Growth ratio: 1.1-1.2 from fin surface outward",
      isArray ? "- Resolve inter-fin channel flow adequately" : "",
      "",
      `**Total cells:** ${isArray ? "200,000-2,000,000 for conjugate array" : "20,000-200,000 for single fin conjugate"}, much less for solid-only`,
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Mesh → Check"],
    }),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      "- Energy: ON",
      "- Viscous: Laminar (typical for natural convection around fins) or k-omega SST (for forced-convection cooling)",
      radiation ? "- Radiation: S2S or DO (if significant)" : "",
      "",
      "**Cell Zone Conditions:**",
      "- Fin body: Solid (assign fin material)",
      "- Surrounding region: Fluid (assign air/coolant)",
      "",
      "**If natural convection:** Enable gravity, use Boussinesq density",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Models → Energy → ON",
        "Setup → Cell Zone Conditions → [fin zone] → Type: Solid",
        ...(radiation ? ["Setup → Models → Radiation → S2S"] : []),
      ],
    }),

    sec("Boundary Conditions", [
      "**Fin Base:**",
      "- Wall → Thermal → Constant Temperature = T_base",
      "- Or: coupled to a heat source (volumetric generation in base plate)",
      "",
      "**Fin Tip:**",
      "- Adiabatic (most common assumption): heat flux = 0",
      "- Or convective tip: apply convection BC",
      "",
      "**If conjugate (flow modeled):**",
      "- Inlet: Velocity-Inlet with T∞ and velocity",
      "- Outlet: Pressure-Outlet",
      "- Fin surfaces: coupled wall (automatic at solid-fluid interface)",
      "",
      "**If solid-only:**",
      "- All exposed fin surfaces: Convection BC with h and T∞",
      isArray ? "- Symmetry planes at mid-gap between fins" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Wall → Thermal → Temperature",
        "Setup → Boundary Conditions → Wall → Thermal → Convection",
      ],
    }),

    sec("Solution Methods & Strategy", [
      "**Scheme:** SIMPLE (solid-only) or Coupled (conjugate with flow)",
      "**Discretization:** Second Order Upwind for all",
      "",
      "**Strategy:**",
      "1. Initialize with Hybrid method (or set T = T_base throughout fin)",
      "2. First-order upwind for 200 iterations",
      "3. Switch to second-order until converged",
      "",
      "**Convergence:**",
      "- Energy residual < 1×10⁻⁶",
      "- Monitor: total heat dissipation from fin (surface integral of heat flux)",
      "- Monitor: fin tip temperature",
      `- Iterations: ${isArray ? "1000-3000 for conjugate" : "100-500 for solid-only, 500-2000 for conjugate"}`,
    ].join("\n"), {
      fluentMenuPaths: ["Solution → Methods", "Solution → Run Calculation"],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Temperature distribution along fin (should decrease from base to tip)",
      "- Local heat flux on fin surface",
      "- Velocity field around fin (if conjugate)",
      "",
      "**XY Plots:**",
      "- Temperature along fin length (base to tip)",
      "- Local heat transfer coefficient along fin surface",
      "",
      "**Key Results:**",
      "- Total heat dissipation: Q_fin = ∫h(T - T∞)dA over fin surface",
      "- Fin efficiency: η = Q_actual / [hA_fin(T_base - T∞)]",
      "- Fin effectiveness: ε = Q_with_fin / [hA_base(T_base - T∞)]",
      "- Tip temperature",
      "",
      "**Validation:**",
      `- Compare with analytical: ${isPin ? "T(x)/θ_b = cosh[m(L-x)]/cosh(mL) for adiabatic tip" : "Same hyperbolic solution for rectangular fins"}`,
      "- Analytical fin efficiency: η = tanh(mL)/(mL) for insulated tip",
    ].join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → Temperature",
        "Results → Reports → Surface Integrals → Total Heat Transfer Rate",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "- **Temperature monotonically decreases** from base to tip (no heating along the fin)",
      "- **Fin tip temperature** > T∞ (fin must be warmer than ambient)",
      "- **Fin efficiency** should be between 0 and 1 (η < 1 always)",
      "- **Effectiveness** should be > 1 (otherwise fin is counterproductive — very unusual)",
      "- **Energy balance:** heat entering at base = total convective + radiative loss from surfaces",
      "- **Biot number check:** Bi = h·(t/2)/k should be < 0.1 for 1D fin assumption to be valid",
    ].join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Fin zone not set as Solid:**",
      "- If Fluent tries to solve flow inside the fin, results will be wrong",
      "",
      "**Wrong base temperature:**",
      "- Ensure the base face (attached to primary surface) has the correct T_base",
      "",
      "**Convection coefficient too high or low:**",
      "- h for natural convection in air: 5-25 W/(m²·K)",
      "- h for forced convection in air: 25-250 W/(m²·K)",
      "- If computed η > 1 or < 0, check h value and units",
      "",
      "**Mesh too coarse across fin thickness:**",
      "- Need at least 3-5 cells across thickness for 2D temperature variation",
      "",
      isArray ? "**Symmetry BC not applied correctly for fin array:**\n- Ensure zero gradient normal to symmetry plane" : "",
    ].filter(Boolean).join("\n"), {
      tips: [
        "For quick validation, compare CFD result with analytical solution using the same h value",
        "Fin efficiency strongly depends on mL = L√(hP/kAc) — compute this first to estimate expected η",
      ],
    }),
  ];
}

function templatePorousMedia(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const heated = hasHeating(text);
  const laminar = isLaminar(text);
  const lower = text.toLowerCase();
  const isPackedBed = lower.includes("packed bed") || lower.includes("packed column") || lower.includes("pebble");
  const isFilter = lower.includes("filter") || lower.includes("filtration");
  const isCatalytic = lower.includes("catalytic") || lower.includes("catalyst");
  const porousType = isPackedBed ? "packed bed" : isFilter ? "filter" : isCatalytic ? "catalytic converter" : "porous region";

  return [
    sec("Problem Summary", `Flow through ${porousType} (porous media) — ${laminar ? "laminar" : "turbulent"}, ${heated ? "with heat transfer, " : ""}${transient ? "transient" : "steady-state"}.`),

    sec("Governing Physics", [
      "Flow through porous media is modeled using the Darcy-Forchheimer equation:",
      "- Pressure drop: -∂p/∂x = (μ/α)v + C₂(½ρv²)",
      "  - First term: viscous (Darcy) resistance — dominant at low velocity",
      "  - Second term: inertial (Forchheimer) resistance — dominant at high velocity",
      "",
      "**Key parameters:**",
      "- Porosity (φ): void fraction (0 to 1)",
      "- Permeability (α) [m²]: ease of flow through medium",
      "- Viscous resistance (1/α) [1/m²]: inverse of permeability",
      "- Inertial resistance (C₂) [1/m]: Forchheimer coefficient",
      "",
      isPackedBed ? "**Ergun equation for packed beds:** ΔP/L = 150μ(1-φ)²v/(φ³d²) + 1.75ρ(1-φ)v²/(φ³d)" : "",
      heated ? "**Thermal equilibrium** assumed between fluid and solid matrix (one-temperature model) unless specified otherwise." : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Porous medium is homogeneous and isotropic (unless directional resistance specified)",
      "- Local thermal equilibrium between fluid and solid phases" + (heated ? " (or non-equilibrium if specified)" : ""),
      `- ${laminar ? "Laminar" : "Turbulent"} flow in the clear (non-porous) regions`,
      "- Incompressible flow through the porous zone",
      "- Porosity and resistance coefficients are constant",
      isPackedBed ? "- Spherical particles of uniform diameter (for Ergun correlation)" : "",
    ].filter(Boolean).join("\n")),

    sec("Required Inputs", [
      "- Geometry of the porous region and surrounding flow domain",
      "- Porosity (φ) of the porous medium",
      "- Particle diameter (for packed beds) or pore size",
      "- Viscous resistance coefficient (1/α) [1/m²]",
      "- Inertial resistance coefficient (C₂) [1/m]",
      isPackedBed ? "- Or: particle diameter d_p and porosity φ → Fluent can compute from Ergun" : "",
      "- Inlet flow velocity or flow rate",
      heated ? "- Inlet temperature, heat source/sink in porous zone" : "",
      "- Fluid properties (ρ, μ, and thermal properties if heated)",
    ].filter(Boolean).join("\n"), {
      tips: [
        "From Ergun equation: 1/α = 150(1-φ)²/(φ³d²), C₂ = 3.5(1-φ)/(φ³d) for packed beds",
        "If you only have ΔP vs. velocity data, fit to ΔP = av + bv² to get viscous and inertial coefficients",
      ],
    }),

    sec("Material Properties", [
      "**Fluid properties:**",
      "- Standard fluid (water, air, etc.) as required",
      "",
      heated ? [
        "**Porous zone thermal properties:**",
        "- Solid material of porous matrix (e.g., alumina, steel, ceramic)",
        "- Effective thermal conductivity: k_eff = φ·k_fluid + (1-φ)·k_solid",
        "- Or specify separate solid and fluid conductivities in Fluent's porous zone settings",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Materials → Fluid → Create/Edit"],
    }),

    sec("Geometry Guidance", [
      "**Do NOT model individual pores or particles.** Instead:",
      "- Create the porous region as a simple volume (box, cylinder, etc.)",
      "- Create the surrounding clear-fluid region",
      "- The porous region is defined via Cell Zone Conditions, not geometry features",
      "",
      `**For ${porousType}:**`,
      isPackedBed ? "- Model as a cylindrical or rectangular volume filled with the 'porous' zone" : "",
      isFilter ? "- Model as a thin slab (porous zone) within a flow channel" : "",
      isCatalytic ? "- Model the converter as a cylindrical porous zone with inlet/outlet cones" : "",
      "",
      "Ensure separate Named Selections for the porous zone and clear zones.",
    ].filter(Boolean).join("\n"), {
      tips: ["The porous zone is a volume — you don't model individual particles/pores, just the bulk resistance"],
      warnings: ["Do NOT try to mesh individual pores — use the porous media model instead"],
    }),

    sec("Meshing Guidance", [
      "**Porous zone:**",
      "- Moderate mesh density (porous model is a volume-averaged approach)",
      "- No need for boundary layer refinement inside porous zone",
      "- Refine at porous-clear fluid interface (pressure gradients)",
      "",
      "**Clear (non-porous) regions:**",
      `- Standard meshing: ${laminar ? "resolve velocity BL" : "y+ ≈ 1 at walls"}`,
      "- Refine near inlet/outlet of porous zone",
      "",
      "**Total cells:** 50,000-500,000 depending on geometry complexity",
    ].join("\n"), {
      fluentMenuPaths: ["Mesh → Check"],
    }),

    sec("Solver Setup", [
      "**General:** Pressure-Based, " + (transient ? "Transient" : "Steady"),
      "",
      "**Models:**",
      `- Viscous: ${laminar ? "Laminar" : "k-epsilon Realizable (turbulence in clear region)"}`,
      heated ? "- Energy: ON" : "",
      "",
      "**Cell Zone Conditions — Porous Zone:**",
      "- Select the porous region → Check 'Porous Zone'",
      "- Set Porosity: φ (e.g., 0.4 for packed beds)",
      "- Direction 1 Vector: [1,0,0] (or flow direction)",
      "",
      "**Viscous Resistance (1/α) [1/m²]:**",
      isPackedBed ? "- Compute from Ergun: 1/α = 150(1-φ)²/(φ³d_p²)" : "- Input from data or correlations",
      "",
      "**Inertial Resistance (C₂) [1/m]:**",
      isPackedBed ? "- Compute from Ergun: C₂ = 3.5(1-φ)/(φ³d_p)" : "- Input from data or correlations",
      "",
      heated ? [
        "**Thermal settings in porous zone:**",
        "- Thermal Equilibrium model (default) or Non-Equilibrium",
        "- Solid material of porous matrix",
        "- Porosity affects effective conductivity",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Cell Zone Conditions → [zone] → Porous Zone → Enable",
        "Setup → Cell Zone Conditions → [zone] → Porous Zone → Viscous Resistance",
        "Setup → Cell Zone Conditions → [zone] → Porous Zone → Inertial Resistance",
        "Setup → Cell Zone Conditions → [zone] → Porous Zone → Porosity",
      ],
      warnings: [
        "Viscous resistance = 1/α (NOT α). It's the inverse of permeability.",
        "Units: viscous resistance in 1/m², inertial resistance in 1/m — double-check!",
      ],
    }),

    sec("Boundary Conditions", [
      "**Inlet:**",
      "- Velocity-Inlet: specify superficial velocity (based on total cross-section, not pore area)",
      !laminar ? "- Turbulence: Intensity 5%, Hydraulic Diameter" : "",
      heated ? "- Temperature: T_inlet" : "",
      "",
      "**Outlet:**",
      "- Pressure-Outlet: gauge pressure = 0 Pa",
      "",
      "**Walls:**",
      "- No-slip at channel walls",
      heated ? "- Adiabatic or specified temperature/heat flux" : "",
      "",
      "**Porous zone interfaces:**",
      "- No explicit BC needed — porous zone is interior to the domain",
      "- Fluent handles the transition automatically",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions"],
      tips: ["The velocity you specify at the inlet is the superficial (Darcy) velocity, not the interstitial velocity. Interstitial = superficial/porosity"],
    }),

    sec("Solution Methods", [
      "**Scheme:** SIMPLE or Coupled (Coupled often better for porous flows due to strong pressure-velocity coupling)",
      "",
      "**Spatial Discretization:**",
      "- Gradient: Least Squares Cell Based",
      "- Pressure: Second Order (or PRESTO! if gravity effects)",
      "- Momentum: Second Order Upwind",
      heated ? "- Energy: Second Order Upwind" : "",
      !laminar ? "- Turbulence quantities: Second Order Upwind" : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
    }),

    sec("Initialization & Solution Strategy", [
      "**Initialize:** Hybrid Initialization",
      "",
      "**Strategy:**",
      "1. Start with first-order upwind",
      "2. Run 200-500 iterations",
      "3. Switch to second-order upwind",
      `4. Total iterations: ${laminar ? "500-1500" : "1000-3000"}`,
      "",
      "**Under-Relaxation (if convergence issues):**",
      "- Pressure: 0.3 → 0.2 (porous media adds strong pressure source)",
      "- Momentum: 0.7 → 0.5",
      "",
      "**Monitors:**",
      "- Pressure drop across porous zone: ΔP = P_inlet_face - P_outlet_face of porous region",
      heated ? "- Outlet temperature" : "",
      "- Mass flow rate at inlet and outlet (should match)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Initialization", "Solution → Run Calculation"],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Pressure (should show significant drop through porous zone)",
      "- Velocity (note: Fluent reports superficial velocity in porous zone by default)",
      heated ? "- Temperature distribution" : "",
      "",
      "**XY Plots:**",
      "- Pressure along flow direction through porous zone",
      "- Velocity profile at porous zone inlet and outlet",
      "",
      "**Key Results:**",
      "- Pressure drop: ΔP across porous zone — compare with Ergun or correlation",
      isPackedBed ? "- Compare ΔP with Ergun equation: ΔP = [150μ(1-φ)²v/(φ³d²) + 1.75ρ(1-φ)v²/(φ³d)] × L" : "",
      heated ? "- Outlet temperature and heat transfer rate" : "",
      "- Flow uniformity downstream of porous zone",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → Pressure",
        "Results → Plots → XY Plot",
        "Results → Reports → Surface Integrals",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "- **Pressure drop** should match analytical Darcy or Ergun prediction within ~10-20%",
      "- **Mass conservation:** inlet mass flow = outlet mass flow",
      "- **Velocity in porous zone** should be lower than upstream (if area is constant) and follow Darcy's law",
      heated ? "- **Energy balance:** heat added = ṁ × cₚ × (T_out - T_in)" : "",
      "- **Pressure drop scales correctly:** linear with v (Darcy) at low Re, quadratic at high Re",
      "- If ΔP seems too high or low, recheck viscous and inertial resistance coefficients",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
      warnings: ["The most common error in porous media simulations is incorrect resistance coefficients — always validate ΔP against correlations"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Wrong resistance coefficients:**",
      "- Most frequent error — ΔP will be orders of magnitude off",
      "- Double-check units: viscous resistance [1/m²], inertial resistance [1/m]",
      "- Verify against known correlations (Ergun for packed beds)",
      "",
      "**Forgot to enable Porous Zone:**",
      "- The zone acts as clear fluid — no pressure drop observed",
      "",
      "**Divergence:**",
      "- High resistance can cause strong source terms → reduce under-relaxation for pressure/momentum",
      "- Start with lower velocity and ramp up",
      "",
      "**Velocity interpretation:**",
      "- Fluent reports superficial velocity in porous zone by default",
      "- Interstitial velocity = superficial velocity / porosity",
      "- Enable 'Superficial Velocity' option in Cell Zone Conditions if needed",
      "",
      heated ? "**Thermal non-equilibrium not accounted for:**\n- Default is thermal equilibrium between solid and fluid phases\n- For fast flows or low-conductivity solids, use non-equilibrium model" : "",
    ].filter(Boolean).join("\n"), {
      tips: [
        "Start with a 1D validation: single flow direction through porous slab, compare ΔP with hand calculation",
        "If ΔP is critical, perform a mesh independence study on the porous zone mesh",
      ],
    }),
  ];
}

function templateBoilingCondensation(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const lower = text.toLowerCase();
  const isBoiling = lower.includes("boiling") || lower.includes("evaporation") || lower.includes("vaporization");
  const isCondensation = lower.includes("condensation");
  const isMelting = lower.includes("melting") || lower.includes("solidification") || lower.includes("freezing");
  const isPoolBoiling = lower.includes("pool boiling");
  const isFlowBoiling = lower.includes("flow boiling");
  const isFilmCondensation = lower.includes("film condensation");
  const phaseType = isMelting ? "melting/solidification" : isBoiling ? "boiling" : isCondensation ? "condensation" : "phase change";

  return [
    sec("Problem Summary", `${phaseType.charAt(0).toUpperCase() + phaseType.slice(1)} heat transfer — ${isPoolBoiling ? "pool boiling" : isFlowBoiling ? "flow boiling" : isFilmCondensation ? "film condensation" : phaseType}${transient ? ", transient" : ", steady-state"}.`),

    sec("Governing Physics", [
      `${phaseType.charAt(0).toUpperCase() + phaseType.slice(1)} involves latent heat exchange during phase transition:`,
      "",
      isBoiling ? [
        "- Nucleate boiling: bubbles form at heated surface (dominant mechanism in most applications)",
        "- Film boiling: vapor film covers surface (very high wall superheat)",
        "- Critical Heat Flux (CHF): transition between nucleate and film boiling",
        "- Boiling curve: q″ vs. ΔT_sat shows different regimes",
      ].join("\n") : "",
      isCondensation ? [
        "- Film condensation: liquid film forms on cooled surface (Nusselt analysis)",
        "- Dropwise condensation: discrete drops form and shed (5-20× higher h)",
        "- Condensation rate depends on: surface temperature, vapor velocity, non-condensables",
      ].join("\n") : "",
      isMelting ? [
        "- Stefan problem: moving solid-liquid interface",
        "- Latent heat absorbed/released at melting temperature",
        "- Natural convection in melt region can significantly affect melting rate",
        "- Mushy zone: mixture of solid and liquid phases at melting temperature",
      ].join("\n") : "",
      "",
      "**Key parameters:**",
      "- Latent heat of vaporization/fusion (L or h_fg)",
      isBoiling ? "- Wall superheat: ΔT_sat = T_wall - T_sat" : "",
      isCondensation ? "- Subcooling: ΔT_sub = T_sat - T_wall" : "",
      isMelting ? "- Stefan number: Ste = cₚΔT/L (ratio of sensible to latent heat)" : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      isMelting ? [
        "- Phase change occurs at a fixed melting temperature T_melt",
        "- Mushy zone modeled with enthalpy-porosity method (Fluent default)",
        "- Natural convection in liquid phase may be significant",
        "- Constant material properties (or temperature-dependent)",
      ].join("\n") : [
        "- Two-phase flow: liquid and vapor phases",
        "- Phase change at saturation temperature T_sat",
        "- Surface tension effects may be important (especially for boiling)",
        isPoolBoiling ? "- Stagnant pool with heated surface at bottom/side" : "",
        isFlowBoiling ? "- Flowing liquid with phase change along heated channel" : "",
        isFilmCondensation ? "- Gravity-driven film flow on cooled surface" : "",
      ].filter(Boolean).join("\n"),
      "",
      transient ? "- Transient simulation required (phase change is inherently time-dependent for most cases)" : "- Quasi-steady assumption (if applicable)",
    ].join("\n"), {
      warnings: [
        "Phase change simulations are among the most challenging in CFD — expect long run times and convergence difficulties",
        isMelting ? "Ensure mushy zone constant is appropriate (default 10⁵ in Fluent) — affects melting rate" : "VOF or Mixture model requires careful time-stepping and Courant number control",
      ].filter(Boolean),
    }),

    sec("Required Inputs", [
      "- Saturation temperature (T_sat) or melting temperature (T_melt)",
      `- Latent heat (h_fg for ${isBoiling || isCondensation ? "vaporization" : "fusion"})`,
      "- Properties of both phases (liquid and vapor/solid)",
      `- Wall temperature or heat flux (drives the ${phaseType})`,
      "- Geometry of the domain",
      isFlowBoiling ? "- Inlet liquid velocity and subcooling" : "",
      isPoolBoiling ? "- Pool dimensions and initial liquid level" : "",
      isFilmCondensation ? "- Vapor conditions (temperature, velocity)" : "",
      isMelting ? "- Initial and boundary temperatures, Stefan number" : "",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      isMelting ? [
        "**Melting/Solidification material:**",
        "- Use Fluent's Solidification/Melting model material setup",
        "- Solidus Temperature: T_solidus",
        "- Liquidus Temperature: T_liquidus (= T_solidus for pure substance)",
        "- Latent Heat: L [J/kg]",
        "- Density, specific heat, thermal conductivity for both phases",
        "",
        "**Common PCM materials:**",
        "- Water/Ice: T_melt = 0°C, L = 334 kJ/kg",
        "- Paraffin wax: T_melt ≈ 50-60°C, L ≈ 200 kJ/kg",
        "- Gallium: T_melt = 29.8°C, L = 80.2 kJ/kg (common benchmark)",
      ].join("\n") : [
        "**Liquid phase properties (at T_sat):**",
        "- Density, viscosity, specific heat, thermal conductivity, surface tension",
        "",
        "**Vapor phase properties (at T_sat):**",
        "- Density, viscosity, specific heat, thermal conductivity",
        "",
        "**Phase change properties:**",
        "- Latent heat of vaporization: h_fg [J/kg]",
        "- Saturation temperature: T_sat [K]",
        "",
        "**Water at 1 atm:**",
        "- T_sat = 100°C, h_fg = 2257 kJ/kg",
        "- ρ_liquid = 958 kg/m³, ρ_vapor = 0.598 kg/m³",
      ].join("\n"),
    ].join("\n"), {
      fluentMenuPaths: [
        "Materials → Fluid → Create/Edit",
        ...(isMelting ? ["Setup → Models → Solidification & Melting"] : []),
      ],
    }),

    sec("Geometry Guidance", [
      isPoolBoiling ? [
        "**Pool boiling geometry:**",
        "- 2D or 3D domain representing the liquid pool",
        "- Heated surface at bottom (or side)",
        "- Free surface or pressure outlet at top",
        "- Domain height: several bubble diameters above heated surface",
      ].join("\n") : "",
      isFlowBoiling ? [
        "**Flow boiling geometry:**",
        "- Channel or tube with heated walls",
        "- Sufficient length for vapor quality development",
        "- Inlet subcooled liquid, heated along channel",
      ].join("\n") : "",
      isFilmCondensation ? [
        "**Film condensation geometry:**",
        "- Vertical or inclined cooled surface",
        "- Vapor space on one side",
        "- Drainage path for condensate film",
      ].join("\n") : "",
      isMelting ? [
        "**Melting/solidification geometry:**",
        "- Rectangular cavity (common benchmark: gallium melting in a box)",
        "- Hot wall on one side, cold wall on opposite side",
        "- Other walls adiabatic",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      tips: ["Start with 2D simulations — phase change in 3D is computationally very expensive"],
    }),

    sec("Meshing Guidance", [
      "**Phase change problems require fine meshes:**",
      "- Near heated/cooled surfaces: very fine mesh (first cell < 0.1 mm)",
      "- In phase change region: uniform fine mesh to resolve interface",
      isMelting ? "- In mushy zone: mesh must be fine enough to capture the melt front" : "",
      isBoiling ? "- Mesh must resolve individual bubbles if using VOF (cell size << bubble diameter)" : "",
      "",
      "**Recommended cell sizes:**",
      isBoiling ? "- Bubble departure diameter ≈ 1-3 mm → need cells of 0.1-0.2 mm" : "",
      isMelting ? "- Phase front thickness spans several cells" : "",
      "",
      `**Total cells:** ${isBoiling ? "100,000-1,000,000+ for 2D" : isMelting ? "10,000-100,000 for 2D" : "50,000-500,000"}`,
      "",
      "**Quality:** Orthogonal quality > 0.8, uniform cell sizes near interface",
    ].filter(Boolean).join("\n"), {
      warnings: ["Phase change simulations are very mesh-sensitive — always perform mesh independence study"],
    }),

    sec("Solver & Model Setup", [
      "**General:** Pressure-Based, Transient (almost always needed for phase change)",
      "",
      isMelting ? [
        "**Solidification/Melting Model:**",
        "- Enable: Models → Solidification & Melting",
        "- Mushy Zone Constant: 10⁵ (default, reduce to 10⁴ if convergence issues)",
        "- Pull Velocity: 0 (unless modeling continuous casting)",
        "",
        "- Energy: ON",
        "- Viscous: Laminar (typical for melting) or k-epsilon if turbulent convection in melt",
        "- Gravity: ON (for natural convection in melt)",
      ].join("\n") : [
        "**Multiphase Model:**",
        "- VOF (Volume of Fluid) — for tracking sharp liquid-vapor interface",
        "  - Explicit VOF with Geo-Reconstruct for sharp interfaces",
        "  - Or Implicit VOF for stability",
        "",
        "**Phase Change:**",
        "- Mass transfer mechanism: Lee model (evaporation-condensation)",
        "  - Evaporation coefficient: 0.1 s⁻¹ (start value, tune as needed)",
        "  - Condensation coefficient: 0.1 s⁻¹",
        "  - Saturation temperature: T_sat",
        "",
        "**Other models:**",
        "- Energy: ON",
        `- Viscous: ${isPoolBoiling ? "Laminar (low Re) or k-omega SST" : "k-epsilon or k-omega SST"}`,
        "- Gravity: ON",
        "- Surface Tension: Enable with appropriate σ value (Continuum Surface Force model)",
      ].join("\n"),
    ].join("\n"), {
      fluentMenuPaths: isMelting ? [
        "Setup → Models → Solidification & Melting → ON",
        "Setup → Models → Energy → ON",
        "Setup → General → Gravity → ON",
      ] : [
        "Setup → Models → Multiphase → VOF",
        "Setup → Models → Energy → ON",
        "Setup → General → Gravity → ON",
        "Setup → Phase Interaction → Mass Transfer → Lee Model",
      ],
      warnings: isMelting
        ? ["Mushy zone constant strongly affects melting rate — perform sensitivity study"]
        : ["Lee model evaporation/condensation coefficients need tuning — start with 0.1 and adjust based on physical behavior"],
    }),

    sec("Boundary Conditions", [
      "**Heated/Cooled Wall:**",
      "- Constant Temperature: T_wall (superheat for boiling, subcooled for condensation)",
      "- Or Constant Heat Flux: q″ [W/m²]",
      "",
      isPoolBoiling ? [
        "**Top boundary (free surface):**",
        "- Pressure-Outlet: P = 0 (gauge), Backflow volume fraction: vapor = 1",
        "",
        "**Side walls:** Adiabatic, no-slip",
      ].join("\n") : "",
      isFlowBoiling ? [
        "**Inlet:**",
        "- Velocity-Inlet: liquid velocity, T = T_sub (subcooled)",
        "- Volume fraction: liquid = 1, vapor = 0",
        "",
        "**Outlet:**",
        "- Pressure-Outlet",
      ].join("\n") : "",
      isMelting ? [
        "**Hot wall:** Constant temperature T_hot > T_melt",
        "**Cold wall:** Constant temperature T_cold < T_melt (or adiabatic)",
        "**Other walls:** Adiabatic",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Setup → Boundary Conditions"],
    }),

    sec("Solution Methods", [
      "**Pressure-Velocity Coupling:** SIMPLE or PISO (PISO preferred for transient phase change)",
      "",
      "**Spatial Discretization:**",
      "- Pressure: PRESTO! (recommended for multiphase / buoyancy)",
      "- Momentum: Second Order Upwind",
      "- Energy: Second Order Upwind",
      isMelting ? "" : "- Volume Fraction: Geo-Reconstruct (for sharp interface, explicit) or Compressive (implicit)",
      "",
      "**Transient Formulation:** First Order Implicit (more stable for phase change)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Solution → Methods"],
      tips: ["PRESTO! pressure discretization is critical for phase change problems with gravity"],
    }),

    sec("Initialization & Solution Strategy", [
      "**Initialize:**",
      isMelting ? "- Patch temperature: set initial solid region to T_cold, liquid region (if any) to T_hot" : "- Set domain to liquid phase, at subcooled or saturation temperature",
      isMelting ? "- Patch liquid fraction = 0 everywhere (all solid initially)" : "- Volume fraction: liquid = 1 everywhere initially",
      "",
      "**Time Stepping:**",
      `- Start with small Δt: ${isMelting ? "0.1-1 s (depending on Stefan number)" : "10⁻⁴ to 10⁻³ s for boiling/condensation"}`,
      "- Max Iterations per Time Step: 20-30",
      "- Adaptive time stepping recommended (increase Δt once solution stabilizes)",
      "",
      isMelting ? "" : "**Courant Number:** Keep VOF Courant < 0.5 for explicit scheme (Geo-Reconstruct)",
      "",
      "**Monitors:**",
      isMelting ? "- Liquid fraction (area-weighted average or volume integral)" : "- Volume fraction of vapor phase",
      "- Total heat transfer rate at heated/cooled wall",
      isMelting ? "- Melt front position over time" : "- Vapor generation rate",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Solution → Initialization",
        ...(isMelting ? ["Patch → Liquid Fraction"] : ["Patch → Volume Fraction"]),
        "Solution → Run Calculation",
      ],
      warnings: [
        "Phase change simulations can take thousands of time steps — plan for long run times",
        "If diverging, reduce time step by factor of 10",
      ],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Temperature field",
      isMelting ? "- Liquid fraction (shows melt front position)" : "- Volume fraction (shows liquid-vapor interface)",
      "- Velocity vectors (show convection patterns)",
      "",
      "**Animation:**",
      "- Create transient animation of phase front evolution",
      isMelting ? "- Liquid fraction contour vs. time" : "- Bubble formation and departure (for boiling)",
      "",
      "**Key Results:**",
      isMelting ? [
        "- Melting rate (liquid fraction vs. time curve)",
        "- Melt front position at various times",
        "- Nu number on hot wall vs. time/Fo",
        "- Compare with Gau & Viskanta (1986) for gallium melting benchmark",
      ].join("\n") : [
        "- Heat transfer coefficient vs. wall superheat",
        "- Vapor volume fraction along channel (for flow boiling)",
        "- Heat flux vs. time",
        "- Compare with correlations (Rohsenow for nucleate boiling, Nusselt for film condensation)",
      ].join("\n"),
    ].join("\n"), {
      fluentMenuPaths: [
        "Results → Contours",
        "Results → Animations → Solution Animation → Create",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "- **Energy conservation:** check heat balance (Reports → Fluxes) — heat in = latent heat + sensible heat change",
      isMelting ? "- **Liquid fraction** should monotonically increase (melting) or decrease (solidification)" : "- **Vapor fraction** should increase along heated channel (flow boiling)",
      "- **Temperature at phase front** should be ≈ T_sat (or T_melt)",
      isMelting ? [
        "- **Natural convection in melt:** melt front should be curved (not flat) due to buoyancy",
        "- Compare with analytical Stefan solution for 1D case: s(t) = 2λ√(αt)",
      ].join("\n") : [
        "- **Bubble departure diameter** and frequency should be physically reasonable",
        "- **Condensate film thickness** should match Nusselt theory for film condensation",
      ].join("\n"),
      "- **Mass conservation:** total mass of all phases should be constant (for closed systems)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Reports → Fluxes"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Divergence / instability:**",
      "- Reduce time step (most common fix)",
      "- Use PISO scheme instead of SIMPLE",
      "- Reduce under-relaxation factors",
      isMelting ? "- Reduce mushy zone constant from 10⁵ to 10⁴" : "- Reduce Lee model coefficient",
      "",
      isMelting ? [
        "**No melting observed:**",
        "- Ensure Solidification/Melting model is enabled",
        "- Check T_hot > T_melt",
        "- Verify latent heat value (J/kg, not kJ/kg)",
      ].join("\n") : [
        "**No phase change observed:**",
        "- Ensure Lee model mass transfer is defined for the correct phase pair",
        "- Check that wall temperature exceeds T_sat (for boiling) or is below T_sat (for condensation)",
        "- Verify VOF model has both phases defined correctly",
      ].join("\n"),
      "",
      "**Spurious velocities / currents:**",
      "- Common in VOF simulations near interface — reduce Courant number",
      "- Use Implicit Body Force treatment",
      "",
      "**Very slow computation:**",
      "- Phase change problems are inherently expensive — 2D first, then 3D if needed",
      "- Consider symmetry to reduce domain size",
    ].join("\n"), {
      tips: [
        "Start with a simple 1D or 2D benchmark case to validate your phase change setup before tackling the full problem",
        "Save case/data files frequently — phase change simulations are prone to divergence after running for hours",
      ],
    }),
  ];
}

function templateCompressibleFlow(text: string): WorkflowSection[] {
  const transient = isTransient(text);
  const lower = text.toLowerCase();
  const isNozzle = lower.includes("nozzle") || lower.includes("converging") || lower.includes("de laval") || lower.includes("convergent");
  const isShockTube = lower.includes("shock tube");
  const isJet = lower.includes("jet") || lower.includes("supersonic jet");
  const hasShock = lower.includes("shock") || lower.includes("normal shock") || lower.includes("oblique shock");
  const heated = hasHeating(text);
  const flowType = isNozzle ? "nozzle flow" : isShockTube ? "shock tube flow" : isJet ? "supersonic jet" : "compressible flow";

  return [
    sec("Problem Summary", `Compressible ${flowType} — ${hasShock ? "with shock waves, " : ""}${heated ? "with heat transfer, " : ""}${transient ? "transient" : "steady-state"}. Density-based solver recommended for supersonic flows.`),

    sec("Governing Physics", [
      "Compressible flow governed by:",
      "- Compressible Navier-Stokes equations (density varies significantly)",
      "- Energy equation is mandatory (temperature changes from compression/expansion)",
      "- Equation of state: ideal gas (ρ = P/(RT))",
      "",
      "**Key parameters:**",
      "- Mach number: M = V/a (a = speed of sound = √(γRT))",
      "- M < 0.3: incompressible, 0.3 < M < 0.8: subsonic, 0.8 < M < 1.2: transonic, M > 1.2: supersonic",
      "- Ratio of specific heats: γ = cₚ/cᵥ (1.4 for air)",
      "",
      isNozzle ? [
        "**Isentropic nozzle relations:**",
        "- A/A* = (1/M)[(2/(γ+1))(1 + (γ-1)/2 M²)]^((γ+1)/(2(γ-1)))",
        "- Critical (throat) conditions at M = 1",
      ].join("\n") : "",
      hasShock ? [
        "**Normal shock relations:**",
        "- M₂² = [(γ-1)M₁² + 2] / [2γM₁² - (γ-1)]",
        "- P₂/P₁ = 1 + 2γ/(γ+1)(M₁² - 1)",
        "- Entropy increases across shock (irreversible)",
      ].join("\n") : "",
    ].filter(Boolean).join("\n")),

    sec("Assumptions", [
      "- Compressible flow (Mach > 0.3)",
      "- Ideal gas equation of state",
      "- Calorically perfect gas (constant γ, cₚ) unless high-temperature effects needed",
      "- Adiabatic walls (unless heat transfer specified)",
      isNozzle ? "- Quasi-1D isentropic flow (for comparison) — CFD captures 2D/3D effects" : "",
      isShockTube ? "- Initial diaphragm separates high-pressure and low-pressure regions" : "",
      "- Viscous effects included (boundary layers on walls)",
    ].filter(Boolean).join("\n")),

    sec("Required Inputs", [
      "- Gas properties: γ, R (or molecular weight), cₚ, viscosity",
      "- Total (stagnation) conditions: P₀, T₀ at inlet",
      "- Exit or back pressure (controls shock location in nozzles)",
      isNozzle ? "- Nozzle geometry: inlet area, throat area (A*), exit area, area ratio A_exit/A*" : "",
      isShockTube ? "- Initial conditions: P₄/P₁ (driver/driven pressure ratio), T₁, T₄" : "",
      isJet ? "- Nozzle exit conditions: P_exit, T_exit, M_exit" : "",
      "- Domain dimensions",
    ].filter(Boolean).join("\n")),

    sec("Material Properties", [
      "**Gas (typically air):**",
      "- Density: Ideal Gas (MANDATORY for compressible flow)",
      "- Molecular Weight: 28.966 kg/kmol (for air)",
      "- Specific Heat: 1006.43 J/(kg·K) (constant for caloricaly perfect gas)",
      "- γ = cₚ/cᵥ = 1.4 (for air)",
      "- Thermal Conductivity: 0.0242 W/(m·K)",
      "- Dynamic Viscosity: 1.789×10⁻⁵ Pa·s (or Sutherland's law for temperature-dependent)",
      "",
      "**Viscosity (for high-temperature flows):**",
      "- Sutherland's law: μ = μ_ref (T/T_ref)^(3/2) (T_ref + S)/(T + S)",
      "- For air: μ_ref = 1.716×10⁻⁵, T_ref = 273.11 K, S = 110.56 K",
    ].join("\n"), {
      fluentMenuPaths: [
        "Materials → Fluid → air → Properties → Density → Ideal Gas",
        "Materials → Fluid → air → Properties → Viscosity → Sutherland",
      ],
      warnings: ["Density MUST be set to Ideal Gas (not constant) for compressible flow — this is the most critical setting"],
    }),

    sec("Geometry Guidance", [
      isNozzle ? [
        "**Converging-Diverging Nozzle:**",
        "- 2D axisymmetric recommended (axis along flow direction)",
        "- Define nozzle contour: converging section → throat → diverging section",
        "- Inlet plenum: extend 2-3× inlet diameter upstream",
        "- Outlet: extend 5-10× exit diameter downstream to capture shock/expansion pattern",
        "",
        "**Key dimensions:**",
        "- Throat radius/height defines A*",
        "- Area ratio A_exit/A* determines design Mach number",
      ].join("\n") : "",
      isShockTube ? [
        "**Shock Tube:**",
        "- 1D geometry (long tube, 2D axisymmetric or narrow 2D planar)",
        "- Driver section (high pressure) + driven section (low pressure)",
        "- Total length: L_driver + L_driven (typically L_total = 1-10 m)",
        "- Diaphragm location: interface between the two regions (use patch for IC)",
      ].join("\n") : "",
      isJet ? [
        "**Supersonic Jet:**",
        "- 2D axisymmetric: nozzle + downstream domain",
        "- Downstream domain: 20-30× nozzle diameter in length, 10-15× in radius",
        "- Include nozzle geometry for accurate exit profile",
      ].join("\n") : "",
      "",
      !isNozzle && !isShockTube && !isJet ? [
        "**General compressible flow domain:**",
        "- Extend domain sufficiently upstream and downstream of features",
        "- 2D axisymmetric for bodies of revolution",
        "- Account for shock stand-off distance if bow shocks expected",
      ].join("\n") : "",
    ].filter(Boolean).join("\n"), {
      tips: ["For axisymmetric nozzles, use 2D axisymmetric to save computation time significantly"],
    }),

    sec("Meshing Guidance", [
      "**Compressible flow requires fine mesh where shocks and expansion waves occur:**",
      "",
      "**General guidelines:**",
      "- Structured quad mesh strongly recommended (better shock resolution)",
      "- Fine mesh in throat region (if nozzle): 50-100 cells across throat",
      "- Fine mesh where shocks are expected: cell size ≈ 0.5-1% of characteristic length",
      "- Near walls: y+ ≈ 1 for turbulent BL (k-omega SST), or 15-20 cells across BL for laminar",
      "",
      isNozzle ? "**Nozzle mesh:** cluster cells near throat and diverging section where shocks form" : "",
      isShockTube ? "**Shock tube mesh:** uniform fine mesh (Δx = L/1000 to L/5000) to resolve moving shocks" : "",
      "",
      "**Total cells:** 50,000-500,000 for 2D, millions for 3D",
      "",
      "**Quality:** Orthogonal quality > 0.8 (critical for density-based solver stability)",
      "- Minimize cell stretching in flow direction where shocks occur",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Mesh → Check"],
      warnings: [
        "Shocks are captured over 2-3 cells — if cells are too coarse, shocks will be smeared",
        "Density-based solver is sensitive to mesh quality — avoid high skewness",
      ],
    }),

    sec("Solver Setup", [
      "**General:**",
      "- Solver Type: Density-Based (recommended for supersonic flow)",
      "  - Or Pressure-Based with coupled solver for mildly compressible flows (M < 2)",
      `- Time: ${transient ? "Transient" : "Steady"}`,
      "- 2D Space: Axisymmetric (if applicable)",
      "",
      "**Models:**",
      "- Energy: ON (mandatory for compressible flow)",
      "- Viscous: k-omega SST (turbulent) or Laminar",
      "  - For inviscid analysis: Viscous → Inviscid",
      "",
      "**Operating Conditions:**",
      "- Operating Pressure: 0 Pa (use absolute pressures everywhere)",
      "  - This is crucial for compressible flow — always work with absolute pressures",
    ].join("\n"), {
      fluentMenuPaths: [
        "Setup → General → Solver → Density-Based",
        "Setup → Models → Energy → ON",
        "Setup → General → Operating Conditions → Operating Pressure → 0",
      ],
      warnings: [
        "Set Operating Pressure to 0 Pa for compressible flow — all pressures must be absolute",
        "Density-Based solver MUST have Energy ON — it cannot run without it for compressible flows",
      ],
    }),

    sec("Boundary Conditions", [
      isNozzle ? [
        "**Inlet (plenum):**",
        "- Pressure-Inlet (stagnation conditions)",
        "- Total Pressure: P₀ [Pa absolute]",
        "- Total Temperature: T₀ [K]",
        "- Supersonic/Initial Gauge Pressure: estimate static P from isentropic relations",
        "",
        "**Outlet:**",
        "- Pressure-Outlet",
        "- Back Pressure: P_back [Pa absolute]",
        "- If supersonic at outlet: back pressure is not felt (supersonic exit — extrapolated)",
      ].join("\n") : "",
      isShockTube ? [
        "**Left end wall:** Wall (closed end of driver section)",
        "**Right end wall:** Wall (closed end of driven section)",
        "- No inlet/outlet BCs needed — this is an initial value problem",
        "- Use Patch to set initial P and T in each section",
      ].join("\n") : "",
      isJet ? [
        "**Nozzle inlet:**",
        "- Pressure-Inlet: P₀, T₀",
        "",
        "**Far-field / ambient:**",
        "- Pressure-Far-Field or Pressure-Outlet at ambient conditions",
        "- Set Mach = 0 and P = P_ambient, T = T_ambient for quiescent surroundings",
      ].join("\n") : "",
      !isNozzle && !isShockTube && !isJet ? [
        "**Inlet:**",
        "- Pressure-Inlet with total conditions (P₀, T₀)",
        "- Or Pressure-Far-Field with Mach number, P_static, T_static",
        "",
        "**Outlet:**",
        "- Pressure-Outlet with back pressure",
      ].join("\n") : "",
      "",
      "**Walls:**",
      "- No-slip (viscous) or slip (inviscid)",
      heated ? "- Thermal: specified temperature or heat flux" : "- Thermal: Adiabatic (default for compressible flows)",
      "",
      "**Axis (if axisymmetric):** Axis boundary",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Setup → Boundary Conditions → Pressure-Inlet",
        "Setup → Boundary Conditions → Pressure-Outlet",
      ],
      tips: [
        "For nozzles: use Pressure-Inlet (NOT Velocity-Inlet) for compressible flow — stagnation conditions are required",
        "Back pressure controls the flow regime in nozzles: high P_back = subsonic, low P_back = supersonic with shocks",
      ],
    }),

    sec("Solution Methods", [
      "**Density-Based Solver Settings:**",
      "- Formulation: Implicit (more stable, recommended) or Explicit (for time-accurate transient)",
      "- Flux Type: Roe-FDS (robust) or AUSM (good for shocks)",
      "",
      "**Spatial Discretization:**",
      "- Flow: Second Order Upwind (or Third Order MUSCL for better shock resolution)",
      "- Gradient: Least Squares Cell Based",
      heated ? "- Energy included in coupled flow equations (density-based)" : "",
      "",
      transient ? [
        "**Transient Settings:**",
        "- Time Step: Δt based on CFL condition (CFL ≈ 1 for explicit, can be higher for implicit)",
        "- Δt = CFL × Δx / (|V| + a) where a = speed of sound",
      ].join("\n") : [
        "**Courant Number (CFL):**",
        "- Start with CFL = 1-5 (implicit)",
        "- Increase gradually to 20-100 as solution stabilizes",
        "- If diverging, reduce CFL",
      ].join("\n"),
    ].join("\n"), {
      fluentMenuPaths: [
        "Solution → Methods → Formulation → Implicit",
        "Solution → Methods → Flux Type → Roe-FDS",
        "Solution → Controls → Courant Number",
      ],
    }),

    sec("Initialization & Solution Strategy", [
      isShockTube ? [
        "**Shock Tube Initialization:**",
        "1. Initialize entire domain with driven (low pressure) conditions",
        "2. Patch driver section with high-pressure conditions:",
        "   - Patch → Pressure = P₄, Temperature = T₄ in driver region",
        "3. Run transient simulation",
      ].join("\n") : [
        "**Initialization:**",
        "- Hybrid Initialization, or",
        "- Standard: set values from inlet conditions",
        "- For nozzle: initialize with subsonic conditions throughout",
      ].join("\n"),
      "",
      "**Solution Strategy:**",
      transient ? [
        "- Start with CFL = 1, run several time steps",
        "- Monitor shock positions and flow features",
        isShockTube ? "- Total time: t = L / (2a) to capture full wave system" : "",
      ].filter(Boolean).join("\n") : [
        "- Start with CFL = 1-5",
        "- Run 1000 iterations, check for stability",
        "- Gradually increase CFL to 20-100",
        "- Total iterations: 5000-20000 (compressible flows converge slowly)",
      ].join("\n"),
      "",
      "**If diverging:**",
      "- Reduce CFL to 0.5-1",
      "- Switch to first-order discretization temporarily",
      "- Check for negative temperatures or pressures in initial field",
    ].join("\n"), {
      fluentMenuPaths: [
        "Solution → Initialization",
        ...(isShockTube ? ["Solution → Initialization → Patch"] : []),
        "Solution → Run Calculation",
      ],
    }),

    sec("Post-Processing", [
      "**Contour Plots:**",
      "- Mach number (most important for compressible flow)",
      "- Pressure (absolute)",
      "- Temperature",
      "- Density",
      hasShock ? "- Density gradient magnitude (shows shock locations clearly)" : "",
      "",
      "**XY Plots:**",
      isNozzle ? [
        "- Mach number along centerline (compare with isentropic area-Mach relation)",
        "- Static pressure along centerline",
        "- Static pressure along nozzle wall",
      ].join("\n") : "",
      isShockTube ? [
        "- Pressure, temperature, velocity, density along tube length at various times",
        "- Compare with exact Riemann solution (Sod's problem)",
      ].join("\n") : "",
      isJet ? "- Centerline Mach number decay, jet spreading rate" : "",
      "",
      "**Key Results:**",
      isNozzle ? "- Throat Mach number (should be 1.0 for choked flow)" : "",
      isNozzle ? "- Exit Mach number and pressure ratio" : "",
      hasShock ? "- Shock location and strength (P₂/P₁ across shock)" : "",
      "- Mass flow rate (should match isentropic choked mass flow: ṁ = P₀A*√(γ/(RT₀))×[2/(γ+1)]^((γ+1)/(2(γ-1))))",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: [
        "Results → Contours → Velocity → Mach Number",
        "Results → Contours → Density",
        "Results → Plots → XY Plot",
      ],
    }),

    sec("Sanity Checks / Validation", [
      "- **Mass flow rate** should match isentropic prediction for choked nozzle",
      "- **Mach 1 at throat** (converging-diverging nozzle, if choked)",
      "- **Stagnation quantities conserved** across isentropic regions (T₀, P₀ constant along streamlines)",
      hasShock ? "- **Shock jump conditions** match Rankine-Hugoniot relations" : "",
      isNozzle ? "- **Pressure ratios** match isentropic tables for given area ratio and exit Mach" : "",
      isShockTube ? "- **Shock speed, contact discontinuity, expansion fan** match exact Riemann solution" : "",
      "- **Total temperature** should be constant for adiabatic flows (check across domain)",
      "- **No negative pressures or temperatures** (indicates numerical issues)",
    ].filter(Boolean).join("\n"), {
      fluentMenuPaths: ["Results → Reports → Surface Integrals"],
      warnings: ["If total temperature is not constant in adiabatic regions, the solution is not grid-converged or has numerical errors"],
    }),

    sec("Common Errors & Troubleshooting", [
      "**Operating Pressure not set to 0:**",
      "- Most common error — causes completely wrong results for compressible flow",
      "- All pressures must be absolute when Operating Pressure = 0",
      "",
      "**Density not set to Ideal Gas:**",
      "- Compressible flow REQUIRES variable density — constant density gives wrong results",
      "",
      "**Divergence / negative pressure:**",
      "- Reduce CFL (Courant number) to 0.5-1",
      "- Use first-order discretization initially",
      "- Check initial conditions — avoid patching M > 1 in wrong regions",
      "- Ensure boundary pressures are consistent with flow direction",
      "",
      "**Shock captured too thick / smeared:**",
      "- Refine mesh in shock region",
      "- Use higher-order flux scheme (MUSCL, AUSM+up)",
      "- Shock will always span 2-3 cells minimum",
      "",
      isNozzle ? [
        "**Wrong flow regime in nozzle:**",
        "- Check back pressure ratio: P_back/P₀ determines subsonic/supersonic/shock",
        "- If fully supersonic exit expected, P_back must be low enough",
        "- Normal shock in diverging section if P_back is between isentropic and subsonic values",
      ].join("\n") : "",
      "",
      "**Energy equation convergence:**",
      "- Energy is tightly coupled in compressible flow — cannot be disabled",
      "- If energy residual is high, reduce CFL and ensure consistent initial conditions",
    ].filter(Boolean).join("\n"), {
      tips: [
        "Always validate with a simple case first: e.g., isentropic nozzle flow with known analytical solution",
        "For shock tubes, Sod's problem (1978) is the standard benchmark — exact solution is well-documented",
        "Plot Mach number contours first — they immediately show if your solution makes physical sense",
      ],
    }),
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
  "conduction": templateConduction,
  "radiation": templateRadiation,
  "fin-heat-transfer": templateFinHeatTransfer,
  "porous-media": templatePorousMedia,
  "boiling-condensation": templateBoilingCondensation,
  "compressible-flow": templateCompressibleFlow,
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
          "- Including keywords like: pipe flow, external flow, natural convection, heat exchanger, lid-driven cavity, backward-facing step, conduction, radiation, fin, porous, boiling, compressible",
          "- Describing the geometry (pipe, cylinder, plate, enclosure, nozzle, fin)",
          "- Mentioning the physics (buoyancy, forced convection, conjugate heat transfer, phase change, supersonic)",
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
          "9. Heat Conduction",
          "10. Radiation Heat Transfer",
          "11. Fin & Extended Surface Heat Transfer",
          "12. Porous Media Flow",
          "13. Boiling & Condensation (Phase Change)",
          "14. Compressible / Supersonic Flow",
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

// ---------------------------------------------------------------------------
// Pre-analysis: detect type + generate clarifying questions
// ---------------------------------------------------------------------------

function generateClarifications(type: Exclude<ProblemType, "unknown">, text: string, hasImage: boolean): ClarificationQuestion[] {
  const q: ClarificationQuestion[] = [];
  const lower = text.toLowerCase();

  const hasNum = (kw: string) => extractNumber(text, kw, -1) !== -1;
  const hasWord = (...kws: string[]) => kws.some((k) => lower.includes(k));

  // --- Common questions ---

  if (!hasWord("water", "air", "oil", "mercury", "glycerin", "ethylene glycol", "refrigerant", "steam", "nitrogen")) {
    q.push({
      id: "fluid",
      question: hasImage
        ? "What working fluid is used in the system shown in your image?"
        : "What working fluid is being used?",
      hint: "e.g., water, air, engine oil, ethylene glycol",
      type: "select",
      options: ["Water", "Air", "Engine Oil", "Ethylene Glycol", "Other (specify in description)"],
      required: true,
    });
  }

  if (!hasWord("steady", "transient", "unsteady", "time-dependent", "time dependent")) {
    q.push({
      id: "time",
      question: "Is this a steady-state or transient (time-dependent) problem?",
      type: "select",
      options: ["Steady-state", "Transient"],
      required: true,
    });
  }

  if (!hasWord("laminar", "turbulent") && !hasNum("reynolds") && !hasNum("re")) {
    q.push({
      id: "regime",
      question: "Is the flow laminar or turbulent? (or provide the Reynolds number)",
      hint: "If unsure, provide the Reynolds number and we'll determine the regime",
      type: "select",
      options: ["Laminar", "Turbulent", "I don't know — determine from Reynolds number"],
      required: true,
    });
  }

  // --- Problem-type-specific questions ---

  switch (type) {
    case "pipe-flow":
      if (!hasNum("diameter") && !hasNum("radius") && !hasWord("diameter", "radius", "mm", "cm")) {
        q.push({
          id: "diameter",
          question: hasImage
            ? "What is the pipe diameter shown in the image?"
            : "What is the pipe diameter?",
          hint: "e.g., 25 mm, 0.05 m, 2 inches",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("length") && !hasWord("length")) {
        q.push({
          id: "length",
          question: "What is the pipe length?",
          hint: "e.g., 2 m, 500 mm",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("velocity") && !hasNum("flow rate") && !hasNum("mass flow")) {
        q.push({
          id: "velocity",
          question: "What is the inlet velocity or flow rate?",
          hint: "e.g., 1.5 m/s, 0.5 kg/s, 10 L/min",
          type: "text",
          required: true,
        });
      }
      if (!hasWord("heated", "heat", "constant temperature", "heat flux", "adiabatic", "isothermal", "hot", "cold")) {
        q.push({
          id: "thermal_bc",
          question: hasImage
            ? "Looking at your image — is the pipe wall heated? If so, what boundary condition?"
            : "Is the pipe heated? If so, is it constant wall temperature or constant heat flux?",
          type: "select",
          options: ["Constant wall temperature", "Constant heat flux", "Adiabatic (no heating)"],
          required: true,
        });
      }
      if (hasWord("heat", "heated", "hot", "temperature") && !hasNum("temperature") && !hasNum("heat flux")) {
        q.push({
          id: "thermal_value",
          question: "What is the wall temperature or heat flux value? Also, what is the inlet temperature?",
          hint: "e.g., Wall: 80°C, Inlet: 20°C, or Heat flux: 5000 W/m²",
          type: "text",
          required: true,
        });
      }
      break;

    case "external-flow":
      if (!hasWord("cylinder", "sphere", "flat plate", "plate", "airfoil", "body")) {
        q.push({
          id: "body_shape",
          question: hasImage
            ? "What is the shape of the body shown in your image?"
            : "What is the shape of the body in the flow? (cylinder, flat plate, sphere, etc.)",
          type: "select",
          options: ["Circular cylinder", "Flat plate", "Sphere", "Airfoil", "Other"],
          required: true,
        });
      }
      if (!hasNum("diameter") && !hasNum("length") && !hasNum("chord")) {
        q.push({
          id: "dimension",
          question: "What is the characteristic dimension of the body?",
          hint: "e.g., diameter = 10 mm (for cylinder), length = 0.5 m (for plate)",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("velocity") && !hasNum("freestream")) {
        q.push({
          id: "freestream",
          question: "What is the freestream velocity?",
          hint: "e.g., 5 m/s, or specify Re instead",
          type: "text",
          required: true,
        });
      }
      break;

    case "natural-convection":
      if (!hasWord("enclosure", "cavity", "vertical plate", "vertical wall", "horizontal")) {
        q.push({
          id: "geometry",
          question: hasImage
            ? "Based on your image, is this an enclosed cavity or an open-domain (e.g., vertical plate) problem?"
            : "Is this a closed enclosure or an open-domain problem (e.g., vertical plate)?",
          type: "select",
          options: ["Enclosed cavity / enclosure", "Vertical plate (open domain)", "Horizontal plate", "Other"],
          required: true,
        });
      }
      if (!hasNum("temperature") && !hasWord("°c", "°k", "kelvin")) {
        q.push({
          id: "temperatures",
          question: "What are the hot and cold wall temperatures?",
          hint: "e.g., Hot wall: 60°C, Cold wall: 20°C",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("height") && !hasNum("width") && !hasNum("length")) {
        q.push({
          id: "dimensions",
          question: "What are the dimensions of the enclosure or plate?",
          hint: "e.g., H = 0.5 m, W = 0.5 m",
          type: "text",
          required: true,
        });
      }
      break;

    case "forced-convection":
      if (!hasWord("pipe", "channel", "plate", "duct", "tube", "flat plate")) {
        q.push({
          id: "geometry",
          question: hasImage
            ? "What type of geometry is shown in your image?"
            : "What is the flow geometry? (pipe/channel/plate/duct)",
          type: "select",
          options: ["Pipe / tube", "Rectangular channel", "Flat plate", "Other"],
          required: true,
        });
      }
      if (!hasNum("velocity") && !hasNum("flow rate") && !hasNum("reynolds")) {
        q.push({
          id: "velocity",
          question: "What is the flow velocity or Reynolds number?",
          type: "text",
          required: true,
        });
      }
      if (!hasWord("constant temperature", "heat flux", "constant heat") && !hasNum("temperature")) {
        q.push({
          id: "thermal_bc",
          question: "What is the wall thermal boundary condition?",
          type: "select",
          options: ["Constant wall temperature", "Constant heat flux"],
          required: true,
        });
      }
      break;

    case "conjugate-heat-transfer":
      if (!hasWord("aluminum", "steel", "copper", "silicon", "pcb", "solid material")) {
        q.push({
          id: "solid_material",
          question: hasImage
            ? "What is the solid material shown in your image?"
            : "What is the solid material?",
          hint: "e.g., aluminum, steel, copper, silicon",
          type: "select",
          options: ["Aluminum", "Steel", "Copper", "Silicon", "Other"],
          required: true,
        });
      }
      if (!hasWord("heat generation", "heat source", "power", "watt")) {
        q.push({
          id: "heat_source",
          question: "Is there volumetric heat generation in the solid? If yes, what is the power?",
          hint: "e.g., 10 W, 50000 W/m³, or 'heated from external wall'",
          type: "text",
          required: true,
        });
      }
      break;

    case "heat-exchanger":
      if (!hasWord("counter", "parallel", "cross", "shell and tube", "double pipe")) {
        q.push({
          id: "hx_type",
          question: hasImage
            ? "What type of heat exchanger is shown in your image?"
            : "What type of heat exchanger is this?",
          type: "select",
          options: ["Double-pipe (counter-flow)", "Double-pipe (parallel-flow)", "Shell-and-tube", "Cross-flow", "Other"],
          required: true,
        });
      }
      if (!hasNum("temperature")) {
        q.push({
          id: "temperatures",
          question: "What are the inlet temperatures of the hot and cold fluids?",
          hint: "e.g., Hot fluid: 90°C, Cold fluid: 20°C",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("flow rate") && !hasNum("velocity") && !hasNum("mass flow")) {
        q.push({
          id: "flow_rates",
          question: "What are the flow rates for each fluid?",
          hint: "e.g., Hot: 0.5 kg/s, Cold: 0.8 kg/s",
          type: "text",
          required: true,
        });
      }
      break;

    case "lid-driven-cavity":
      if (!hasNum("reynolds") && !hasNum("re") && !hasNum("velocity")) {
        q.push({
          id: "reynolds",
          question: "What Reynolds number (or lid velocity) should be used?",
          hint: "Common benchmark values: Re = 100, 400, 1000, 3200, 5000, 10000",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("length") && !hasNum("side") && !hasNum("dimension")) {
        q.push({
          id: "size",
          question: "What is the cavity size (side length)?",
          hint: "e.g., 1 m (common for benchmarks — use ρ and μ to set Re)",
          type: "text",
          required: false,
        });
      }
      break;

    case "backward-facing-step":
      if (!hasNum("step height") && !hasNum("height") && !hasWord("step height")) {
        q.push({
          id: "step_height",
          question: hasImage
            ? "What is the step height shown in your image?"
            : "What is the step height (h)?",
          hint: "e.g., 10 mm, 0.05 m",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("expansion") && !hasWord("expansion ratio")) {
        q.push({
          id: "expansion_ratio",
          question: "What is the expansion ratio (H_outlet / H_inlet)?",
          hint: "Common value: 2 (step height equals inlet height)",
          type: "text",
          required: false,
        });
      }
      if (!hasNum("velocity") && !hasNum("reynolds")) {
        q.push({
          id: "velocity",
          question: "What is the inlet velocity or Reynolds number?",
          type: "text",
          required: true,
        });
      }
      break;

    case "conduction":
      if (!hasWord("planar", "cylindrical", "spherical", "wall", "cylinder", "sphere", "slab", "plate")) {
        q.push({
          id: "geometry",
          question: hasImage
            ? "What is the geometry of the solid body shown in your image?"
            : "What is the geometry of the solid? (planar wall, cylinder, sphere, etc.)",
          type: "select",
          options: ["Planar wall / slab", "Cylindrical (pipe/tube wall)", "Spherical shell", "2D or 3D block", "Other"],
          required: true,
        });
      }
      if (!hasWord("composite", "multilayer", "multi-layer", "single layer", "homogeneous")) {
        q.push({
          id: "layers",
          question: "Is this a single-material solid or a composite (multi-layer) wall?",
          type: "select",
          options: ["Single material", "Composite / multi-layer"],
          required: true,
        });
      }
      if (!hasWord("aluminum", "steel", "copper", "brick", "insulation", "glass", "concrete", "wood")) {
        q.push({
          id: "material",
          question: "What is the solid material?",
          hint: "e.g., steel, aluminum, brick, insulation, copper",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("temperature") && !hasNum("heat flux") && !hasWord("convection")) {
        q.push({
          id: "boundary_conditions",
          question: "What are the boundary conditions on the surfaces?",
          hint: "e.g., T = 100°C on left, convection h = 25 W/(m²·K) on right, adiabatic on top/bottom",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("thickness") && !hasNum("length") && !hasNum("radius") && !hasNum("diameter")) {
        q.push({
          id: "dimensions",
          question: "What are the dimensions of the solid?",
          hint: "e.g., thickness = 20 cm, or inner radius = 5 cm, outer radius = 10 cm",
          type: "text",
          required: true,
        });
      }
      break;

    case "radiation":
      if (!hasWord("s2s", "surface to surface", "do model", "discrete ordinates", "p1", "participating")) {
        q.push({
          id: "rad_model",
          question: "What type of radiation is involved?",
          type: "select",
          options: [
            "Surface-to-surface (opaque surfaces, transparent medium)",
            "Participating media (absorbing/emitting gas, e.g., combustion)",
            "Combined surface + participating media",
            "Not sure",
          ],
          required: true,
        });
      }
      if (!hasWord("enclosure", "furnace", "cavity", "open", "oven")) {
        q.push({
          id: "geometry",
          question: hasImage
            ? "Is the geometry shown an enclosed space or open surfaces?"
            : "Is this an enclosed space (furnace, cavity) or open surfaces radiating to surroundings?",
          type: "select",
          options: ["Enclosed space (furnace, cavity, oven)", "Open surfaces radiating to surroundings"],
          required: true,
        });
      }
      if (!hasNum("emissivity") && !hasWord("emissivity", "blackbody", "black body", "gray")) {
        q.push({
          id: "emissivity",
          question: "What are the surface emissivities?",
          hint: "e.g., ε = 0.8 for oxidized steel, ε = 0.95 for painted surfaces",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("temperature")) {
        q.push({
          id: "temperatures",
          question: "What are the surface temperatures or heat flux conditions?",
          hint: "e.g., hot wall at 500°C, cold wall at 100°C",
          type: "text",
          required: true,
        });
      }
      break;

    case "fin-heat-transfer":
      if (!hasWord("rectangular", "pin", "annular", "cylindrical", "plate fin", "spine")) {
        q.push({
          id: "fin_type",
          question: hasImage
            ? "What type of fin is shown in your image?"
            : "What type of fin is this?",
          type: "select",
          options: ["Rectangular / plate fin", "Pin fin (cylindrical)", "Annular fin", "Triangular / tapered fin", "Other"],
          required: true,
        });
      }
      if (!hasWord("array", "heat sink", "single fin")) {
        q.push({
          id: "fin_config",
          question: "Is this a single fin or a fin array / heat sink?",
          type: "select",
          options: ["Single fin", "Fin array / heat sink"],
          required: true,
        });
      }
      if (!hasNum("length") && !hasNum("height") && !hasWord("fin length")) {
        q.push({
          id: "fin_dimensions",
          question: "What are the fin dimensions?",
          hint: "e.g., length = 50 mm, thickness = 2 mm, width = 100 mm",
          type: "text",
          required: true,
        });
      }
      if (!hasWord("aluminum", "steel", "copper") && !hasNum("conductivity")) {
        q.push({
          id: "fin_material",
          question: "What is the fin material?",
          type: "select",
          options: ["Aluminum", "Copper", "Steel", "Other"],
          required: true,
        });
      }
      if (!hasNum("temperature") && !hasNum("base temperature")) {
        q.push({
          id: "temperatures",
          question: "What is the fin base temperature and the ambient temperature?",
          hint: "e.g., base = 80°C, ambient = 25°C",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("convection") && !hasNum("heat transfer coefficient")) {
        q.push({
          id: "htc",
          question: "Is the convection coefficient (h) given, or should CFD determine it from the flow field?",
          hint: "e.g., h = 50 W/(m²·K), or 'determine from flow'",
          type: "text",
          required: false,
        });
      }
      break;

    case "porous-media":
      if (!hasWord("packed bed", "filter", "catalytic", "foam", "pebble", "sand")) {
        q.push({
          id: "porous_type",
          question: hasImage
            ? "What type of porous medium is shown in your image?"
            : "What type of porous medium is this?",
          type: "select",
          options: ["Packed bed (spherical particles)", "Filter / membrane", "Catalytic converter", "Metal foam", "Other"],
          required: true,
        });
      }
      if (!hasNum("porosity")) {
        q.push({
          id: "porosity",
          question: "What is the porosity (void fraction) of the porous medium?",
          hint: "e.g., 0.4 for random packed spheres, 0.9 for metal foam",
          type: "text",
          required: true,
        });
      }
      if (!hasNum("diameter") && !hasNum("particle") && !hasWord("particle diameter")) {
        q.push({
          id: "particle_size",
          question: "What is the particle/pore diameter (if applicable)?",
          hint: "e.g., 5 mm spheres for packed bed",
          type: "text",
          required: false,
        });
      }
      if (!hasNum("velocity") && !hasNum("flow rate")) {
        q.push({
          id: "velocity",
          question: "What is the inlet flow velocity or flow rate?",
          type: "text",
          required: true,
        });
      }
      break;

    case "boiling-condensation":
      if (!hasWord("boiling", "condensation", "melting", "solidification", "evaporation")) {
        q.push({
          id: "phase_change_type",
          question: "What type of phase change is involved?",
          type: "select",
          options: ["Boiling (liquid → vapor)", "Condensation (vapor → liquid)", "Melting (solid → liquid)", "Solidification (liquid → solid)"],
          required: true,
        });
      }
      if (lower.includes("boiling") && !hasWord("pool boiling", "flow boiling", "nucleate", "film boiling")) {
        q.push({
          id: "boiling_type",
          question: "What type of boiling?",
          type: "select",
          options: ["Pool boiling (stagnant liquid)", "Flow boiling (liquid flowing in channel)", "Not sure"],
          required: true,
        });
      }
      if (!hasNum("temperature") && !hasNum("saturation") && !hasWord("saturation temperature")) {
        q.push({
          id: "temperatures",
          question: "What is the saturation (or melting) temperature and the wall temperature?",
          hint: "e.g., T_sat = 100°C (water at 1 atm), T_wall = 110°C (10°C superheat)",
          type: "text",
          required: true,
        });
      }
      if (!hasWord("water", "refrigerant", "gallium", "paraffin", "pcm")) {
        q.push({
          id: "material",
          question: "What is the working fluid / phase-change material?",
          type: "select",
          options: ["Water / steam", "Refrigerant (R-134a, R-410A, etc.)", "Gallium (benchmark)", "Paraffin / PCM", "Other"],
          required: true,
        });
      }
      break;

    case "compressible-flow":
      if (!hasWord("nozzle", "shock tube", "jet", "channel", "duct", "airfoil", "wedge")) {
        q.push({
          id: "geometry",
          question: hasImage
            ? "What type of compressible flow geometry is shown in your image?"
            : "What is the flow geometry?",
          type: "select",
          options: [
            "Converging-diverging nozzle",
            "Shock tube",
            "Supersonic jet",
            "Flow over a body (wedge, cone, airfoil)",
            "Channel / duct",
            "Other",
          ],
          required: true,
        });
      }
      if (!hasNum("mach") && !hasNum("velocity") && !hasNum("pressure ratio")) {
        q.push({
          id: "mach",
          question: "What is the expected Mach number range or inlet/exit conditions?",
          hint: "e.g., Mach 2 at exit, or inlet pressure 500 kPa, back pressure 100 kPa",
          type: "text",
          required: true,
        });
      }
      if (!hasWord("air", "nitrogen", "helium", "co2", "gas")) {
        q.push({
          id: "gas",
          question: "What gas is being used?",
          type: "select",
          options: ["Air (γ = 1.4)", "Nitrogen", "Helium (γ = 1.67)", "CO₂", "Other"],
          required: true,
        });
      }
      if (!hasNum("pressure") && !hasNum("total pressure") && !hasNum("stagnation")) {
        q.push({
          id: "pressures",
          question: "What are the inlet and outlet pressures?",
          hint: "e.g., P₀ = 500 kPa (total), P_back = 100 kPa (absolute values!)",
          type: "text",
          required: true,
        });
      }
      break;
  }

  // If they uploaded an image but gave little text, add an open-ended question
  if (hasImage && text.trim().split(/\s+/).length < 15) {
    q.push({
      id: "image_description",
      question: "Please describe the key features visible in your uploaded image (geometry shape, labeled dimensions, boundary conditions, flow direction, etc.)",
      hint: "The more detail you provide about what's in the image, the better the workflow will be",
      type: "text",
      required: true,
    });
  }

  return q;
}

export function preAnalyze(text: string, hasImage: boolean): PreAnalysis {
  const detection = detectProblemType(text);

  if (detection.type === "unknown") {
    return {
      problemType: "unknown",
      problemTypeLabel: "Unknown Problem Type",
      confidence: 0,
      clarifications: [
        {
          id: "problem_type",
          question: hasImage
            ? "We couldn't determine the problem type from your description. Looking at your image, what type of CFD problem is this?"
            : "We couldn't determine the problem type. What kind of CFD problem is this?",
          type: "select",
          options: [
            "Internal pipe/tube flow",
            "External flow over a body",
            "Natural (free) convection",
            "Forced convection heat transfer",
            "Conjugate heat transfer (solid + fluid)",
            "Heat exchanger",
            "Lid-driven cavity",
            "Backward-facing step",
            "Heat conduction (solid only)",
            "Radiation heat transfer",
            "Fin / extended surface heat transfer",
            "Porous media flow",
            "Boiling / condensation (phase change)",
            "Compressible / supersonic flow",
          ],
          required: true,
        },
        {
          id: "description",
          question: hasImage
            ? "Please describe the system shown in your image in as much detail as possible."
            : "Please describe your CFD problem in detail.",
          hint: "Include geometry, fluid, flow conditions, temperatures, boundary conditions",
          type: "text",
          required: true,
        },
      ],
    };
  }

  const clarifications = generateClarifications(detection.type, text, hasImage);

  return {
    problemType: detection.type,
    problemTypeLabel: detection.label,
    confidence: detection.confidence,
    clarifications,
  };
}
