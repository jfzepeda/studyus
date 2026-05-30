import { create } from "zustand";

export type ChartType = "bar" | "line" | "pie";

export type CardElement = {
  id: string;
  kind: "card";
  titulo: string;
  markdown: string;
};

export type FormulaElement = {
  id: string;
  kind: "formula";
  titulo: string;
  latex: string;
};

export type DiagramElement = {
  id: string;
  kind: "diagram";
  titulo: string;
  mermaid: string;
};

export type ChartElement = {
  id: string;
  kind: "chart";
  titulo: string;
  tipo: ChartType;
  data: { label: string; value: number }[];
};

export type DrawingElement = {
  id: string;
  kind: "drawing";
  titulo: string;
  svg: string;
  loading: boolean;
};

export type ImageElement = {
  id: string;
  kind: "image";
  titulo: string;
  src: string; // data URL; vacío mientras se genera
  loading: boolean;
};

export type QuizElement = {
  id: string;
  kind: "quiz";
  titulo: string;
  pregunta: string;
  opciones: string[];
  correcta: number; // índice 0-based de la opción correcta
  explicacion: string;
  revelada: boolean;
  elegida: number | null; // qué opción eligió el estudiante (si lo hizo)
};

export type CanvasElement =
  | CardElement
  | FormulaElement
  | DiagramElement
  | ChartElement
  | DrawingElement
  | ImageElement
  | QuizElement;

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

/** Aclaración ligera (helper-text) anclada a un elemento existente del canvas. */
export type Clarification = {
  id: string;
  termino: string;
  definicion: string;
};

let edgeCounter = 0;
let clarCounter = 0;

interface CanvasState {
  elements: CanvasElement[];
  edges: CanvasEdge[];
  /** Aclaraciones tipo helper-text, agrupadas por id del elemento al que se anclan. */
  clarifications: Record<string, Clarification[]>;
  highlightedId: string | null;
  /** Se incrementa con cada cambio estructural para disparar el re-layout del grafo. */
  version: number;
  /** Se incrementa cuando queremos que la cámara se centre en `highlightedId`. */
  focusTick: number;

  /** Carga un conjunto completo de elementos y aristas (p. ej. una lección de ejemplo). */
  load: (elements: CanvasElement[], edges: CanvasEdge[]) => void;
  /** Inserta o reemplaza (por id) un elemento del canvas. */
  upsertElement: (el: CanvasElement) => void;
  /** Conecta dos elementos existentes con una arista etiquetada. */
  connect: (source: string, target: string, label: string) => void;
  /**
   * Ancla una aclaración (helper-text) a un elemento existente. Devuelve `false`
   * si el elemento destino no existe.
   */
  addClarification: (targetId: string, termino: string, definicion: string) => boolean;
  /** Resalta un elemento y mueve la cámara hacia él (lo usa la herramienta `resaltar`). */
  highlightNode: (id: string) => void;
  /** Revela la respuesta de un quiz; `elegida` es la opción que tocó el estudiante. */
  revealQuiz: (id: string, elegida?: number | null) => void;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  edges: [],
  clarifications: {},
  highlightedId: null,
  version: 0,
  focusTick: 0,

  load: (elements, edges) =>
    set((state) => ({
      elements,
      edges,
      clarifications: {},
      highlightedId: null,
      version: state.version + 1,
    })),

  upsertElement: (el) =>
    set((state) => {
      const idx = state.elements.findIndex((e) => e.id === el.id);
      const elements =
        idx >= 0
          ? state.elements.map((e, i) => (i === idx ? el : e))
          : [...state.elements, el];
      return { elements, version: state.version + 1, highlightedId: el.id };
    }),

  connect: (source, target, label) =>
    set((state) => {
      const exists = state.elements.some((e) => e.id === source) &&
        state.elements.some((e) => e.id === target);
      if (!exists) return state;
      edgeCounter += 1;
      const edge: CanvasEdge = {
        id: `edge-${edgeCounter}`,
        source,
        target,
        label,
      };
      return { edges: [...state.edges, edge], version: state.version + 1 };
    }),

  addClarification: (targetId, termino, definicion) => {
    let ok = false;
    set((state) => {
      if (!state.elements.some((e) => e.id === targetId)) return state;
      ok = true;
      clarCounter += 1;
      const nueva: Clarification = { id: `clar-${clarCounter}`, termino, definicion };
      const prev = state.clarifications[targetId] ?? [];
      return {
        clarifications: { ...state.clarifications, [targetId]: [...prev, nueva] },
        highlightedId: targetId,
        focusTick: state.focusTick + 1,
      };
    });
    return ok;
  },

  highlightNode: (id) =>
    set((state) => ({ highlightedId: id, focusTick: state.focusTick + 1 })),

  revealQuiz: (id, elegida = null) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id && e.kind === "quiz"
          ? { ...e, revelada: true, elegida: elegida ?? e.elegida }
          : e,
      ),
      version: state.version + 1,
      highlightedId: id,
      focusTick: state.focusTick + 1,
    })),

  clear: () =>
    set((state) => ({
      elements: [],
      edges: [],
      clarifications: {},
      highlightedId: null,
      version: state.version + 1,
    })),
}));
