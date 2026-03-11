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

function ConductionDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* Layer 1 — hot side */}
      <rect x="100" y="50" width="120" height="160" fill={LIGHT_RED} stroke={GRAY} strokeWidth="1" />
      <Label x={160} y={130} text="Layer 1" color={RED} size={11} />
      <Label x={160} y={145} text="k₁" color={RED} size={10} />

      {/* Layer 2 — middle */}
      <rect x="220" y="50" width="120" height="160" fill={LIGHT_GRAY} stroke={GRAY} strokeWidth="1" />
      <Label x={280} y={130} text="Layer 2" color={GRAY} size={11} />
      <Label x={280} y={145} text="k₂" color={GRAY} size={10} />

      {/* Layer 3 — cold side */}
      <rect x="340" y="50" width="120" height="160" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={400} y={130} text="Layer 3" color={BLUE} size={11} />
      <Label x={400} y={145} text="k₃" color={BLUE} size={10} />

      {/* Left boundary — hot surface */}
      <line x1="100" y1="50" x2="100" y2="210" stroke={RED} strokeWidth="4" />
      <Label x={75} y={100} text="T₁" color={RED} size={14} anchor="end" />
      <Label x={75} y={118} text="(Hot)" color={RED} size={10} anchor="end" />

      {/* Right boundary — convection */}
      <line x1="460" y1="50" x2="460" y2="210" stroke={BLUE} strokeWidth="4" />
      <Label x={485} y={100} text="h, T∞" color={BLUE} size={12} anchor="start" />
      <Label x={485} y={118} text="(Conv.)" color={BLUE} size={10} anchor="start" />

      {/* Convection arrows on the right */}
      {[70, 100, 130, 160, 190].map((y, i) => (
        <Arrow key={i} x1={465} y1={y} x2={495} y2={y} color={BLUE} />
      ))}

      {/* Top boundary — insulated */}
      <line x1="100" y1="50" x2="460" y2="50" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={280} y={38} text="Insulated" color={GRAY} size={10} />

      {/* Bottom boundary — insulated */}
      <line x1="100" y1="210" x2="460" y2="210" stroke={GRAY} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={280} y={225} text="Insulated" color={GRAY} size={10} />

      {/* Heat flux arrows through layers */}
      <Arrow x1={130} y1={80} x2={170} y2={80} color={RED} />
      <Arrow x1={250} y1={80} x2={290} y2={80} color="#f59e0b" />
      <Arrow x1={370} y1={80} x2={410} y2={80} color={BLUE} />
      <Label x={280} y={68} text="q″ →" color="#f59e0b" size={10} />

      {/* Temperature labels on interfaces */}
      <Label x={220} y={235} text="T₂" color={DARK_TEXT} size={11} />
      <Label x={340} y={235} text="T₃" color={DARK_TEXT} size={11} />

      {/* Dimension arrows */}
      <Arrow x1={100} y1={255} x2={220} y2={255} color={DARK_TEXT} />
      <Arrow x1={220} y1={255} x2={100} y2={255} color={DARK_TEXT} />
      <Label x={160} y={268} text="L₁" color={DARK_TEXT} size={11} />

      <Arrow x1={220} y1={255} x2={340} y2={255} color={DARK_TEXT} />
      <Arrow x1={340} y1={255} x2={220} y2={255} color={DARK_TEXT} />
      <Label x={280} y={268} text="L₂" color={DARK_TEXT} size={11} />

      <Arrow x1={340} y1={255} x2={460} y2={255} color={DARK_TEXT} />
      <Arrow x1={460} y1={255} x2={340} y2={255} color={DARK_TEXT} />
      <Label x={400} y={268} text="L₃" color={DARK_TEXT} size={11} />

      <Label x={300} y={16} text="Conduction — Composite Wall" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function RadiationDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* Enclosure background */}
      <rect x="100" y="50" width="400" height="180" fill="#fef9f0" stroke={GRAY} strokeWidth="1" />

      {/* Top surface — hot */}
      <line x1="100" y1="50" x2="500" y2="50" stroke={RED} strokeWidth="4" />
      <Label x={300} y={38} text="Surface 1 (Hot) — T₁, ε₁" color={RED} size={11} />

      {/* Bottom surface — cold */}
      <line x1="100" y1="230" x2="500" y2="230" stroke={BLUE} strokeWidth="4" />
      <Label x={300} y={248} text="Surface 2 (Cold) — T₂, ε₂" color={BLUE} size={11} />

      {/* Left wall — reradiating */}
      <line x1="100" y1="50" x2="100" y2="230" stroke={GRAY} strokeWidth="3" strokeDasharray="5,3" />
      <Label x={70} y={140} text="ε₃" color={GRAY} size={11} anchor="end" />

      {/* Right wall — reradiating */}
      <line x1="500" y1="50" x2="500" y2="230" stroke={GRAY} strokeWidth="3" strokeDasharray="5,3" />
      <Label x={530} y={140} text="ε₄" color={GRAY} size={11} anchor="start" />

      {/* Wavy radiation arrows from hot to cold */}
      {[180, 260, 340, 420].map((x, i) => (
        <g key={i}>
          <path
            d={`M ${x} 60 Q ${x + 8} 85, ${x} 100 Q ${x - 8} 115, ${x} 130 Q ${x + 8} 145, ${x} 160 Q ${x - 8} 175, ${x} 190 Q ${x + 8} 205, ${x} 220`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
            opacity="0.7"
          />
          {/* Small arrowhead at the bottom */}
          <polygon
            points={`${x},224 ${x - 4},216 ${x + 4},216`}
            fill="#f59e0b"
            opacity="0.7"
          />
        </g>
      ))}
      <Label x={300} y={140} text="Radiative Exchange" color="#f59e0b" size={11} />

      {/* Side radiation arrows (reflected) */}
      <path d="M 110 90 Q 130 100, 125 120" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" opacity="0.4" />
      <path d="M 490 90 Q 470 100, 475 120" fill="none" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,2" opacity="0.4" />

      <Label x={300} y={270} text="Reradiating / Insulated Walls" color={GRAY} size={10} />

      <Label x={300} y={16} text="Radiation — Enclosure with Radiating Surfaces" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function FinHeatTransferDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="260" fill="#f8fafc" rx="8" />

      {/* Base wall */}
      <rect x="60" y="40" width="40" height="180" fill={LIGHT_GRAY} stroke={GRAY} strokeWidth="2" />
      <Label x={80} y={130} text="Wall" color={GRAY} size={10} />

      {/* Fin body */}
      <rect x="100" y="100" width="360" height="40" fill={LIGHT_RED} stroke={RED} strokeWidth="2" />
      <Label x={280} y={120} text="Fin (k)" color={RED} size={11} />

      {/* Base temperature */}
      <line x1="100" y1="100" x2="100" y2="140" stroke={RED} strokeWidth="3" />
      <Label x={108} y={85} text="Tb" color={RED} size={13} anchor="start" />
      <Label x={108} y={155} text="(Base)" color={RED} size={9} anchor="start" />

      {/* Fluid region above fin */}
      <rect x="100" y="40" width="440" height="55" fill={LIGHT_BLUE} stroke="none" opacity="0.3" />
      <Label x={400} y={55} text="Fluid (T∞, h)" color={BLUE} size={11} />

      {/* Fluid region below fin */}
      <rect x="100" y="145" width="440" height="75" fill={LIGHT_BLUE} stroke="none" opacity="0.3" />
      <Label x={400} y={185} text="Fluid (T∞, h)" color={BLUE} size={11} />

      {/* Convection arrows — top of fin */}
      {[160, 220, 280, 340, 400].map((x, i) => (
        <Arrow key={`top-${i}`} x1={x} y1={96} x2={x} y2={70} color={BLUE} />
      ))}

      {/* Convection arrows — bottom of fin */}
      {[160, 220, 280, 340, 400].map((x, i) => (
        <Arrow key={`bot-${i}`} x1={x} y1={144} x2={x} y2={170} color={BLUE} />
      ))}
      <Label x={280} y={180} text="h (convection)" color={BLUE} size={9} />

      {/* Fin tip condition */}
      <line x1="460" y1="100" x2="460" y2="140" stroke={GREEN} strokeWidth="2" strokeDasharray="4,3" />
      <Label x={478} y={110} text="Tip:" color={GREEN} size={10} anchor="start" />
      <Label x={478} y={124} text="Conv / Insul" color={GREEN} size={9} anchor="start" />

      {/* Dimension arrows — fin length */}
      <Arrow x1={100} y1={210} x2={460} y2={210} color={DARK_TEXT} />
      <Arrow x1={460} y1={210} x2={100} y2={210} color={DARK_TEXT} />
      <Label x={280} y={225} text="L" color={DARK_TEXT} size={13} />

      {/* Dimension arrows — fin thickness */}
      <Arrow x1={490} y1={100} x2={490} y2={140} color={DARK_TEXT} />
      <Arrow x1={490} y1={140} x2={490} y2={100} color={DARK_TEXT} />
      <Label x={505} y={120} text="t" color={DARK_TEXT} size={13} anchor="start" />

      {/* Dimension arrows — fin width (into page) */}
      <Label x={520} y={145} text="w (into page)" color={DARK_TEXT} size={9} anchor="start" />

      <Label x={300} y={16} text="Fin Heat Transfer — Extended Surface" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function PorousMediaDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="260" fill="#f8fafc" rx="8" />

      {/* Channel — upstream clear region */}
      <rect x="60" y="50" width="140" height="150" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={130} y={125} text="Clear Fluid" color={BLUE} size={10} />

      {/* Channel — porous zone (center) */}
      <rect x="200" y="50" width="200" height="150" fill="#fef3c7" stroke={GRAY} strokeWidth="1" />
      {/* Dots pattern to represent porous media */}
      {[0, 1, 2, 3, 4, 5, 6].map((row) =>
        [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
          const dotCx = 215 + col * 22;
          const dotCy = 62 + row * 20;
          return dotCx < 390 && dotCy < 195 ? (
            <circle key={`dot-${row}-${col}`} cx={dotCx} cy={dotCy} r="3" fill="#d97706" opacity="0.4" />
          ) : null;
        })
      )}
      <Label x={300} y={125} text="Porous Zone" color="#92400e" size={12} />
      <Label x={300} y={142} text="(α, C₂)" color="#92400e" size={9} />

      {/* Channel — downstream clear region */}
      <rect x="400" y="50" width="140" height="150" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={470} y={125} text="Clear Fluid" color={BLUE} size={10} />

      {/* Top wall */}
      <line x1="60" y1="50" x2="540" y2="50" stroke={GRAY} strokeWidth="3" />
      <Label x={300} y={38} text="Wall" color={GRAY} size={10} />

      {/* Bottom wall */}
      <line x1="60" y1="200" x2="540" y2="200" stroke={GRAY} strokeWidth="3" />
      <Label x={300} y={215} text="Wall" color={GRAY} size={10} />

      {/* Inlet */}
      <line x1="60" y1="50" x2="60" y2="200" stroke={BLUE} strokeWidth="3" />
      <Label x={40} y={125} text="Inlet" color={BLUE} size={11} anchor="end" />

      {/* Outlet */}
      <line x1="540" y1="50" x2="540" y2="200" stroke={GREEN} strokeWidth="3" />
      <Label x={555} y={125} text="Outlet" color={GREEN} size={11} anchor="start" />

      {/* Flow arrows — upstream */}
      {[70, 100, 130, 160, 185].map((y, i) => (
        <Arrow key={`up-${i}`} x1={75} y1={y} x2={120} y2={y} color="#93c5fd" />
      ))}

      {/* Flow arrows — through porous zone */}
      {[90, 125, 160].map((y, i) => (
        <Arrow key={`pz-${i}`} x1={250} y1={y} x2={340} y2={y} color="#d97706" />
      ))}

      {/* Flow arrows — downstream */}
      {[70, 100, 130, 160, 185].map((y, i) => (
        <Arrow key={`dn-${i}`} x1={420} y1={y} x2={465} y2={y} color="#93c5fd" />
      ))}

      {/* Porous zone boundary dashes */}
      <line x1="200" y1="50" x2="200" y2="200" stroke="#d97706" strokeWidth="2" strokeDasharray="5,3" />
      <line x1="400" y1="50" x2="400" y2="200" stroke="#d97706" strokeWidth="2" strokeDasharray="5,3" />

      {/* Dimensions */}
      <Arrow x1={200} y1={235} x2={400} y2={235} color={DARK_TEXT} />
      <Arrow x1={400} y1={235} x2={200} y2={235} color={DARK_TEXT} />
      <Label x={300} y={248} text="Lporous" color={DARK_TEXT} size={11} />

      <Label x={300} y={16} text="Porous Media — Channel with Porous Zone" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function BoilingCondensationDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* --- Left half: Boiling --- */}

      {/* Liquid region */}
      <rect x="40" y="50" width="220" height="140" fill={LIGHT_BLUE} stroke={GRAY} strokeWidth="1" />
      <Label x={150} y={80} text="Liquid" color={BLUE} size={11} />

      {/* Vapor region (above liquid) */}
      <rect x="40" y="50" width="220" height="40" fill="#fef3c7" stroke="none" opacity="0.5" />
      <Label x={150} y={60} text="Vapor" color="#92400e" size={10} />

      {/* Heated surface (bottom) */}
      <rect x="40" y="190" width="220" height="20" fill={LIGHT_RED} stroke={RED} strokeWidth="2" />
      <Label x={150} y={200} text="Heated Wall" color={RED} size={10} />

      {/* Heat flux arrows from wall */}
      {[75, 115, 155, 195].map((x, i) => (
        <Arrow key={`hf-${i}`} x1={x} y1={188} x2={x} y2={165} color={RED} />
      ))}
      <Label x={150} y={230} text="q″ (heat flux)" color={RED} size={10} />

      {/* Bubbles */}
      <circle cx="85" cy="155" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="120" cy="140" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="155" cy="148" r="10" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="190" cy="135" r="7" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="220" cy="150" r="5" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="110" cy="110" r="9" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="170" cy="105" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
      <Label x={150} y={165} text="Bubbles" color="#92400e" size={9} />

      <Label x={150} y={255} text="Boiling" color={DARK_TEXT} size={12} />

      {/* --- Divider --- */}
      <line x1="300" y1="40" x2="300" y2="260" stroke={GRAY} strokeWidth="1" strokeDasharray="4,3" />

      {/* --- Right half: Condensation --- */}

      {/* Vapor region */}
      <rect x="340" y="50" width="220" height="140" fill="#fef3c7" stroke={GRAY} strokeWidth="1" opacity="0.6" />
      <Label x={450} y={100} text="Vapor" color="#92400e" size={11} />

      {/* Cooled surface (left vertical wall) */}
      <rect x="340" y="50" width="15" height="140" fill={LIGHT_BLUE} stroke={BLUE} strokeWidth="2" />

      {/* Condensate film on cooled wall */}
      <rect x="355" y="50" width="18" height="140" fill={LIGHT_BLUE} stroke="none" />
      <path d="M 373 50 L 373 60 Q 375 90, 373 120 Q 371 150, 375 190" fill="none" stroke={BLUE} strokeWidth="1.5" />
      <Label x={345} y={38} text="Cooled Wall" color={BLUE} size={9} />
      <Label x={385} y={125} text="Film" color={BLUE} size={9} anchor="start" />

      {/* Condensate dripping */}
      <Arrow x1={365} y1={190} x2={365} y2={210} color={BLUE} />

      {/* Heat removal arrows */}
      {[80, 110, 140, 170].map((y, i) => (
        <Arrow key={`cr-${i}`} x1={353} y1={y} x2={330} y2={y} color={BLUE} />
      ))}

      {/* Gravity arrow */}
      <Arrow x1={540} y1={70} x2={540} y2={130} color={DARK_TEXT} />
      <Label x={550} y={100} text="g" color={DARK_TEXT} size={12} anchor="start" />

      <Label x={450} y={255} text="Condensation" color={DARK_TEXT} size={12} />

      <Label x={300} y={16} text="Boiling & Condensation — Phase Change" color={DARK_TEXT} size={13} />
    </svg>
  );
}

function CompressibleFlowDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-[600px]">
      <rect x="0" y="0" width="600" height="280" fill="#f8fafc" rx="8" />

      {/* Nozzle profile — top wall */}
      <path
        d="M 80 60 Q 150 60, 200 80 Q 240 95, 280 100 Q 320 95, 360 80 Q 430 55, 520 50"
        fill="none" stroke={GRAY} strokeWidth="3"
      />

      {/* Nozzle profile — bottom wall */}
      <path
        d="M 80 200 Q 150 200, 200 180 Q 240 165, 280 160 Q 320 165, 360 180 Q 430 205, 520 210"
        fill="none" stroke={GRAY} strokeWidth="3"
      />

      {/* Fill nozzle interior */}
      <path
        d="M 80 60 Q 150 60, 200 80 Q 240 95, 280 100 Q 320 95, 360 80 Q 430 55, 520 50 L 520 210 Q 430 205, 360 180 Q 320 165, 280 160 Q 240 165, 200 180 Q 150 200, 80 200 Z"
        fill={LIGHT_BLUE} stroke="none" opacity="0.4"
      />

      {/* Throat sonic line */}
      <line x1="280" y1="100" x2="280" y2="160" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,3" />
      <Label x={280} y={90} text="Throat" color="#f59e0b" size={10} />
      <Label x={280} y={175} text="M = 1" color="#f59e0b" size={11} />

      {/* Inlet */}
      <line x1="80" y1="60" x2="80" y2="200" stroke={BLUE} strokeWidth="3" />
      <Label x={55} y={120} text="Inlet" color={BLUE} size={11} anchor="end" />
      <Label x={55} y={138} text="P₀, T₀" color={BLUE} size={10} anchor="end" />

      {/* Outlet */}
      <line x1="520" y1="50" x2="520" y2="210" stroke={GREEN} strokeWidth="3" />
      <Label x={540} y={120} text="Outlet" color={GREEN} size={11} anchor="start" />
      <Label x={540} y={138} text="Pb" color={GREEN} size={10} anchor="start" />

      {/* Flow direction arrows — converging section */}
      {[90, 110, 130, 150, 170].map((y, i) => (
        <Arrow key={`conv-${i}`} x1={120} y1={y} x2={170} y2={y} color="#93c5fd" />
      ))}

      {/* Flow direction arrows — diverging section (accelerating) */}
      {[80, 105, 130, 155, 180].map((y, i) => (
        <Arrow key={`div-${i}`} x1={370} y1={y} x2={440} y2={y} color="#93c5fd" />
      ))}

      {/* Labels for converging and diverging sections */}
      <Label x={170} y={50} text="Converging" color={GRAY} size={9} />
      <Label x={400} y={45} text="Diverging" color={GRAY} size={9} />

      {/* Subsonic / Supersonic labels */}
      <Label x={180} y={215} text="M < 1" color={BLUE} size={10} />
      <Label x={400} y={225} text="M > 1" color={RED} size={10} />

      {/* Pressure annotation */}
      <path d="M 100 240 Q 200 245, 280 260 Q 360 245, 500 230" fill="none" stroke={GRAY} strokeWidth="1" strokeDasharray="3,2" />
      <Label x={100} y={252} text="P" color={GRAY} size={9} anchor="start" />
      <Label x={300} y={270} text="Pressure decreases →" color={GRAY} size={9} />

      <Label x={300} y={16} text="Compressible Flow — Converging-Diverging Nozzle" color={DARK_TEXT} size={13} />
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
    case "conduction": return <ConductionDiagram />;
    case "radiation": return <RadiationDiagram />;
    case "fin-heat-transfer": return <FinHeatTransferDiagram />;
    case "porous-media": return <PorousMediaDiagram />;
    case "boiling-condensation": return <BoilingCondensationDiagram />;
    case "compressible-flow": return <CompressibleFlowDiagram />;
    default: return <PipeFlowDiagram />;
  }
}
