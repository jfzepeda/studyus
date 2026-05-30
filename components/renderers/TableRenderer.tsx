"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  useCanvasStore,
  type TableElement,
  type TableHighlightColor,
} from "@/lib/store";
import { CELL_FLASH_MS, ROW_SLIDE_MS, ROW_OP_TOTAL_MS } from "@/lib/animation";

const HL_BG: Record<TableHighlightColor, string> = {
  amber: "bg-amber-400/25",
  blue: "bg-blue-400/20",
  gray: "bg-slate-400/20",
  green: "bg-emerald-400/20",
  rose: "bg-rose-400/20",
};

export function TableRenderer({ table }: { table: TableElement }) {
  const updateTableCell = useCanvasStore((s) => s.updateTableCell);
  const resetTable = useCanvasStore((s) => s.resetTable);
  const { id, headers, rows, initialRows, editable, highlights } = table;

  // Celdas que están parpadeando ahora mismo (clave "fila-col").
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  // Resaltado temporal de la operación entre filas (origen azul, destino gris).
  const [opHl, setOpHl] = useState<{ source: number; target: number } | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  // Overlay que se desliza visualmente de la fila origen a la destino.
  const [slide, setSlide] = useState<
    { top: number; left: number; width: number; height: number; dy: number; label: string } | null
  >(null);

  const dirty = JSON.stringify(rows) !== JSON.stringify(initialRows);

  // Parpadeo cuando el asistente escribe celdas.
  useEffect(() => {
    if (table.flashTick === 0) return;
    const keys = table.flashCells.map(([r, c]) => `${r}-${c}`);
    setFlashing((prev) => new Set([...prev, ...keys]));
    const t = window.setTimeout(() => {
      setFlashing((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    }, CELL_FLASH_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.flashTick]);

  // Deslizamiento de una fila sobre otra (operación entre filas).
  useEffect(() => {
    if (table.opTick === 0 || !table.op) return;
    const { source, target, label } = table.op;
    const srcEl = rowRefs.current.get(source);
    const tgtEl = rowRefs.current.get(target);
    const cont = containerRef.current;
    setOpHl({ source, target });
    const timers: number[] = [];

    if (srcEl && tgtEl && cont) {
      const cr = cont.getBoundingClientRect();
      const sr = srcEl.getBoundingClientRect();
      const tg = tgtEl.getBoundingClientRect();
      setSlide({
        top: sr.top - cr.top + cont.scrollTop,
        left: sr.left - cr.left + cont.scrollLeft,
        width: sr.width,
        height: sr.height,
        dy: tg.top - sr.top,
        label,
      });
      timers.push(
        window.setTimeout(() => {
          setSlide(null);
          // Parpadea la fila destino (ya tiene los valores nuevos).
          const keys = (rows[target] ?? []).map((_, j) => `${target}-${j}`);
          setFlashing((prev) => new Set([...prev, ...keys]));
        }, ROW_SLIDE_MS),
      );
      timers.push(
        window.setTimeout(() => {
          const keys = (rows[target] ?? []).map((_, j) => `${target}-${j}`);
          setFlashing((prev) => {
            const next = new Set(prev);
            keys.forEach((k) => next.delete(k));
            return next;
          });
          setOpHl(null);
        }, ROW_OP_TOTAL_MS),
      );
    } else {
      timers.push(window.setTimeout(() => setOpHl(null), ROW_OP_TOTAL_MS));
    }

    return () => timers.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.opTick]);

  // Color de fondo de una celda según resaltado estático + operación en curso.
  function cellColor(r: number, c: number): TableHighlightColor | null {
    if (opHl) {
      if (r === opHl.source) return "blue";
      if (r === opHl.target) return "gray";
    }
    const cell = highlights.find((h) => h.tipo === "celda" && h.fila === r && h.columna === c);
    if (cell) return cell.color;
    const fila = highlights.find((h) => h.tipo === "fila" && h.fila === r);
    if (fila) return fila.color;
    const col = highlights.find((h) => h.tipo === "columna" && h.columna === c);
    if (col) return col.color;
    return null;
  }

  function headerColor(c: number): TableHighlightColor | null {
    const col = highlights.find((h) => h.tipo === "columna" && h.columna === c);
    return col ? col.color : null;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => resetTable(id)}
          disabled={!dirty}
          className="nodrag flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
          title="Volver a los valores originales"
        >
          <span aria-hidden>↺</span> Reset
        </button>
      </div>

      <div ref={containerRef} className="nowheel relative overflow-x-auto">
        {slide && (
          <div
            className="pointer-events-none absolute z-20 flex items-center justify-center gap-2 rounded-md bg-blue-500/30 px-2 text-xs font-medium text-blue-50 shadow-lg shadow-blue-500/20 ring-1 ring-blue-300/70"
            style={
              {
                top: slide.top,
                left: slide.left,
                width: slide.width,
                height: slide.height,
                "--slide-dy": `${slide.dy}px`,
                animation: `rowSlideDown ${ROW_SLIDE_MS}ms cubic-bezier(.4,0,.2,1) forwards`,
              } as CSSProperties
            }
          >
            {slide.label}
          </div>
        )}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, c) => {
                const hc = headerColor(c);
                return (
                  <th
                    key={c}
                    className={`border border-white/10 px-2 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-indigo-200 transition-colors duration-300 ${
                      hc ? HL_BG[hc] : "bg-white/5"
                    }`}
                  >
                    {h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr
                key={r}
                ref={(el) => {
                  if (el) rowRefs.current.set(r, el);
                  else rowRefs.current.delete(r);
                }}
              >
                {row.map((cell, c) => {
                  const color = cellColor(r, c);
                  const key = `${r}-${c}`;
                  const flash = flashing.has(key) ? "cell-flash" : "";
                  return (
                    <td
                      key={c}
                      className={`border border-white/10 px-1 py-1 text-center text-slate-100 transition-colors duration-300 ${
                        color ? HL_BG[color] : ""
                      }`}
                    >
                      {editable ? (
                        <input
                          value={cell}
                          onChange={(e) => updateTableCell(id, r, c, e.target.value)}
                          onPointerDown={(e) => e.stopPropagation()}
                          className={`nodrag w-full min-w-[2.5rem] rounded bg-transparent px-1 py-0.5 text-center outline-none focus:bg-white/10 focus:ring-1 focus:ring-indigo-400/60 ${flash}`}
                        />
                      ) : (
                        <span className={`inline-block px-1 ${flash}`}>{cell}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
