"use client";

import { useState } from "react";
import { ClarificationQuestion, PreAnalysis } from "@/lib/types";
import { HelpCircle, CheckCircle, AlertCircle, ChevronRight } from "lucide-react";

interface ClarificationPanelProps {
  preAnalysis: PreAnalysis;
  problemImage?: string;
  onSubmit: (answers: Record<string, string>) => void;
  onBack: () => void;
}

export function ClarificationPanel({ preAnalysis, problemImage, onSubmit, onBack }: ClarificationPanelProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const requiredUnanswered = preAnalysis.clarifications.filter(
    (q) => q.required && !answers[q.id]?.trim()
  );
  const canSubmit = requiredUnanswered.length === 0;

  const confidencePercent = Math.round(preAnalysis.confidence * 100);
  const isDetected = preAnalysis.problemType !== "unknown";

  return (
    <div className="space-y-6">
      {/* Detection result header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          {problemImage && (
            <div className="sm:w-48 flex-shrink-0">
              <img
                src={problemImage}
                alt="Uploaded problem"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover max-h-40"
              />
            </div>
          )}
          <div className="flex-1">
            {isDetected ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <h2 className="text-lg font-bold">Detected: {preAnalysis.problemTypeLabel}</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Confidence: {confidencePercent}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Before generating the full workflow, we need a few more details to ensure accurate results.
                  {problemImage ? " Please reference your uploaded image when answering." : ""}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold">More Information Needed</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We need more details to identify your problem type and generate an accurate workflow.
                  {problemImage ? " Please reference your uploaded image when answering." : ""}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <HelpCircle className="w-4 h-4 text-brand-500" />
          Clarifying Questions
          <span className="text-gray-400 font-normal">
            ({preAnalysis.clarifications.length - requiredUnanswered.length} of{" "}
            {preAnalysis.clarifications.filter((q) => q.required).length} required answered)
          </span>
        </h3>

        {preAnalysis.clarifications.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx + 1}
            value={answers[q.id] || ""}
            onChange={(val) => setAnswer(q.id, val)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary text-sm">
          Back to Input
        </button>
        <button
          onClick={() => onSubmit(answers)}
          disabled={!canSubmit}
          className="btn-primary text-sm inline-flex items-center gap-1.5"
        >
          Generate Workflow
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: ClarificationQuestion;
  index: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const answered = !!value.trim();

  return (
    <div
      className={`card p-4 transition-colors ${
        answered
          ? "border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10"
          : question.required
          ? "border-brand-200 dark:border-brand-900"
          : ""
      }`}
    >
      <div className="flex gap-3">
        <span
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            answered
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300"
          }`}
        >
          {answered ? "✓" : index}
        </span>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium">
            {question.question}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </p>
          {question.hint && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{question.hint}</p>
          )}

          {question.type === "select" && question.options ? (
            <div className="flex flex-wrap gap-2 mt-1">
              {question.options.map((option) => (
                <button
                  key={option}
                  onClick={() => onChange(option)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    value === option
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-600"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={question.hint || "Type your answer..."}
              className="input-field text-sm"
            />
          )}
        </div>
      </div>
    </div>
  );
}
