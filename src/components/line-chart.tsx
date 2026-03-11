"use client";

import { useRef, useEffect } from "react";
import { LineChartData } from "@/lib/field-generators";

interface LineChartProps {
  data: LineChartData;
}

const CANVAS_W = 700;
const CANVAS_H = 380;
const MARGIN = { top: 40, right: 20, bottom: 50, left: 75 };

export function LineChart({ data }: LineChartProps) {
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

    // Compute ranges
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    for (const s of data.series) {
      for (const [x, y] of s.data) {
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
        const yVal = data.logScaleY ? (y > 0 ? y : 1e-10) : y;
        if (yVal < yMin) yMin = yVal;
        if (yVal > yMax) yMax = yVal;
      }
    }

    if (data.logScaleY) {
      yMin = Math.pow(10, Math.floor(Math.log10(Math.max(1e-10, yMin))));
      yMax = Math.pow(10, Math.ceil(Math.log10(Math.max(1e-8, yMax))));
    } else {
      const pad = (yMax - yMin) * 0.05 || 1;
      yMin -= pad;
      yMax += pad;
    }

    const toX = (x: number) => MARGIN.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
    const toY = (y: number) => {
      if (data.logScaleY) {
        const logMin = Math.log10(Math.max(1e-10, yMin));
        const logMax = Math.log10(Math.max(1e-8, yMax));
        const logVal = Math.log10(Math.max(1e-10, y));
        return MARGIN.top + (1 - (logVal - logMin) / (logMax - logMin || 1)) * plotH;
      }
      return MARGIN.top + (1 - (y - yMin) / (yMax - yMin || 1)) * plotH;
    };

    // Grid lines
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 0.5;
    if (data.logScaleY) {
      const logMin = Math.floor(Math.log10(Math.max(1e-10, yMin)));
      const logMax = Math.ceil(Math.log10(Math.max(1e-8, yMax)));
      for (let p = logMin; p <= logMax; p++) {
        const y = toY(Math.pow(10, p));
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, y);
        ctx.lineTo(MARGIN.left + plotW, y);
        ctx.stroke();
      }
    } else {
      const nGridY = 5;
      for (let i = 0; i <= nGridY; i++) {
        const y = MARGIN.top + (i / nGridY) * plotH;
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, y);
        ctx.lineTo(MARGIN.left + plotW, y);
        ctx.stroke();
      }
    }
    const nGridX = 5;
    for (let i = 0; i <= nGridX; i++) {
      const x = MARGIN.left + (i / nGridX) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, MARGIN.top);
      ctx.lineTo(x, MARGIN.top + plotH);
      ctx.stroke();
    }

    // Plot border
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.strokeRect(MARGIN.left, MARGIN.top, plotW, plotH);

    // Draw series
    for (const s of data.series) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (const [x, y] of s.data) {
        const px = toX(x);
        const py = toY(y);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.title, MARGIN.left + plotW / 2, 18);

    // Axis labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.xLabel, MARGIN.left + plotW / 2, CANVAS_H - 6);

    ctx.save();
    ctx.translate(14, MARGIN.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(data.yLabel, 0, 0);
    ctx.restore();

    // X-axis tick labels
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i <= nGridX; i++) {
      const val = xMin + (i / nGridX) * (xMax - xMin);
      const x = MARGIN.left + (i / nGridX) * plotW;
      ctx.fillText(Math.round(val).toString(), x, CANVAS_H - MARGIN.bottom + 18);
    }

    // Y-axis tick labels
    ctx.textAlign = "right";
    if (data.logScaleY) {
      const logMin = Math.floor(Math.log10(Math.max(1e-10, yMin)));
      const logMax = Math.ceil(Math.log10(Math.max(1e-8, yMax)));
      for (let p = logMin; p <= logMax; p++) {
        const y = toY(Math.pow(10, p));
        ctx.fillText(`1e${p}`, MARGIN.left - 6, y + 4);
      }
    } else {
      const nTicksY = 5;
      for (let i = 0; i <= nTicksY; i++) {
        const val = yMax - (i / nTicksY) * (yMax - yMin);
        const y = MARGIN.top + (i / nTicksY) * plotH;
        ctx.fillText(val.toFixed(val < 10 ? 2 : 0), MARGIN.left - 6, y + 4);
      }
    }

    // Legend
    const legendX = MARGIN.left + 10;
    let legendY = MARGIN.top + 12;
    ctx.font = "11px sans-serif";
    for (const s of data.series) {
      // Background for readability
      ctx.fillStyle = "rgba(17,24,39,0.8)";
      ctx.fillRect(legendX - 2, legendY - 10, 170, 14);
      // Color line
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(legendX, legendY - 3);
      ctx.lineTo(legendX + 20, legendY - 3);
      ctx.stroke();
      // Label
      ctx.fillStyle = "#d1d5db";
      ctx.textAlign = "left";
      ctx.fillText(s.name, legendX + 25, legendY);
      legendY += 16;
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: CANVAS_W, height: CANVAS_H }}
      className="rounded-lg max-w-full"
    />
  );
}
