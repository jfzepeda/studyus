"use client";

import { useMemo } from "react";
import katex from "katex";

export function FormulaRenderer({ latex }: { latex: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return "";
    }
  }, [latex]);

  if (!html) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-slate-900/60 p-3 text-xs text-slate-300">
        {latex}
      </pre>
    );
  }

  return (
    <div
      className="overflow-x-auto py-2 text-center text-slate-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
