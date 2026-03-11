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

  const makeSeries = (name: string, color: string, rate: number, initial: number, floor: number): LineSeriesData => {
    const data: [number, number][] = [];
    for (let i = 0; i <= nIter; i += 5) {
      const base = initial * Math.exp(-rate * i);
      const noise = 1 + 0.15 * (smoothNoise(i * 0.1 + rate * 100) - 0.5);
      // Add a bump at ~20% of iterations (typical for scheme switch)
      const bump = Math.exp(-0.001 * (i - nIter * 0.2) ** 2) * initial * 0.1;
      const value = Math.max(floor, base * noise + bump);
      data.push([i, value]);
    }
    return { name, color, data };
  };

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

// ---------------------------------------------------------------------------
// Monitor plot data
// ---------------------------------------------------------------------------

export function generateMonitorData(problemType: ProblemType, text: string): LineChartData {
  const heated = hasHeating(text);
  const nIter = isLaminar(text) ? 800 : 1500;

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
