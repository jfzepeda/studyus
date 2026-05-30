"use client";

import type { TranscriptLine } from "@/lib/useTutorSession";

export function Transcript({ lines }: { lines: TranscriptLine[] }) {
  if (lines.length === 0) return null;
  const last = lines[lines.length - 1];
  return (
    <div className="max-w-xl truncate text-sm text-slate-400">
      <span className={last.role === "user" ? "text-emerald-300" : "text-fuchsia-300"}>
        {last.role === "user" ? "Tú: " : "Tutor: "}
      </span>
      {last.text}
    </div>
  );
}
