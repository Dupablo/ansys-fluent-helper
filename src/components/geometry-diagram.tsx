"use client";

import { ProblemType } from "@/lib/types";

interface GeometryDiagramProps {
  problemType: ProblemType;
  text: string;
}

const BLUE = "#3b82f6";
const RED = "#ef4444";
const GREEN = "#22c55e";
const GRAY = "#6b7280";
const LIGHT_BLUE = "#dbeafe";
const LIGHT_RED = "#fee2e2";
const LIGHT_GRAY = "#e5e7eb";
const DARK_TEXT = "#1f2937";
const ARROW_COLOR = "#374151";

function Arrow({ x1, y1, x2, y2, color = ARROW_COLOR }: { x1: number; y1: number; x2: number; y2: number; color?: string }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const headLen = 8;
  const headW = 4;

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2 - ux * headLen} y2={y2 - uy * headLen} stroke={color} strokeWidth={1.5} />
      <polygon
        points={`${x2},${y2} ${x2 - ux * headLen + uy * headW},${y2 - uy * headLen - ux * headW} ${x2 - ux * headLen - uy * headW},${y2 - uy * headLen + ux * headW}`}
        fill={color}
      />
    </g>
  );
}

function Label({ x, y, text, color = DARK_TEXT, size = 11, anchor = "middle" as const }: { x: number; y: number; text: string; color?: string; size?: number; anchor?: "start" | "middle" | "end" }) {
  return <text x={x} y={y} fill={color} fontSize={size} fontFamily="sans-serif" textAnchor={anchor} dominantBaseline="middle">{text}</text>;
}

function PipeFlowDiagram() {
  return (
    <svg viewBox="0 0 600 240" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="240" fill="#f8fafc" rx="8" />

      {/* Pipe body */}
      <rect x="100" y="50" width="400" height="120" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Top wall */}
      <line x1="100" y1="50" x2="500" y2="50" stroke={RED} strokeWidth="3" />
      <Label x={300} y={38} text="Wall (T = Tw or q = q″)" color={RED} size={10} />

      {/* Bottom wall */}
      <line x1="100" y1="170" x2="500" y2="170" stroke={RED} strokeWidth="3" />
      <Label x={300} y={184} text="Wall" color={RED} size={10} />

      {/* Axis (dashed) */}
      <line x1="100" y1="110" x2="500" y2="110" stroke={GRAY} strokeWidth="1" strokeDasharray="6,4" />
      <Label x={510} y={110} text="Axis" color={GRAY} size={9} anchor="start" />

      {/* Inlet */}
      <line x1="100" y1="50" x2="100" y2="170" stroke={BLUE} strokeWidth="3" />
      <Label x={80} y={110} text="Inlet" color={BLUE} size={11} anchor="end" />

      {/* Outlet */}
      <line x1="500" y1="50" x2="500" y2="170" stroke={GREEN} strokeWidth="3" />
      <Label x={520} y={110} text="Outlet" color={GREEN} size={11} anchor="start" />

      {/* Flow arrows */}
      {[70, 90, 110, 130, 150].map((y, i) => (
        <Arrow key={i} x1={180} y1={y} x2={250} y2={y} color="#93c5fd" />
      ))}
      <Label x={300} y={110} text="Flow →" color={BLUE} size={12} />

      {/* Dimensions */}
      <Arrow x1={100} y1={210} x2={500} y2={210} color={DARK_TEXT} />
      <Arrow x1={500} y1={210} x2={100} y2={210} color={DARK_TEXT} />
      <Label x={300} y={225} text="L" color={DARK_TEXT} size={13} />

      <Arrow x1={60} y1={50} x2={60} y2={110} color={DARK_TEXT} />
      <Arrow x1={60} y1={110} x2={60} y2={50} color={DARK_TEXT} />
      <Label x={45} y={80} text="R" color={DARK_TEXT} size={13} anchor="end" />

      <Label x={300} y={15} text="Pipe Flow — Computational Domain" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function ExternalFlowDiagram({ text }: { text: string }) {
  const isCylinder = text.toLowerCase().includes("cylinder");

  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* Domain */}
      <rect x="60" y="40" width="480" height="200" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Boundary labels */}
      <line x1="60" y1="40" x2="60" y2="240" stroke={BLUE} strokeWidth="3" />
      <Label x={40} y={140} text="Inlet" color={BLUE} size={10} anchor="end" />

      <line x1="540" y1="40" x2="540" y2="240" stroke={GREEN} strokeWidth="3" />
      <Label x={555} y={140} text="Outlet" color={GREEN} size={10} anchor="start" />

      <line x1="60" y1="40" x2="540" y2="40" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={300} y={28} text="Symmetry / Far-field" color={GRAY} size={10} />

      <line x1="60" y1="240" x2="540" y2="240" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={300} y={255} text="Symmetry / Far-field" color={GRAY} size={10} />

      {/* Body */}
      {isCylinder ? (
        <>
          <circle cx="200" cy="140" r="25" fill={LIGHT_RED} stroke={RED} strokeWidth="2" />
          <Label x={200} y={140} text="Cyl" color={RED} size={9} />
          {/* Wake region */}
          <ellipse cx="320" cy="140" rx="80" ry="30" fill="none" stroke={GRAY} strokeWidth="1" strokeDasharray="4,3" />
          <Label x={320} y={140} text="Wake" color={GRAY} size={9} />
        </>
      ) : (
        <>
          <line x1="180" y1="140" x2="350" y2="140" stroke={RED} strokeWidth="3" />
          <Label x={265} y={130} text="Heated Wall" color={RED} size={10} />
          {/* BL */}
          <path d="M 180 140 Q 265 125, 350 115" fill="none" stroke={GRAY} strokeWidth="1" strokeDasharray="4,3" />
          <Label x={370} y={115} text="BL" color={GRAY} size={9} anchor="start" />
        </>
      )}

      {/* Freestream arrows */}
      {[70, 100, 140, 180, 210].map((y, i) => (
        <Arrow key={i} x1={75} y1={y} x2={120} y2={y} color="#93c5fd" />
      ))}
      <Label x={98} y={60} text="U∞" color={BLUE} size={12} />

      <Label x={300} y={12} text={`External Flow — ${isCylinder ? "Cylinder" : "Flat Plate"}`} color={DARK_TEXT} size={13} />
    </svg>
  );
}

function NaturalConvectionDiagram() {
  return (
    <svg viewBox="0 0 400 320" className="w-full max-w-[400px]">
      <rect x="0" y="0" width="400" height="320" fill="#f8fafc" rx="8" />

      {/* Enclosure */}
      <rect x="80" y="50" width="240" height="220" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Hot wall (left) */}
      <line x1="80" y1="50" x2="80" y2="270" stroke={RED} strokeWidth="4" />
      <Label x={55} y={160} text="Th" color={RED} size={14} anchor="end" />
      <Label x={45} y={178} text="(Hot)" color={RED} size={10} anchor="end" />

      {/* Cold wall (right) */}
      <line x1="320" y1="50" x2="320" y2="270" stroke={BLUE} strokeWidth="4" />
      <Label x={340} y={160} text="Tc" color={BLUE} size={14} anchor="start" />
      <Label x={350} y={178} text="(Cold)" color={BLUE} size={10} anchor="start" />

      {/* Top wall (adiabatic) */}
      <line x1="80" y1="50" x2="320" y2="50" stroke={GRAY} strokeWidth="3" />
      <Label x={200} y={38} text="Adiabatic" color={GRAY} size={10} />

      {/* Bottom wall (adiabatic) */}
      <line x1="80" y1="270" x2="320" y2="270" stroke={GRAY} strokeWidth="3" />
      <Label x={200} y={285} text="Adiabatic" color={GRAY} size={10} />

      {/* Circulation arrows */}
      <path d="M 140 100 C 100 100, 100 220, 140 220" fill="none" stroke={RED} strokeWidth="1.5" markerEnd="url(#arrowRed)" opacity="0.6" />
      <path d="M 140 220 C 200 240, 280 240, 260 220" fill="none" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <path d="M 260 220 C 300 220, 300 100, 260 100" fill="none" stroke={BLUE} strokeWidth="1.5" opacity="0.6" />
      <path d="M 260 100 C 200 80, 140 80, 140 100" fill="none" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />

      {/* Circulation label */}
      <Label x={200} y={160} text="↻ Circulation" color={GRAY} size={11} />

      {/* Gravity */}
      <Arrow x1={370} y1={100} x2={370} y2={160} color={DARK_TEXT} />
      <Label x={380} y={130} text="g" color={DARK_TEXT} size={12} anchor="start" />

      {/* Dimensions */}
      <Arrow x1={80} y1={300} x2={320} y2={300} color={DARK_TEXT} />
      <Arrow x1={320} y1={300} x2={80} y2={300} color={DARK_TEXT} />
      <Label x={200} y={314} text="W" color={DARK_TEXT} size={13} />

      <Label x={200} y={16} text="Natural Convection — Enclosure" color={DARK_TEXT} size={13} />

      <defs>
        <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <path d="M 0 0 L 8 3 L 0 6 Z" fill={RED} />
        </marker>
      </defs>
    </svg>
  );
}

function LidDrivenCavityDiagram() {
  return (
    <svg viewBox="0 0 400 320" className="w-full max-w-[400px]">
      <rect x="0" y="0" width="400" height="320" fill="#f8fafc" rx="8" />

      {/* Cavity */}
      <rect x="80" y="60" width="220" height="220" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Moving lid (top) */}
      <line x1="80" y1="60" x2="300" y2="60" stroke={RED} strokeWidth="4" />
      <Arrow x1={120} y1={45} x2={260} y2={45} color={RED} />
      <Label x={190} y={33} text="Moving Lid (U)" color={RED} size={11} />

      {/* Side walls */}
      <line x1="80" y1="60" x2="80" y2="280" stroke={GRAY} strokeWidth="3" />
      <line x1="300" y1="60" x2="300" y2="280" stroke={GRAY} strokeWidth="3" />

      {/* Bottom wall */}
      <line x1="80" y1="280" x2="300" y2="280" stroke={GRAY} strokeWidth="3" />

      {/* Wall labels */}
      <Label x={60} y={170} text="No-slip" color={GRAY} size={9} anchor="end" />
      <Label x={320} y={170} text="No-slip" color={GRAY} size={9} anchor="start" />
      <Label x={190} y={295} text="No-slip, Stationary" color={GRAY} size={9} />

      {/* Primary vortex */}
      <ellipse cx="195" cy="155" rx="60" ry="55" fill="none" stroke={BLUE} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
      <Label x={195} y={155} text="Primary" color={BLUE} size={10} />
      <Label x={195} y={168} text="Vortex ↻" color={BLUE} size={10} />

      {/* Secondary vortices */}
      <ellipse cx="105" cy="260" rx="18" ry="15" fill="none" stroke={GRAY} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />
      <ellipse cx="280" cy="260" rx="15" ry="13" fill="none" stroke={GRAY} strokeWidth="1" strokeDasharray="3,2" opacity="0.5" />

      {/* Dimensions */}
      <Arrow x1={80} y1={310} x2={300} y2={310} color={DARK_TEXT} />
      <Arrow x1={300} y1={310} x2={80} y2={310} color={DARK_TEXT} />
      <Label x={190} y={310} text="L" color={DARK_TEXT} size={13} />

      <Arrow x1={340} y1={60} x2={340} y2={280} color={DARK_TEXT} />
      <Arrow x1={340} y1={280} x2={340} y2={60} color={DARK_TEXT} />
      <Label x={355} y={170} text="L" color={DARK_TEXT} size={13} anchor="start" />

      <Label x={200} y={16} text="Lid-Driven Cavity — Geometry" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function BackwardFacingStepDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="260" fill="#f8fafc" rx="8" />

      {/* Upstream channel */}
      <rect x="60" y="40" width="140" height="80" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Step block */}
      <rect x="60" y="120" width="140" height="80" fill={LIGHT_GRAY} stroke={GRAY} strokeWidth="1" />
      <Label x={130} y={160} text="Step (solid)" color={GRAY} size={10} />

      {/* Downstream channel */}
      <rect x="200" y="40" width="340" height="160" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Walls */}
      <line x1="60" y1="40" x2="540" y2="40" stroke={GRAY} strokeWidth="2" />
      <Label x={300} y={30} text="Top Wall" color={GRAY} size={9} />

      <line x1="200" y1="200" x2="540" y2="200" stroke={RED} strokeWidth="2" />
      <Label x={370} y={215} text="Bottom Wall (heated)" color={RED} size={9} />

      <line x1="200" y1="120" x2="200" y2="200" stroke={GRAY} strokeWidth="2" />
      <Label x={210} y={160} text="Step face" color={GRAY} size={8} anchor="start" />

      {/* Inlet */}
      <line x1="60" y1="40" x2="60" y2="120" stroke={BLUE} strokeWidth="3" />
      <Label x={40} y={80} text="Inlet" color={BLUE} size={10} anchor="end" />

      {/* Outlet */}
      <line x1="540" y1="40" x2="540" y2="200" stroke={GREEN} strokeWidth="3" />
      <Label x={555} y={120} text="Outlet" color={GREEN} size={10} anchor="start" />

      {/* Flow arrows */}
      {[55, 70, 85, 100].map((y, i) => (
        <Arrow key={i} x1={75} y1={y} x2={120} y2={y} color="#93c5fd" />
      ))}

      {/* Recirculation zone */}
      <ellipse cx="280" cy="170" rx="60" ry="22" fill="none" stroke={RED} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6" />
      <Label x={280} y={170} text="Recirculation" color={RED} size={9} />

      {/* Reattachment point */}
      <line x1="350" y1="195" x2="350" y2="205" stroke={RED} strokeWidth="2" />
      <Label x={350} y={230} text="Reattachment" color={RED} size={9} />

      {/* Dimensions */}
      <Arrow x1={200} y1={240} x2={350} y2={240} color={DARK_TEXT} />
      <Arrow x1={350} y1={240} x2={200} y2={240} color={DARK_TEXT} />
      <Label x={275} y={252} text="xr" color={DARK_TEXT} size={11} />

      {/* Step height */}
      <Arrow x1={190} y1={120} x2={190} y2={200} color={DARK_TEXT} />
      <Arrow x1={190} y1={200} x2={190} y2={120} color={DARK_TEXT} />
      <Label x={178} y={160} text="h" color={DARK_TEXT} size={12} anchor="end" />

      <Label x={300} y={14} text="Backward-Facing Step — Geometry" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function ConjugateHTDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="260" fill="#f8fafc" rx="8" />

      {/* Fluid region */}
      <rect x="80" y="40" width="440" height="100" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={300} y={90} text="Fluid Region" color={BLUE} size={12} />

      {/* Solid region */}
      <rect x="80" y="140" width="440" height="70" fill={LIGHT_RED} stroke={GRAY} strokeWidth="1" />
      <Label x={300} y={175} text="Solid Region (heat source)" color={RED} size={12} />

      {/* Interface */}
      <line x1="80" y1="140" x2="520" y2="140" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6,3" />
      <Label x={540} y={140} text="Interface" color="#f59e0b" size={10} anchor="start" />

      {/* Top wall */}
      <line x1="80" y1="40" x2="520" y2="40" stroke={GRAY} strokeWidth="2" />

      {/* Inlet */}
      <line x1="80" y1="40" x2="80" y2="140" stroke={BLUE} strokeWidth="3" />
      <Label x={60} y={90} text="Inlet" color={BLUE} size={10} anchor="end" />

      {/* Outlet */}
      <line x1="520" y1="40" x2="520" y2="140" stroke={GREEN} strokeWidth="3" />
      <Label x={538} y={90} text="Outlet" color={GREEN} size={10} anchor="start" />

      {/* Flow arrows */}
      {[60, 80, 100, 120].map((y, i) => (
        <Arrow key={i} x1={140} y1={y} x2={200} y2={y} color="#93c5fd" />
      ))}

      {/* Heat arrows from solid to fluid */}
      {[180, 260, 340, 420].map((x, i) => (
        <Arrow key={i} x1={x} y1={175} x2={x} y2={148} color={RED} />
      ))}
      <Label x={300} y={230} text="Q (heat generation)" color={RED} size={11} />

      <Label x={300} y={16} text="Conjugate Heat Transfer — Domain" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function HeatExchangerDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* Cold fluid (top) */}
      <rect x="80" y="50" width="440" height="70" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={300} y={85} text="Cold Fluid →" color={BLUE} size={11} />

      {/* Wall */}
      <rect x="80" y="120" width="440" height="20" fill={LIGHT_GRAY} stroke={GRAY} strokeWidth="1" />
      <Label x={540} y={130} text="Wall" color={GRAY} size={9} anchor="start" />

      {/* Hot fluid (bottom) */}
      <rect x="80" y="140" width="440" height="70" fill={LIGHT_RED} stroke={GRAY} strokeWidth="1" />
      <Label x={300} y={175} text="← Hot Fluid" color={RED} size={11} />

      {/* Cold inlet */}
      <Arrow x1={60} y1={85} x2={80} y2={85} color={BLUE} />
      <Label x={48} y={85} text="Tc,in" color={BLUE} size={10} anchor="end" />

      {/* Cold outlet */}
      <Arrow x1={520} y1={85} x2={555} y2={85} color={BLUE} />
      <Label x={560} y={85} text="Tc,out" color={BLUE} size={10} anchor="start" />

      {/* Hot inlet (from right for counterflow) */}
      <Arrow x1={555} y1={175} x2={520} y2={175} color={RED} />
      <Label x={560} y={175} text="Th,in" color={RED} size={10} anchor="start" />

      {/* Hot outlet */}
      <Arrow x1={80} y1={175} x2={48} y2={175} color={RED} />
      <Label x={40} y={175} text="Th,out" color={RED} size={10} anchor="end" />

      {/* Heat transfer arrows through wall */}
      {[160, 240, 320, 400].map((x, i) => (
        <Arrow key={i} x1={x} y1={155} x2={x} y2={133} color="#f59e0b" />
      ))}
      <Label x={300} y={230} text="Counter-flow arrangement" color={DARK_TEXT} size={11} />

      {/* Insulation */}
      <line x1="80" y1="50" x2="520" y2="50" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <line x1="80" y1="210" x2="520" y2="210" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={540} y={50} text="Insulated" color={GRAY} size={8} anchor="start" />
      <Label x={540} y={210} text="Insulated" color={GRAY} size={8} anchor="start" />

      <Label x={300} y={16} text="Heat Exchanger — Counter-Flow" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function ForcedConvectionDiagram() {
  return (
    <svg viewBox="0 0 600 240" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="240" fill="#f8fafc" rx="8" />

      {/* Channel */}
      <rect x="80" y="50" width="440" height="130" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />

      {/* Top wall (adiabatic) */}
      <line x1="80" y1="50" x2="520" y2="50" stroke={GRAY} strokeWidth="2" />
      <Label x={300} y={38} text="Adiabatic Wall" color={GRAY} size={10} />

      {/* Bottom wall (heated) */}
      <line x1="80" y1="180" x2="520" y2="180" stroke={RED} strokeWidth="3" />
      <Label x={300} y={195} text="Heated Wall (Tw or q″)" color={RED} size={10} />

      {/* Thermal BL */}
      <path d="M 80 180 Q 200 175, 300 165 Q 400 155, 520 140" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
      <Label x={530} y={140} text="δt" color="#f59e0b" size={10} anchor="start" />

      {/* Inlet */}
      <line x1="80" y1="50" x2="80" y2="180" stroke={BLUE} strokeWidth="3" />
      <Label x={60} y={115} text="Inlet" color={BLUE} size={10} anchor="end" />
      <Label x={60} y={130} text="T_in" color={BLUE} size={9} anchor="end" />

      {/* Outlet */}
      <line x1="520" y1="50" x2="520" y2="180" stroke={GREEN} strokeWidth="3" />
      <Label x={538} y={115} text="Outlet" color={GREEN} size={10} anchor="start" />

      {/* Flow arrows */}
      {[70, 95, 120, 145, 165].map((y, i) => (
        <Arrow key={i} x1={120} y1={y} x2={180} y2={y} color="#93c5fd" />
      ))}

      <Label x={300} y={15} text="Forced Convection — Channel Flow" color={DARK_TEXT} size={13} />
    </svg>
  );
}

export function GeometryDiagram({ problemType, text }: GeometryDiagramProps) {
  switch (problemType) {
    case "pipe-flow": return <PipeFlowDiagram />;
    case "external-flow": return <ExternalFlowDiagram text={text} />;
    case "natural-convection": return <NaturalConvectionDiagram />;
    case "forced-convection": return <ForcedConvectionDiagram />;
    case "conjugate-heat-transfer": return <ConjugateHTDiagram />;
    case "heat-exchanger": return <HeatExchangerDiagram />;
    case "lid-driven-cavity": return <LidDrivenCavityDiagram />;
    case "backward-facing-step": return <BackwardFacingStepDiagram />;
    default: return <PipeFlowDiagram />;
  }
}
