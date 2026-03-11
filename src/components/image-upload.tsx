"use client";

import { useCallback, useRef } from "react";
import { ImagePlus, X } from "lucide-react";

interface ImageUploadProps {
  image?: string;
  onImageChange: (image: string | undefined) => void;
}

export function ImageUpload({ image, onImageChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        onImageChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (image) {
    return (
      <div className="relative inline-block">
        <img
          src={image}
          alt="Problem reference"
          className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
        />
        <button
          onClick={() => onImageChange(undefined)}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          aria-label="Remove image"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-colors"
    >
      <ImagePlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Drop an image here or click to upload (optional reference)
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
