import { ProblemType } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldData {
  values: number[][];
  rows: number;
  cols: number;
  title: string;
  xLabel: string;
  yLabel: string;
  minVal: number;
  maxVal: number;
  unit: string;
}

export interface LineSeriesData {
  name: string;
  color: string;
  data: [number, number][];
}

export interface LineChartData {
  title: string;
  xLabel: string;
  yLabel: string;
  series: LineSeriesData[];
  logScaleY?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLaminar(text: string): boolean {
  const l = text.toLowerCase();
  if (l.includes("turbulent")) return false;
  if (l.includes("laminar")) return true;
  return false;
}

function hasHeating(text: string): boolean {
  const l = text.toLowerCase();
  return l.includes("heat") || l.includes("temperature") || l.includes("thermal") ||
    l.includes("hot") || l.includes("cold") || l.includes("heated");
}

function smoothNoise(seed: number): number {
  // Deterministic pseudo-random based on seed
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function createGrid(rows: number, cols: number, fillFn: (r: number, c: number) => number): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(fillFn(r, c));
    }
    grid.push(row);
  }
  return grid;
}

function fieldMinMax(grid: number[][]): [number, number] {
  let min = Infinity, max = -Infinity;
  for (const row of grid) {
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return [min, max];
}

// ---------------------------------------------------------------------------
// Temperature field generators per problem type
// ---------------------------------------------------------------------------

const ROWS = 80;
const COLS = 120;

function pipeFlowField(text: string): FieldData {
  const heated = hasHeating(text);
  const laminar = isLaminar(text);
  const Tin = 293; // 20°C
  const Twall = heated ? 353 : 293; // 80°C
  const n = laminar ? 2 : 7; // parabolic vs 1/7th power law

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const y = r / (ROWS - 1); // 0 = top wall, 1 = bottom wall
    const x = c / (COLS - 1); // 0 = inlet, 1 = outlet

    // Distance from center: 0 at center, 1 at wall
    const rNorm = Math.abs(2 * y - 1);
    // Velocity profile shape (determines how temperature penetrates)
    const profileShape = laminar ? rNorm * rNorm : Math.pow(rNorm, 1 / n);
    // Thermal development along pipe
    const development = 1 - Math.exp(-3 * x);

    return Tin + (Twall - Tin) * profileShape * development;
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: `Temperature Contour — ${laminar ? "Laminar" : "Turbulent"} Pipe Flow`,
    xLabel: "Pipe Length (x/L)", yLabel: "Radius (r/R)",
    minVal, maxVal, unit: "K",
  };
}

function externalFlowField(text: string): FieldData {
  const Tinf = 300;
  const Ts = 350;
  const isCylinder = text.toLowerCase().includes("cylinder");

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = (c / (COLS - 1)) * 4 - 1; // -1 to 3 (cylinder at x=0)
    const y = (r / (ROWS - 1)) * 4 - 2; // -2 to 2

    if (isCylinder) {
      const dist = Math.sqrt(x * x + y * y);
      if (dist < 0.3) return Ts; // Inside cylinder
      // Temperature decays with distance from cylinder surface
      const surfDist = dist - 0.3;
      const decay = Math.exp(-2.5 * surfDist);
      // Wake region has higher temperature
      const wakeFactor = x > 0.3 ? Math.exp(-1.5 * Math.abs(y)) * Math.exp(-0.5 * (x - 0.3)) * 0.3 : 0;
      return Tinf + (Ts - Tinf) * (decay + wakeFactor);
    } else {
      // Flat plate at y=0, x from 0 to 2
      if (x < 0 || x > 2) return Tinf;
      const dist = Math.abs(y);
      const blThickness = 0.3 * Math.sqrt(Math.max(0.01, x));
      if (dist < 0.02) return Ts;
      const decay = Math.exp(-3 * dist / blThickness);
      return Tinf + (Ts - Tinf) * decay;
    }
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: `Temperature Contour — External Flow over ${isCylinder ? "Cylinder" : "Flat Plate"}`,
    xLabel: "x/D", yLabel: "y/D",
    minVal, maxVal, unit: "K",
  };
}

function naturalConvectionField(): FieldData {
  const Th = 350, Tc = 300;

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = hot wall (left), 1 = cold wall (right)
    const y = 1 - r / (ROWS - 1); // 0 = bottom, 1 = top

    // Core: nearly linear temperature variation
    const Tcore = Th - (Th - Tc) * x;

    // Boundary layer effects near hot and cold walls
    const blThick = 0.08;
    const hotBL = x < blThick ? (1 - x / blThick) * 5 : 0;
    const coldBL = (1 - x) < blThick ? (1 - (1 - x) / blThick) * 5 : 0;

    // Stratification: warmer at top, cooler at bottom
    const stratification = (y - 0.5) * 8;

    return Tcore + hotBL - coldBL + stratification;
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Natural Convection Enclosure",
    xLabel: "x/W", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function forcedConvectionField(text: string): FieldData {
  const laminar = isLaminar(text);
  return pipeFlowField(text + " heat temperature"); // Reuse pipe flow with heating
}

function conjugateField(): FieldData {
  const Tfluid_in = 293;
  const Theat = 380;

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1);
    const y = r / (ROWS - 1);

    // Bottom region (0-0.3): solid with heat source
    // Middle region (0.3-0.35): solid-fluid interface
    // Top region (0.35-1.0): fluid flow
    if (y > 0.7) {
      // Solid region — hot, with slight gradient
      const depth = (y - 0.7) / 0.3;
      return Theat - 15 * (1 - depth) + 10 * x;
    } else if (y > 0.65) {
      // Interface zone — sharp gradient
      const t = (y - 0.65) / 0.05;
      const fluidTemp = Tfluid_in + (Theat - Tfluid_in) * 0.4 * (1 - Math.exp(-3 * x));
      return fluidTemp + (Theat - 20 - fluidTemp) * t;
    } else {
      // Fluid region — developing temperature
      const development = 1 - Math.exp(-4 * x);
      const yNorm = y / 0.65; // 0 at top of fluid (near wall), 1 at bottom (far)
      const wallProximity = Math.exp(-3 * (1 - yNorm));
      return Tfluid_in + (Theat - Tfluid_in) * 0.5 * development * wallProximity;
    }
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Conjugate Heat Transfer",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function heatExchangerField(): FieldData {
  const Th_in = 370, Tc_in = 290;

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1);
    const y = r / (ROWS - 1);

    // Top region (0-0.35): cold fluid (flowing right →)
    // Wall (0.35-0.45): solid separating wall
    // Bottom region (0.45-1.0): hot fluid (flowing left ← for counterflow)
    if (y < 0.35) {
      // Cold fluid — temperature increases along x
      const localT = Tc_in + (Th_in - Tc_in) * 0.4 * x;
      const wallDist = (0.35 - y) / 0.35;
      return localT + 10 * (1 - wallDist) * x;
    } else if (y < 0.45) {
      // Wall — interpolation between hot and cold side
      const t = (y - 0.35) / 0.1;
      const Tcold_side = Tc_in + (Th_in - Tc_in) * 0.4 * x + 10 * x;
      const Thot_side = Th_in - (Th_in - Tc_in) * 0.3 * (1 - x);
      return Tcold_side + (Thot_side - Tcold_side) * t;
    } else {
      // Hot fluid — temperature decreases along x (counterflow: enters from right)
      const localT = Th_in - (Th_in - Tc_in) * 0.35 * x;
      const wallDist = (y - 0.45) / 0.55;
      return localT - 8 * (1 - wallDist) * (1 - x);
    }
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Counter-Flow Heat Exchanger",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function lidDrivenCavityField(text: string): FieldData {
  const heated = hasHeating(text);

  if (heated) {
    const Th = 350, Tc = 300;
    const grid = createGrid(ROWS, COLS, (r, c) => {
      const x = c / (COLS - 1);
      const y = 1 - r / (ROWS - 1);
      // Hot left, cold right, with vortex mixing
      const base = Th - (Th - Tc) * x;
      // Vortex effect: temperature mixed in center
      const cx = 0.5, cy = 0.55; // Vortex center slightly above middle
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const mixing = Math.exp(-8 * dist * dist) * 5;
      return base + mixing * (y - 0.5) * 10;
    });
    const [minVal, maxVal] = fieldMinMax(grid);
    return {
      values: grid, rows: ROWS, cols: COLS,
      title: "Temperature Contour — Lid-Driven Cavity",
      xLabel: "x/L", yLabel: "y/L",
      minVal, maxVal, unit: "K",
    };
  } else {
    // Show velocity magnitude contour
    const grid = createGrid(ROWS, COLS, (r, c) => {
      const x = c / (COLS - 1);
      const y = 1 - r / (ROWS - 1);

      // Lid moves at top (y=1): high velocity
      const lidEffect = Math.exp(-8 * (1 - y)) * (1 - 4 * (x - 0.5) ** 2);

      // Primary vortex centered slightly above and right of center
      const cx = 0.52, cy = 0.56;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const vortexSpeed = 0.5 * dist * Math.exp(-3 * dist);

      // Wall effects: velocity = 0 at walls (except lid)
      const wallDamp = Math.min(x, 1 - x, y) * 4;
      const damp = Math.min(1, wallDamp);

      return Math.max(0, (lidEffect + vortexSpeed) * damp);
    });
    const [minVal, maxVal] = fieldMinMax(grid);
    return {
      values: grid, rows: ROWS, cols: COLS,
      title: "Velocity Magnitude Contour — Lid-Driven Cavity",
      xLabel: "x/L", yLabel: "y/L",
      minVal, maxVal, unit: "m/s",
    };
  }
}

function backwardFacingStepField(text: string): FieldData {
  const heated = hasHeating(text);
  const Tin = 300, Twall = heated ? 350 : 300;

  if (!heated) {
    // Velocity magnitude
    const grid = createGrid(ROWS, COLS, (r, c) => {
      const x = c / (COLS - 1);
      const y = 1 - r / (ROWS - 1);

      // Step at x ≈ 0.2, step height occupies bottom 0.4 of domain
      const stepX = 0.2;
      const stepH = 0.4;

      if (x < stepX && y < stepH) return 0; // Inside step (solid)

      // Inlet channel (narrow, above step)
      if (x < stepX) {
        const channelY = (y - stepH) / (1 - stepH);
        return 1.5 * 4 * channelY * (1 - channelY); // Parabolic profile
      }

      // Downstream: recirculation zone behind step
      const xDown = (x - stepX) / (1 - stepX);
      const reattach = 0.4; // Normalized reattachment point

      if (y < stepH && xDown < reattach) {
        // Recirculation zone
        const rx = xDown / reattach;
        const ry = y / stepH;
        return 0.3 * Math.sin(Math.PI * rx) * Math.sin(Math.PI * ry);
      }

      // Main flow expands
      const expansion = Math.min(1, xDown * 3);
      const effectiveH = stepH + (1 - stepH) * (1 - expansion) + expansion;
      const yNorm = y / effectiveH;
      const profile = 4 * yNorm * (1 - yNorm);
      const speedup = 1 + 0.5 * (1 - expansion);
      return Math.max(0, profile * speedup);
    });
    const [minVal, maxVal] = fieldMinMax(grid);
    return {
      values: grid, rows: ROWS, cols: COLS,
      title: "Velocity Magnitude — Backward-Facing Step",
      xLabel: "x/h", yLabel: "y/H",
      minVal, maxVal, unit: "m/s",
    };
  }

  // Heated bottom wall
  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1);
    const y = 1 - r / (ROWS - 1);
    const stepX = 0.2, stepH = 0.4;

    if (x < stepX && y < stepH) return Twall; // Step body

    const xDown = Math.max(0, (x - stepX) / (1 - stepX));
    const wallEffect = Math.exp(-4 * y) * (1 - Math.exp(-5 * xDown));
    // Enhanced heat transfer near reattachment
    const reattach = 0.4;
    const reattachBoost = Math.exp(-20 * (xDown - reattach) ** 2) * 0.3;

    return Tin + (Twall - Tin) * (wallEffect + reattachBoost) * Math.exp(-2 * y);
  });
  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Backward-Facing Step",
    xLabel: "x/h", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function conductionField(text: string): FieldData {
  const l = text.toLowerCase();
  const isComposite = l.includes("composite") || l.includes("layer") || l.includes("multi");
  const Thot = 500; // Hot side (left / bottom)
  const Tcold = 300; // Cold side (right / top)

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = hot side, 1 = cold side
    const y = 1 - r / (ROWS - 1);

    if (isComposite) {
      // Three layers with different thermal conductivities
      // Layer 1 (0-0.33): high k — gentle slope
      // Layer 2 (0.33-0.66): low k — steep slope
      // Layer 3 (0.66-1.0): medium k — moderate slope
      const dT = Thot - Tcold;
      // Resistance-weighted temperature drops: R ~ L/k
      // k1=50, k2=5, k3=20 => R1=1/50, R2=1/5, R3=1/20
      // fractions: R1/(R1+R2+R3) etc.
      const R1 = 0.33 / 50, R2 = 0.33 / 5, R3 = 0.34 / 20;
      const Rtot = R1 + R2 + R3;
      const dT1 = dT * R1 / Rtot;
      const dT2 = dT * R2 / Rtot;
      const dT3 = dT * R3 / Rtot;

      let T: number;
      if (x < 0.33) {
        T = Thot - dT1 * (x / 0.33);
      } else if (x < 0.66) {
        T = Thot - dT1 - dT2 * ((x - 0.33) / 0.33);
      } else {
        T = Thot - dT1 - dT2 - dT3 * ((x - 0.66) / 0.34);
      }

      // Add slight 2D effects near corners
      const edgeEffect = 3 * Math.sin(Math.PI * y) * Math.exp(-10 * Math.min(x, 1 - x));
      return T + edgeEffect;
    } else {
      // Simple 1D conduction through a solid slab
      // Nearly linear gradient from hot to cold
      const Tlinear = Thot - (Thot - Tcold) * x;
      // Add slight 2D effects: edges lose some heat (convection BC at top/bottom)
      const edgeCooling = 8 * (Math.exp(-6 * y) + Math.exp(-6 * (1 - y)));
      return Tlinear - edgeCooling * x * (1 - x);
    }
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: `Temperature Contour — ${isComposite ? "Composite Wall" : "Solid"} Conduction`,
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function radiationField(): FieldData {
  const Thot = 800; // Hot radiating surface (left wall)
  const Tcold = 400; // Cold surface (right wall)

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = hot surface, 1 = cold surface
    const y = 1 - r / (ROWS - 1);

    // Radiation-dominated enclosure: temperature mostly uniform in center,
    // sharp gradients near surfaces
    const Tavg = (Thot + Tcold) / 2;

    // Sharp boundary layer near hot surface
    const hotBL = (Thot - Tavg) * Math.exp(-15 * x);
    // Sharp boundary layer near cold surface
    const coldBL = (Tcold - Tavg) * Math.exp(-15 * (1 - x));

    // Core is relatively uniform but with slight gradient
    const coreGradient = (Thot - Tcold) * 0.05 * (0.5 - x);

    // Slight vertical stratification from buoyancy
    const stratification = 10 * (y - 0.5);

    // Corner effects: radiation view factors cause cooler corners
    const cornerEffect = -15 * Math.exp(-8 * (x * x + y * y))
      - 15 * Math.exp(-8 * ((1 - x) * (1 - x) + y * y))
      - 15 * Math.exp(-8 * (x * x + (1 - y) * (1 - y)))
      - 15 * Math.exp(-8 * ((1 - x) * (1 - x) + (1 - y) * (1 - y)));

    return Tavg + hotBL + coldBL + coreGradient + stratification + cornerEffect;
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Radiation Enclosure",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function finHeatTransferField(): FieldData {
  const Tbase = 400; // Fin base temperature (left)
  const Tinf = 300; // Ambient temperature
  const mL = 3.0; // m*L parameter (controls decay rate)

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = base (hot), 1 = tip
    const y = r / (ROWS - 1); // 0 = top surface, 1 = bottom surface

    // Fin occupies center band; surrounding is ambient
    const finTop = 0.3;
    const finBot = 0.7;
    const finThickness = finBot - finTop;

    if (y < finTop - 0.05 || y > finBot + 0.05) {
      // Far from fin — ambient temperature
      return Tinf;
    }

    // Exponential temperature decay along fin length: T(x) = Tinf + (Tbase-Tinf) * cosh(m(L-x)) / cosh(mL)
    const theta = Math.cosh(mL * (1 - x)) / Math.cosh(mL);
    const Tcenterline = Tinf + (Tbase - Tinf) * theta;

    if (y >= finTop && y <= finBot) {
      // Inside fin: slight variation from center to surface (Biot number effect)
      const yNorm = Math.abs((y - (finTop + finBot) / 2) / (finThickness / 2)); // 0 at center, 1 at surface
      const surfaceCooling = (Tcenterline - Tinf) * 0.05 * yNorm * yNorm;
      return Tcenterline - surfaceCooling;
    } else {
      // Thin thermal boundary layer around fin surface
      const distFromFin = y < finTop ? (finTop - y) / 0.05 : (y - finBot) / 0.05;
      const blDecay = Math.exp(-5 * distFromFin);
      return Tinf + (Tcenterline - Tinf) * 0.3 * blDecay;
    }
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Fin Heat Transfer",
    xLabel: "Fin Length (x/L)", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function porousMediaField(text: string): FieldData {
  const l = text.toLowerCase();
  const showTemperature = l.includes("heat") || l.includes("temperature") || l.includes("thermal");

  if (showTemperature) {
    const Tin = 300;
    const Twall = 360;

    const grid = createGrid(ROWS, COLS, (r, c) => {
      const x = c / (COLS - 1); // 0 = inlet, 1 = outlet
      const y = r / (ROWS - 1); // 0 = top, 1 = bottom

      // Porous zone: x in [0.3, 0.7]
      const inPorous = x >= 0.3 && x <= 0.7;

      // Enhanced heat transfer in porous zone due to large surface area
      const development = 1 - Math.exp(-3 * x);
      const rNorm = Math.abs(2 * y - 1); // 0 at center, 1 at wall

      let T: number;
      if (inPorous) {
        // Much faster thermal development in porous region
        const porousDev = 1 - Math.exp(-8 * (x - 0.3));
        T = Tin + (Twall - Tin) * rNorm * porousDev;
      } else if (x > 0.7) {
        // Downstream of porous zone: mixed temperature profile
        const mixedDev = 1 - 0.3 * Math.exp(-5 * (x - 0.7));
        T = Tin + (Twall - Tin) * 0.7 * rNorm * mixedDev;
      } else {
        // Upstream: developing like normal pipe
        T = Tin + (Twall - Tin) * rNorm * rNorm * development;
      }
      return T;
    });

    const [minVal, maxVal] = fieldMinMax(grid);
    return {
      values: grid, rows: ROWS, cols: COLS,
      title: "Temperature Contour — Porous Media Flow",
      xLabel: "x/L", yLabel: "y/H",
      minVal, maxVal, unit: "K",
    };
  }

  // Velocity field: show velocity reduction in porous zone
  const Vin = 2.0;
  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1);
    const y = r / (ROWS - 1);
    const rNorm = Math.abs(2 * y - 1);

    // Parabolic profile base
    const profile = 1 - rNorm * rNorm;

    // Porous zone resistance: velocity drops significantly
    const porousStart = 0.3, porousEnd = 0.7;
    let velocityScale: number;

    if (x < porousStart) {
      // Upstream: normal flow, slight acceleration approaching porous zone
      const accel = 1 + 0.1 * Math.exp(-10 * (porousStart - x));
      velocityScale = accel;
    } else if (x <= porousEnd) {
      // Inside porous zone: much lower velocity, flatter profile (Darcy flow)
      const transition = 1 - Math.exp(-15 * (x - porousStart));
      velocityScale = 1 - 0.6 * transition; // Velocity drops to ~40%
      // Flatten profile in porous zone (more uniform)
      const flatProfile = 1 - 0.3 * rNorm * rNorm;
      return Vin * velocityScale * (profile * (1 - transition) + flatProfile * transition);
    } else {
      // Downstream recovery
      const recovery = 1 - 0.6 * Math.exp(-8 * (x - porousEnd));
      velocityScale = recovery;
    }

    return Vin * velocityScale * profile;
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Velocity Magnitude — Porous Media Flow",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "m/s",
  };
}

function boilingCondensationField(): FieldData {
  const Tsat = 373; // Saturation temperature (water at 1 atm)
  const Twall = 393; // Superheated wall (20 K superheat)
  const Tbulk = 368; // Slightly subcooled bulk

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = inlet, 1 = outlet
    const y = 1 - r / (ROWS - 1); // 0 = bottom (heated wall), 1 = top

    // Heated wall at bottom (y=0)
    // Superheated liquid layer near wall
    const wallDist = y;
    const superheatedLayer = 0.08; // Thin superheated layer

    if (wallDist < superheatedLayer) {
      // Superheated region: sharp gradient from Twall down to Tsat
      const t = wallDist / superheatedLayer;
      const baseT = Twall - (Twall - Tsat) * Math.pow(t, 0.5);

      // Vapor bubble hot spots near the wall
      const bubbleSpacing = 0.08;
      const bubbleRow = Math.sin(Math.PI * x / bubbleSpacing) *
        Math.sin(Math.PI * wallDist / (superheatedLayer * 0.5));
      const bubbleHeat = bubbleRow > 0.7 ? 5 * (bubbleRow - 0.7) : 0;

      return baseT + bubbleHeat;
    }

    if (wallDist < 0.25) {
      // Two-phase region: temperature near saturation with slight fluctuations
      const noise = 1.5 * (smoothNoise(x * 50 + y * 30) - 0.5);
      // Occasional hot vapor slugs
      const vaporSlug = Math.exp(-100 * ((x - 0.4) ** 2 + (y - 0.1) ** 2)) * 3
        + Math.exp(-100 * ((x - 0.75) ** 2 + (y - 0.15) ** 2)) * 2;
      return Tsat + noise + vaporSlug;
    }

    // Bulk liquid: subcooled, nearly uniform
    const subcooling = (Tsat - Tbulk) * (1 - Math.exp(-3 * (wallDist - 0.25)));
    return Tsat - subcooling;
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Temperature Contour — Boiling Near Heated Surface",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "K",
  };
}

function compressibleFlowField(): FieldData {
  // Converging-diverging nozzle: Mach number field
  // Nozzle shape: converging from x=0 to throat at x=0.4, diverging from x=0.4 to x=1
  const gamma = 1.4;

  const grid = createGrid(ROWS, COLS, (r, c) => {
    const x = c / (COLS - 1); // 0 = inlet, 1 = outlet
    const y = r / (ROWS - 1); // 0 = top wall, 1 = bottom wall

    // Nozzle half-height profile (symmetric about center)
    const throatX = 0.4;
    let halfH: number;
    if (x < throatX) {
      // Converging section: smooth contraction
      halfH = 0.5 - 0.2 * Math.pow(x / throatX, 2) * (3 - 2 * x / throatX);
    } else {
      // Diverging section: smooth expansion
      const xd = (x - throatX) / (1 - throatX);
      halfH = 0.3 + 0.25 * Math.pow(xd, 2) * (3 - 2 * xd);
    }

    // Check if point is inside nozzle
    const yCenter = Math.abs(y - 0.5);
    if (yCenter > halfH) {
      return 0; // Outside nozzle (wall)
    }

    // Area ratio A/A* (throat area = minimum)
    const throatH = 0.3;
    const areaRatio = halfH / throatH;

    // Isentropic Mach from area ratio (approximate via Newton's method idea)
    // A/A* = (1/M) * [(2/(gamma+1)) * (1 + (gamma-1)/2 * M^2)]^((gamma+1)/(2*(gamma-1)))
    // For subsonic (converging) and supersonic (diverging)
    let M: number;
    if (x <= throatX) {
      // Subsonic: M increases from ~0.2 to 1.0
      M = 0.2 + 0.8 * Math.pow(x / throatX, 1.5);
    } else {
      // Supersonic: M increases from 1.0 beyond throat
      const xd = (x - throatX) / (1 - throatX);
      M = 1.0 + 1.5 * Math.pow(xd, 1.2);
    }

    // Radial variation: Mach is highest at centerline, lower near walls
    const yNorm = yCenter / halfH; // 0 at center, 1 at wall
    const wallEffect = 1 - 0.15 * yNorm * yNorm; // Boundary layer reduces Mach near wall
    M *= wallEffect;

    // Ensure wall boundary layer
    if (yNorm > 0.9) {
      const blFactor = (1 - yNorm) / 0.1;
      M *= blFactor;
    }

    return Math.max(0, M);
  });

  const [minVal, maxVal] = fieldMinMax(grid);
  return {
    values: grid, rows: ROWS, cols: COLS,
    title: "Mach Number Contour — Converging-Diverging Nozzle",
    xLabel: "x/L", yLabel: "y/H",
    minVal, maxVal, unit: "Ma",
  };
}

// ---------------------------------------------------------------------------
// Public: generate temperature/velocity field
// ---------------------------------------------------------------------------

export function generateContourField(problemType: ProblemType, text: string): FieldData {
  switch (problemType) {
    case "pipe-flow": return pipeFlowField(text);
    case "external-flow": return externalFlowField(text);
    case "natural-convection": return naturalConvectionField();
    case "forced-convection": return forcedConvectionField(text);
    case "conjugate-heat-transfer": return conjugateField();
    case "heat-exchanger": return heatExchangerField();
    case "lid-driven-cavity": return lidDrivenCavityField(text);
    case "backward-facing-step": return backwardFacingStepField(text);
    case "conduction": return conductionField(text);
    case "radiation": return radiationField();
    case "fin-heat-transfer": return finHeatTransferField();
    case "porous-media": return porousMediaField(text);
    case "boiling-condensation": return boilingCondensationField();
    case "compressible-flow": return compressibleFlowField();
    default: return pipeFlowField(text);
  }
}

// ---------------------------------------------------------------------------
// Residual convergence data
// ---------------------------------------------------------------------------

export function generateResidualData(problemType: ProblemType, text: string): LineChartData {
  const laminar = isLaminar(text);
  const heated = hasHeating(text);
  const nIter = laminar ? 800 : 1500;

  const makeSeries = (name: string, color: string, rate: number, initial: number, floor: number, iterCount?: number): LineSeriesData => {
    const n = iterCount ?? nIter;
    const data: [number, number][] = [];
    for (let i = 0; i <= n; i += 5) {
      const base = initial * Math.exp(-rate * i);
      const noise = 1 + 0.15 * (smoothNoise(i * 0.1 + rate * 100) - 0.5);
      // Add a bump at ~20% of iterations (typical for scheme switch)
      const bump = Math.exp(-0.001 * (i - n * 0.2) ** 2) * initial * 0.1;
      const value = Math.max(floor, base * noise + bump);
      data.push([i, value]);
    }
    return { name, color, data };
  };

  // Problem-type-specific residual sets
  switch (problemType) {
    case "conduction": {
      // Pure conduction: only energy equation, no flow
      const series: LineSeriesData[] = [
        makeSeries("energy", "#06b6d4", 0.008, 1, 1e-8, 600),
      ];
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    case "radiation": {
      // Radiation: energy + radiation intensity (DO-model)
      const series: LineSeriesData[] = [
        makeSeries("energy", "#06b6d4", 0.005, 1, 1e-7, 1000),
        makeSeries("DO-intensity", "#f97316", 0.004, 0.8, 5e-6, 1000),
      ];
      // May also have flow if combined with convection
      if (hasHeating(text) || text.toLowerCase().includes("convection")) {
        series.unshift(
          makeSeries("continuity", "#22c55e", 0.004, 0.8, 5e-5, 1000),
          makeSeries("x-velocity", "#ef4444", 0.005, 0.4, 1e-5, 1000),
          makeSeries("y-velocity", "#3b82f6", 0.005, 0.3, 1e-5, 1000),
        );
      }
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    case "fin-heat-transfer": {
      // Fin: conduction in solid + convection in fluid around it
      const series: LineSeriesData[] = [
        makeSeries("continuity", "#22c55e", 0.004, 1, 5e-5),
        makeSeries("x-velocity", "#ef4444", 0.005, 0.5, 1e-5),
        makeSeries("y-velocity", "#3b82f6", 0.0055, 0.3, 1e-5),
        makeSeries("energy", "#06b6d4", 0.006, 0.8, 1e-7),
      ];
      if (!laminar) {
        series.push(makeSeries("k", "#a855f7", 0.004, 0.4, 2e-5));
        series.push(makeSeries("epsilon", "#eab308", 0.0035, 0.5, 3e-5));
      }
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    case "porous-media": {
      // Porous media: standard flow + energy, slower convergence due to source terms
      const series: LineSeriesData[] = [
        makeSeries("continuity", "#22c55e", 0.003, 1, 8e-5),
        makeSeries("x-velocity", "#ef4444", 0.004, 0.6, 2e-5),
        makeSeries("y-velocity", "#3b82f6", 0.004, 0.4, 2e-5),
      ];
      if (heated) {
        series.push(makeSeries("energy", "#06b6d4", 0.005, 0.8, 1e-7));
      }
      if (!laminar) {
        series.push(makeSeries("k", "#a855f7", 0.003, 0.5, 3e-5));
        series.push(makeSeries("epsilon", "#eab308", 0.0028, 0.6, 4e-5));
      }
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    case "boiling-condensation": {
      // Multiphase: volume fraction + momentum + energy
      const nIterMultiphase = 2000;
      const series: LineSeriesData[] = [
        makeSeries("continuity", "#22c55e", 0.003, 1, 1e-4, nIterMultiphase),
        makeSeries("x-velocity", "#ef4444", 0.0035, 0.5, 2e-5, nIterMultiphase),
        makeSeries("y-velocity", "#3b82f6", 0.0035, 0.4, 2e-5, nIterMultiphase),
        makeSeries("energy", "#06b6d4", 0.004, 0.8, 1e-6, nIterMultiphase),
        makeSeries("vof-vapor", "#f97316", 0.0025, 0.7, 5e-4, nIterMultiphase),
      ];
      if (!laminar) {
        series.push(makeSeries("k", "#a855f7", 0.003, 0.5, 3e-5, nIterMultiphase));
        series.push(makeSeries("epsilon", "#eab308", 0.0025, 0.6, 4e-5, nIterMultiphase));
      }
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    case "compressible-flow": {
      // Density-based solver: different residual scales
      const nIterCompressible = 2000;
      const series: LineSeriesData[] = [
        makeSeries("continuity", "#22c55e", 0.003, 1, 1e-5, nIterCompressible),
        makeSeries("x-momentum", "#ef4444", 0.0035, 0.8, 5e-6, nIterCompressible),
        makeSeries("y-momentum", "#3b82f6", 0.004, 0.5, 5e-6, nIterCompressible),
        makeSeries("energy", "#06b6d4", 0.0025, 1, 1e-6, nIterCompressible),
      ];
      if (!laminar) {
        series.push(makeSeries("k", "#a855f7", 0.003, 0.6, 3e-5, nIterCompressible));
        series.push(makeSeries("omega", "#eab308", 0.0028, 0.7, 4e-5, nIterCompressible));
      }
      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }

    default: {
      // Original generic behavior for all existing problem types
      const series: LineSeriesData[] = [
        makeSeries("continuity", "#22c55e", 0.004, 1, 5e-5),
        makeSeries("x-velocity", "#ef4444", 0.005, 0.5, 1e-5),
        makeSeries("y-velocity", "#3b82f6", 0.0055, 0.3, 1e-5),
      ];

      if (heated) {
        series.push(makeSeries("energy", "#06b6d4", 0.006, 0.8, 1e-7));
      }

      if (!laminar) {
        series.push(makeSeries("k", "#a855f7", 0.004, 0.4, 2e-5));
        series.push(makeSeries("epsilon", "#eab308", 0.0035, 0.5, 3e-5));
      }

      return {
        title: "Scaled Residuals",
        xLabel: "Iterations",
        yLabel: "Residual",
        series,
        logScaleY: true,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Monitor plot data
// ---------------------------------------------------------------------------

export function generateMonitorData(problemType: ProblemType, text: string): LineChartData {
  const heated = hasHeating(text);
  const nIter = isLaminar(text) ? 800 : 1500;

  const makeMonitor = (name: string, color: string, steady: number, rate: number, noiseAmp: number, iterCount?: number): LineSeriesData => {
    const n = iterCount ?? nIter;
    const data: [number, number][] = [];
    for (let i = 0; i <= n; i += 5) {
      const base = steady * (1 - Math.exp(-rate * i));
      const noise = noiseAmp * (smoothNoise(i * 0.07 + steady * 0.01) - 0.5);
      data.push([i, Math.max(0, base + noise)]);
    }
    return { name, color, data };
  };

  const makeConvergingMonitor = (name: string, color: string, initial: number, steady: number, rate: number, noiseAmp: number, iterCount?: number): LineSeriesData => {
    const n = iterCount ?? nIter;
    const data: [number, number][] = [];
    for (let i = 0; i <= n; i += 5) {
      const base = steady - (steady - initial) * Math.exp(-rate * i);
      const noise = noiseAmp * (smoothNoise(i * 0.07 + steady * 0.01) - 0.5);
      const oscillation = i < n * 0.3 ? (steady - initial) * 0.05 * Math.sin(i * 0.05) * Math.exp(-0.003 * i) : 0;
      data.push([i, base + noise + oscillation]);
    }
    return { name, color, data };
  };

  switch (problemType) {
    case "conduction": {
      const series: LineSeriesData[] = [
        makeConvergingMonitor("Max Temperature (K)", "#ef4444", 300, 500, 0.008, 0.3, 600),
        makeMonitor("Heat Flux — Hot Wall (W/m²)", "#3b82f6", 4500, 0.007, 25, 600),
        makeMonitor("Heat Flux — Cold Wall (W/m²)", "#22c55e", 4480, 0.006, 30, 600),
      ];
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    case "radiation": {
      const series: LineSeriesData[] = [
        makeMonitor("Surface Heat Flux (W/m²)", "#ef4444", 12000, 0.004, 80, 1000),
        makeMonitor("Radiosity — Hot Wall (W/m²)", "#f97316", 23000, 0.005, 150, 1000),
        makeMonitor("Radiosity — Cold Wall (W/m²)", "#3b82f6", 5800, 0.005, 40, 1000),
      ];
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    case "fin-heat-transfer": {
      const series: LineSeriesData[] = [
        makeConvergingMonitor("Tip Temperature (K)", "#ef4444", 400, 320, 0.005, 0.4),
        makeMonitor("Base Heat Flux (W/m²)", "#3b82f6", 8500, 0.005, 50),
        makeConvergingMonitor("Fin Efficiency", "#22c55e", 0, 0.72, 0.006, 0.003),
      ];
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    case "porous-media": {
      const series: LineSeriesData[] = [
        makeMonitor("Pressure Drop — Porous Zone (Pa)", "#a855f7", 3500, 0.004, 30),
        makeConvergingMonitor("Outlet Velocity (m/s)", "#22c55e", 0, 1.2, 0.005, 0.01),
      ];
      if (heated) {
        series.push(makeConvergingMonitor("Outlet Temperature (K)", "#ef4444", 300, 340, 0.004, 0.5));
      }
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    case "boiling-condensation": {
      const nIterBoil = 2000;
      const series: LineSeriesData[] = [
        makeConvergingMonitor("Vapor Volume Fraction", "#f97316", 0, 0.15, 0.003, 0.005, nIterBoil),
        makeConvergingMonitor("Wall Superheat (K)", "#ef4444", 0, 20, 0.004, 0.2, nIterBoil),
        makeMonitor("Wall Heat Flux (W/m²)", "#3b82f6", 45000, 0.003, 300, nIterBoil),
      ];
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    case "compressible-flow": {
      const nIterComp = 2000;
      const series: LineSeriesData[] = [
        makeConvergingMonitor("Mass Flow — Outlet (kg/s)", "#22c55e", 0, 2.5, 0.003, 0.02, nIterComp),
        makeConvergingMonitor("Mach — Exit Plane", "#ef4444", 0, 2.2, 0.0035, 0.015, nIterComp),
        makeConvergingMonitor("Pressure — Throat (kPa)", "#3b82f6", 200, 52.8, 0.003, 0.5, nIterComp),
        makeConvergingMonitor("Pressure — Exit (kPa)", "#a855f7", 200, 10.5, 0.003, 0.3, nIterComp),
      ];
      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }

    default: {
      // Original generic behavior for existing problem types
      const series: LineSeriesData[] = [];

      if (heated) {
        // Outlet temperature monitor
        const Tin = 293, Tsteady = 335;
        const tempData: [number, number][] = [];
        for (let i = 0; i <= nIter; i += 5) {
          const base = Tsteady - (Tsteady - Tin) * Math.exp(-0.005 * i);
          const noise = 0.5 * (smoothNoise(i * 0.07 + 42) - 0.5);
          const oscillation = i < nIter * 0.3 ? 2 * Math.sin(i * 0.05) * Math.exp(-0.003 * i) : 0;
          tempData.push([i, base + noise + oscillation]);
        }
        series.push({ name: "Outlet Temperature (K)", color: "#ef4444", data: tempData });

        // Wall heat flux monitor
        const qSteady = 5200;
        const fluxData: [number, number][] = [];
        for (let i = 0; i <= nIter; i += 5) {
          const base = qSteady * (1 - Math.exp(-0.004 * i));
          const noise = 30 * (smoothNoise(i * 0.09 + 77) - 0.5);
          fluxData.push([i, Math.max(0, base + noise)]);
        }
        series.push({ name: "Wall Heat Flux (W/m²)", color: "#3b82f6", data: fluxData });
      } else {
        // Outlet velocity monitor
        const Vsteady = 1.5;
        const velData: [number, number][] = [];
        for (let i = 0; i <= nIter; i += 5) {
          const base = Vsteady * (1 - 0.3 * Math.exp(-0.006 * i));
          const noise = 0.01 * (smoothNoise(i * 0.08 + 19) - 0.5);
          velData.push([i, base + noise]);
        }
        series.push({ name: "Outlet Avg Velocity (m/s)", color: "#22c55e", data: velData });
      }

      // Pressure drop monitor
      const dpSteady = 1250;
      const dpData: [number, number][] = [];
      for (let i = 0; i <= nIter; i += 5) {
        const base = dpSteady * (1 - 0.5 * Math.exp(-0.005 * i));
        const noise = 15 * (smoothNoise(i * 0.06 + 55) - 0.5);
        dpData.push([i, Math.max(0, base + noise)]);
      }
      series.push({ name: "Pressure Drop (Pa)", color: "#a855f7", data: dpData });

      return {
        title: "Surface Monitors",
        xLabel: "Iterations",
        yLabel: "Value",
        series,
        logScaleY: false,
      };
    }
  }
}
