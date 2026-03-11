"use client";

import { useRef, useEffect } from "react";
import { FieldData } from "@/lib/field-generators";
import { jetColormap } from "@/lib/colormap";

interface ContourPlotProps {
  field: FieldData;
}

const CANVAS_W = 700;
const CANVAS_H = 380;
const MARGIN = { top: 40, right: 90, bottom: 45, left: 60 };

export function ContourPlot({ field }: ContourPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_W * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const plotW = CANVAS_W - MARGIN.left - MARGIN.right;
    const plotH = CANVAS_H - MARGIN.top - MARGIN.bottom;

    // Background
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw contour cells
    const cellW = plotW / field.cols;
    const cellH = plotH / field.rows;
    const range = field.maxVal - field.minVal || 1;

    for (let r = 0; r < field.rows; r++) {
      for (let c = 0; c < field.cols; c++) {
        const t = (field.values[r][c] - field.minVal) / range;
        const [cr, cg, cb] = jetColormap(t);
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
        ctx.fillRect(
          MARGIN.left + c * cellW,
          MARGIN.top + r * cellH,
          Math.ceil(cellW) + 1,
          Math.ceil(cellH) + 1
        );
      }
    }

    // Plot border
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Colorbar
    const cbX = CANVAS_W - MARGIN.right + 15;
    const cbW = 18;
    const cbH = plotH;
    const nSteps = 100;
    for (let i = 0; i < nSteps; i++) {
      const t = 1 - i / nSteps;
      const [cr, cg, cb] = jetColormap(t);
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.fillRect(cbX, MARGIN.top + (i / nSteps) * cbH, cbW, cbH / nSteps + 1);
    }
    ctx.strokeStyle = "#6b7280";
    ctx.strokeRect(cbX, MARGIN.top, cbW, cbH);

    // Colorbar labels
    ctx.fillStyle = "#d1d5db";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    const nLabels = 5;
    for (let i = 0; i <= nLabels; i++) {
      const val = field.maxVal - (i / nLabels) * range;
      const y = MARGIN.top + (i / nLabels) * cbH;
      ctx.fillText(val.toFixed(1), cbX + cbW + 4, y + 4);
    }

    // Title
    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(field.title, MARGIN.left + plotW / 2, 18);

    // Unit label next to colorbar
    ctx.fillStyle = "#9ca3af";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`[${field.unit}]`, cbX + cbW / 2, MARGIN.top - 8);

    // Axis labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(field.xLabel, MARGIN.left + plotW / 2, CANVAS_H - 6);

    ctx.save();
    ctx.translate(14, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(field.yLabel, 0, 0);
    ctx.restore();

    // Axis tick labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= 4; i++) {
      const x = MARGIN.left + (i / 4) * plotW;
      ctx.fillText((i / 4).toFixed(1), x, CANVAS_H - MARGIN.bottom + 20);
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = MARGIN.top + (i / 4) * plotH;
      ctx.fillText((i / 4).toFixed(1), MARGIN.left - 6, y + 4);
    }
  }, [field]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: CANVAS_W, height: CANVAS_H }}
      className="rounded-lg max-w-full"
    />
  );
}
