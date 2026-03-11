"use client";

import { useState } from "react";
import { ImageUpload } from "./image-upload";
import { FileText, Image, ChevronRight } from "lucide-react";

interface ProblemInputProps {
  onSubmit: (text: string, image?: string) => void;
  initialText?: string;
  initialImage?: string;
  submitLabel?: string;
}

export function ProblemInput({ onSubmit, initialText = "", initialImage, submitLabel = "Analyze Problem" }: ProblemInputProps) {
  const [text, setText] = useState(initialText);
  const [image, setImage] = useState<string | undefined>(initialImage);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    onSubmit(trimmed, image);
  };

  const hasContent = !!text.trim() || !!image;

  return (
    <div className="space-y-6">
      {/* Two-section grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Image Upload */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center">
              <Image className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">System Image</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Upload a diagram, schematic, or problem figure</p>
            </div>
          </div>
          <ImageUpload image={image} onImageChange={setImage} />
          {image && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Image uploaded — we&apos;ll reference it during clarification to ensure accuracy.
            </p>
          )}
        </div>

        {/* Section 2: Text Description */}
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Problem Description</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Describe the system, conditions, and what you need</p>
            </div>
          </div>
          <textarea
            id="problem-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Describe your CFD / heat transfer problem...\n\nExample: \"Water flows through a circular pipe of diameter 25mm and length 2m. The inlet velocity is 1.5 m/s at 20°C. The pipe wall is at constant temperature of 80°C. Determine the outlet temperature, heat transfer rate, and Nusselt number.\"\n\nInclude as much detail as possible — geometry, fluid, flow conditions, temperatures, boundary conditions. We'll ask clarifying questions if anything is missing."}
            className="input-field min-h-[200px] resize-y text-sm"
            rows={8}
          />
          {!text.trim() && image && (
            <p className="text-xs text-amber-500">
              Even a brief description helps — e.g., &quot;pipe flow with heated walls&quot; or &quot;natural convection in a cavity.&quot;
            </p>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {image && text.trim()
            ? "Ready — we'll analyze your image and description together."
            : image
            ? "Add a description for best results, or we'll ask detailed questions about your image."
            : text.trim()
            ? "Optional: upload an image for visual reference."
            : "Upload an image and/or describe your problem to get started."}
        </p>
        <button
          onClick={handleSubmit}
          disabled={!hasContent}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          {submitLabel}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
