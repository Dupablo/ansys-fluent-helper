"use client";

import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Waves } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Waves className="w-6 h-6 text-brand-600" />
          <span className="font-semibold text-lg">ANSYS Fluent Helper</span>
        </Link>
        <button
          onClick={toggleTheme}
          className="btn-ghost p-2 rounded-lg"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
