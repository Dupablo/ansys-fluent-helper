"use client";

import { useState, useMemo } from "react";
import { ProblemType } from "@/lib/types";
import { generateContourField, generateResidualData, generateMonitorData } from "@/lib/field-generators";
import { GeometryDiagram } from "./geometry-diagram";
import { ContourPlot } from "./contour-plot";
import { LineChart } from "./line-chart";
import { Box, Thermometer, Activity, BarChart3 } from "lucide-react";

interface VisualizationPanelProps {
  problemType: ProblemType;
  text: string;
}

const TABS = [
  { id: "geometry", label: "Geometry", icon: Box },
  { id: "contour", label: "Temperature Contour", icon: Thermometer },
  { id: "residuals", label: "Residual Plot", icon: Activity },
  { id: "monitors", label: "Monitor Plot", icon: BarChart3 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function VisualizationPanel({ problemType, text }: VisualizationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("geometry");

  const contourField = useMemo(() => generateContourField(problemType, text), [problemType, text]);
  const residualData = useMemo(() => generateResidualData(problemType, text), [problemType, text]);
  const monitorData = useMemo(() => generateMonitorData(problemType, text), [problemType, text]);

  if (problemType === "unknown") return null;

  return (
    <div className="card overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-4 flex justify-center bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
        {activeTab === "geometry" && (
          <GeometryDiagram problemType={problemType} text={text} />
        )}
        {activeTab === "contour" && (
          <ContourPlot field={contourField} />
        )}
        {activeTab === "residuals" && (
          <LineChart data={residualData} />
        )}
        {activeTab === "monitors" && (
          <LineChart data={monitorData} />
        )}
      </div>
    </div>
  );
}
