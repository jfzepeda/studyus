"use client";

import { useCanvasStore, type QuizElement } from "@/lib/store";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuizRenderer({ quiz }: { quiz: QuizElement }) {
  const revealQuiz = useCanvasStore((s) => s.revealQuiz);
  const { id, pregunta, opciones, correcta, explicacion, revelada, elegida } = quiz;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-100">{pregunta}</p>
      <ul className="space-y-2">
        {opciones.map((opcion, i) => {
          const esCorrecta = revelada && i === correcta;
          const esElegidaIncorrecta = revelada && i === elegida && i !== correcta;
          const base =
            "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition";
          const estilo = esCorrecta
            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
            : esElegidaIncorrecta
              ? "border-rose-500/50 bg-rose-500/15 text-rose-100"
              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10";
          return (
            <li key={i}>
              <button
                type="button"
                disabled={revelada}
                onClick={() => revealQuiz(id, i)}
                className={`${base} ${estilo} disabled:cursor-default`}
              >
                <span className="font-semibold text-slate-400">{LETTERS[i]})</span>
                <span className="flex-1">{opcion}</span>
                {esCorrecta && <span aria-hidden>✓</span>}
                {esElegidaIncorrecta && <span aria-hidden>✗</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {revelada && explicacion && (
        <p className="rounded-lg bg-slate-800/60 p-2 text-xs text-slate-300">
          {explicacion}
        </p>
      )}
    </div>
  );
}
