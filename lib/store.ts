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

export type CanvasElement = (
  | CardElement
  | FormulaElement
  | DiagramElement
  | ChartElement
  | DrawingElement
  | ImageElement
  | QuizElement
) & { parentId?: string }; // sin parentId = tema de nivel 0; con parentId = detalle anidado

export type CameraTarget =
  | { kind: "overview" } // encuadra todos los temas de nivel 0
  | { kind: "into"; id: string } // vuela DENTRO de un tema (encuadra sus hijos)
  | { kind: "node"; id: string }; // centra un solo nodo (lo usa `resaltar`)

export type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

let edgeCounter = 0;

interface CanvasState {
  elements: CanvasElement[];
  edges: CanvasEdge[];
  highlightedId: string | null;
  /** Tema en el que el usuario "entró" (vista de detalle), o null en la vista general. */
  activeParentId: string | null;
  /** Se incrementa con cada cambio estructural para disparar el re-layout del grafo. */
  version: number;
  /** Hacia dónde debe moverse la cámara la próxima vez que cambie `cameraTick`. */
  cameraTarget: CameraTarget;
  /** Se incrementa para disparar el movimiento de cámara descrito en `cameraTarget`. */
  cameraTick: number;

  /** Carga un conjunto completo de elementos y aristas (p. ej. una lección de ejemplo). */
  load: (elements: CanvasElement[], edges: CanvasEdge[]) => void;
  /** Inserta o reemplaza (por id) un elemento del canvas. */
  upsertElement: (el: CanvasElement) => void;
  /** Conecta dos elementos existentes con una arista etiquetada. */
  connect: (source: string, target: string, label: string) => void;
  /** Resalta un elemento y mueve la cámara hacia él (lo usa la herramienta `resaltar`). */
  highlightNode: (id: string) => void;
  /** Entra (zoom) dentro de un tema: anida ahí lo nuevo y vuela la cámara a su interior. */
  enterDepth: (id: string) => void;
  /** Vuelve a la vista general del mapa de temas. */
  exitDepth: () => void;
  /** Revela la respuesta de un quiz; `elegida` es la opción que tocó el estudiante. */
  revealQuiz: (id: string, elegida?: number | null) => void;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  edges: [],
  highlightedId: null,
  activeParentId: null,
  version: 0,
  cameraTarget: { kind: "overview" },
  cameraTick: 0,

  load: (elements, edges) =>
    set((state) => ({
      elements,
      edges,
      highlightedId: null,
      activeParentId: null,
      cameraTarget: { kind: "overview" },
      version: state.version + 1,
    })),

  upsertElement: (el) =>
    set((state) => {
      const idx = state.elements.findIndex((e) => e.id === el.id);
      // Al insertar uno nuevo dentro de un tema activo, anídalo automáticamente.
      const withParent =
        idx < 0 && state.activeParentId && el.parentId == null
          ? { ...el, parentId: state.activeParentId }
          : el;
      // Al reemplazar (p. ej. el re-upsert async de dibujo/imagen), conserva el padre previo.
      const next =
        idx >= 0
          ? { ...withParent, parentId: withParent.parentId ?? state.elements[idx].parentId }
          : withParent;
      const elements =
        idx >= 0
          ? state.elements.map((e, i) => (i === idx ? next : e))
          : [...state.elements, next];
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

  highlightNode: (id) =>
    set((state) => ({
      highlightedId: id,
      cameraTarget: { kind: "node", id },
      cameraTick: state.cameraTick + 1,
    })),

  enterDepth: (id) =>
    set((state) => ({
      activeParentId: id,
      highlightedId: id,
      cameraTarget: { kind: "into", id },
      cameraTick: state.cameraTick + 1,
    })),

  exitDepth: () =>
    set((state) => ({
      activeParentId: null,
      cameraTarget: { kind: "overview" },
      cameraTick: state.cameraTick + 1,
    })),

  revealQuiz: (id, elegida = null) =>
    set((state) => ({
      elements: state.elements.map((e) =>
        e.id === id && e.kind === "quiz"
          ? { ...e, revelada: true, elegida: elegida ?? e.elegida }
          : e,
      ),
      version: state.version + 1,
      highlightedId: id,
      cameraTarget: { kind: "node", id },
      cameraTick: state.cameraTick + 1,
    })),

  clear: () =>
    set((state) => ({
      elements: [],
      edges: [],
      highlightedId: null,
      activeParentId: null,
      cameraTarget: { kind: "overview" },
      version: state.version + 1,
    })),
}));

/** Hijos directos de un tema (elementos cuyo parentId apunta a `pid`). */
export const childrenOf = (els: CanvasElement[], pid: string) =>
  els.filter((e) => e.parentId === pid);

/** True si `id` tiene al menos un hijo (entonces se dibuja como contenedor). */
export const isContainer = (els: CanvasElement[], id: string) =>
  els.some((e) => e.parentId === id);
