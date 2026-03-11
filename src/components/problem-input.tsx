"use client";

import { useState } from "react";
import { ImageUpload } from "./image-upload";

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
    if (!trimmed) return;
    onSubmit(trimmed, image);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="problem-text" className="block text-sm font-medium mb-1.5">
          Problem Description
        </label>
        <textarea
          id="problem-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your CFD/heat transfer problem... e.g., 'Water flows through a heated pipe of diameter 25mm at Reynolds number 40000. The wall temperature is constant at 80°C and inlet temperature is 20°C.'"
          className="input-field min-h-[160px] resize-y"
          rows={6}
        />
      </div>

      <ImageUpload image={image} onImageChange={setImage} />

      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="btn-primary w-full sm:w-auto"
      >
        {submitLabel}
      </button>
    </div>
  );
}
