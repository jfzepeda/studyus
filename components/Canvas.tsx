"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCanvasStore, type CanvasElement } from "@/lib/store";
import { ErrorBoundary } from "./ErrorBoundary";
import { CardRenderer } from "./renderers/CardRenderer";
import { ChartRenderer } from "./renderers/ChartRenderer";
import { DiagramRenderer } from "./renderers/DiagramRenderer";

function renderBody(el: CanvasElement) {
  switch (el.kind) {
    case "card":
      return <CardRenderer markdown={el.markdown} />;
    case "diagram":
      return <DiagramRenderer id={el.id} code={el.mermaid} />;
    case "chart":
      return <ChartRenderer tipo={el.tipo} data={el.data} />;
  }
}

function ElementCard({ el }: { el: CanvasElement }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="mb-4 break-inside-avoid rounded-2xl border border-white/10 bg-slate-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur"
    >
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-300">
        {el.titulo}
      </h3>
      <ErrorBoundary>{renderBody(el)}</ErrorBoundary>
    </motion.div>
  );
}

export function Canvas() {
  const elements = useCanvasStore((s) => s.elements);

  if (elements.length === 0) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center text-center text-slate-400">
        <p className="max-w-md text-lg">
          Tu lienzo está vacío. Conecta el micrófono y di algo como{" "}
          <span className="text-slate-200">
            «explícame el ciclo del agua»
          </span>{" "}
          para verlo cobrar vida.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
      <AnimatePresence>
        {elements.map((el) => (
          <ElementCard key={el.id} el={el} />
        ))}
      </AnimatePresence>
    </div>
  );
}
