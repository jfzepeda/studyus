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

export type TableHighlightColor = "amber" | "blue" | "gray" | "green" | "rose";

export type TableHighlight = {
  tipo: "fila" | "columna" | "celda";
  fila?: number; // fila (tipo "fila"/"celda")
  columna?: number; // columna (tipo "columna"/"celda")
  color: TableHighlightColor;
};

export type TableCellChange = { fila: number; columna: number; valor: string };

export type TableElement = {
  id: string;
  kind: "table";
  titulo: string;
  headers: string[]; // encabezados de columna
  rows: string[][]; // valores actuales (editables) — texto libre
  initialRows: string[][]; // copia de la generación inicial (para reset)
  editable: boolean;
  highlights: TableHighlight[]; // resaltado estático activo
  flashCells: [number, number][]; // celdas a parpadear (último write de la IA)
  flashTick: number; // se incrementa para re-disparar el parpadeo
  op: { source: number; target: number; label: string } | null; // operación entre filas en curso
  opTick: number; // se incrementa para re-disparar el deslizamiento
};

export type CanvasElement =
  | CardElement
  | FormulaElement
  | DiagramElement
  | ChartElement
  | DrawingElement
  | ImageElement
  | QuizElement
  | TableElement;

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
  /** Resalta un elemento y mueve la cámara hacia él (lo usa la herramienta `resaltar`). */
  highlightNode: (id: string) => void;
  /** Revela la respuesta de un quiz; `elegida` es la opción que tocó el estudiante. */
  revealQuiz: (id: string, elegida?: number | null) => void;
  /** Edición del usuario: cambia una celda sin mover la cámara ni re-animar. */
  updateTableCell: (id: string, fila: number, col: number, valor: string) => void;
  /** Devuelve la tabla a los valores con que la generó la IA. */
  resetTable: (id: string) => void;
  /** El asistente resalta filas/columnas/celdas (lista vacía = limpiar) y enfoca la cámara. */
  highlightTable: (id: string, highlights: TableHighlight[]) => void;
  /** El asistente escribe celdas con animación de parpadeo. */
  setTableCells: (id: string, cambios: TableCellChange[]) => void;
  /** El asistente anima una operación entre dos filas (la origen se desliza sobre la destino). */
  operarFilas: (
    id: string,
    source: number,
    target: number,
    label: string,
    nuevosValores: string[],
  ) => void;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  edges: [],
  highlightedId: null,
  version: 0,
  focusTick: 0,

  load: (elements, edges) =>
    set((state) => ({
      elements,
      edges,
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

  updateTableCell: (id, fila, col, valor) =>
    set((state) => ({
      elements: mapTable(state.elements, id, (t) => {
        const rows = t.rows.map((r, i) =>
          i === fila ? r.map((c, j) => (j === col ? valor : c)) : r,
        );
        return { ...t, rows };
      }),
    })),

  resetTable: (id) =>
    set((state) => ({
      elements: mapTable(state.elements, id, (t) => ({
        ...t,
        rows: t.initialRows.map((r) => [...r]),
        highlights: [],
        op: null,
      })),
    })),

  highlightTable: (id, highlights) =>
    set((state) => ({
      elements: mapTable(state.elements, id, (t) => ({ ...t, highlights })),
      highlightedId: id,
      focusTick: state.focusTick + 1,
    })),

  setTableCells: (id, cambios) =>
    set((state) => ({
      elements: mapTable(state.elements, id, (t) => {
        const rows = t.rows.map((r) => [...r]);
        for (const { fila, columna, valor } of cambios) {
          if (rows[fila] && columna < rows[fila].length) rows[fila][columna] = valor;
        }
        return {
          ...t,
          rows,
          flashCells: cambios.map((c) => [c.fila, c.columna] as [number, number]),
          flashTick: t.flashTick + 1,
        };
      }),
      highlightedId: id,
      focusTick: state.focusTick + 1,
    })),

  operarFilas: (id, source, target, label, nuevosValores) =>
    set((state) => ({
      elements: mapTable(state.elements, id, (t) => {
        const rows = t.rows.map((r, i) =>
          i === target ? r.map((c, j) => nuevosValores[j] ?? c) : r,
        );
        return {
          ...t,
          rows,
          op: { source, target, label },
          opTick: t.opTick + 1,
        };
      }),
      highlightedId: id,
      focusTick: state.focusTick + 1,
    })),

  clear: () => set((state) => ({ elements: [], edges: [], highlightedId: null, version: state.version + 1 })),
}));

/** Aplica `fn` al elemento tabla con `id`, devolviendo una nueva lista de elementos. */
function mapTable(
  elements: CanvasElement[],
  id: string,
  fn: (t: TableElement) => TableElement,
): CanvasElement[] {
  return elements.map((e) => (e.id === id && e.kind === "table" ? fn(e) : e));
}
