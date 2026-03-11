"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

interface RevisionInputProps {
  onRevise: (revisionPrompt: string) => void;
}

export function RevisionInput({ onRevise }: RevisionInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onRevise(trimmed);
    setText("");
  };

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Request Revision
      </h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='e.g., "Change to turbulent flow", "Add radiation effects", "Make it transient with time step 0.1s"'
        className="input-field min-h-[80px] resize-y text-sm"
        rows={3}
      />
      <button
        onClick={handleSubmit}
        disabled={!text.trim()}
        className="btn-primary text-sm"
      >
        Revise Workflow
      </button>
    </div>
  );
}
