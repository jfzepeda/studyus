"use client";

import { useCanvasStore } from "@/lib/store";

// Pastilla flotante que aparece solo cuando estás dentro de un tema; al hacer clic, sales.
export function DepthBreadcrumb() {
  const activeParentId = useCanvasStore((s) => s.activeParentId);
  const titulo = useCanvasStore(
    (s) => s.elements.find((e) => e.id === s.activeParentId)?.titulo ?? "Tema",
  );
  const exitDepth = useCanvasStore((s) => s.exitDepth);

  if (!activeParentId) return null;

  return (
    <button
      type="button"
      onClick={exitDepth}
      className="absolute left-3 top-3 z-10 flex max-w-[60%] items-center gap-2 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-200 backdrop-blur transition hover:bg-indigo-500/25"
    >
      <span aria-hidden>←</span>
      <span className="text-slate-300">Mapa</span>
      <span className="text-indigo-300/60">·</span>
      <span className="truncate">{titulo}</span>
    </button>
  );
}
