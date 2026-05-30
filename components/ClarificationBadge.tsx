"use client";

import { useEffect, useState } from "react";

/**
 * Ícono ⓘ anclado a un widget que, al hacer hover, muestra un popup helper-text
 * con la definición de un término. La primera vez (al montarse) el popup se abre
 * solo durante ~5 s y luego se colapsa al ícono; después solo reaparece con hover.
 */
export function ClarificationBadge({
  termino,
  definicion,
}: {
  termino: string;
  definicion: string;
}) {
  const [autoOpen, setAutoOpen] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAutoOpen(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const open = autoOpen || hovered;

  return (
    <div
      className="nodrag relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={`Qué es ${termino}`}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-300/50 bg-indigo-500/20 text-[11px] font-semibold italic leading-none text-indigo-100 shadow transition hover:bg-indigo-500/40"
      >
        i
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-white/10 bg-slate-900/95 p-2.5 text-left text-xs leading-snug text-slate-200 shadow-xl shadow-black/40 backdrop-blur"
        >
          {definicion}
        </div>
      )}
    </div>
  );
}
