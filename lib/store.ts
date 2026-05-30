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

export type CanvasElement = (
  | CardElement
  | FormulaElement
  | DiagramElement
  | ChartElement
  | DrawingElement
  | ImageElement
  | QuizElement
  | TableElement
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
  /** Tema en el que el usuario "entró" (vista de detalle), o null en la vista general. */
  activeParentId: string | null;
  /** Se incrementa con cada cambio estructural para disparar el re-layout del grafo. */
  version: number;
  /** Hacia dónde debe moverse la cámara la próxima vez que cambie `cameraTick`. */
  cameraTarget: CameraTarget;
  /** Se incrementa para disparar el movimiento de cámara descrito en `cameraTarget`. */
  cameraTick: number;
  /** Id del mapa guardado en Supabase que está abierto (null = sin guardar). */
  savedMapId: string | null;
  /** Título del mapa guardado abierto (para re-guardar sin volver a pedirlo). */
  savedTitle: string | null;

  /** Carga un conjunto completo de elementos, aristas y aclaraciones (ejemplo o mapa guardado). */
  load: (
    elements: CanvasElement[],
    edges: CanvasEdge[],
    clarifications?: Record<string, Clarification[]>,
  ) => void;
  /** Marca qué mapa guardado está abierto (lo usa el panel "Mis mapas"). */
  setSavedMap: (id: string | null, title: string | null) => void;
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
  /** Entra (zoom) dentro de un tema: anida ahí lo nuevo y vuela la cámara a su interior. */
  enterDepth: (id: string) => void;
  /** Vuelve a la vista general del mapa de temas. */
  exitDepth: () => void;
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
  clarifications: {},
  highlightedId: null,
  activeParentId: null,
  version: 0,
  cameraTarget: { kind: "overview" },
  cameraTick: 0,
  savedMapId: null,
  savedTitle: null,

  load: (elements, edges, clarifications = {}) =>
    set((state) => ({
      elements,
      edges,
      clarifications,
      highlightedId: null,
      activeParentId: null,
      cameraTarget: { kind: "overview" },
      version: state.version + 1,
    })),

  setSavedMap: (savedMapId, savedTitle) => set({ savedMapId, savedTitle }),

  upsertElement: (el) =>
    set((state) => {
      const idx = state.elements.findIndex((e) => e.id === el.id);
      // Al insertar uno nuevo dentro de un tema activo, cuélgalo de él (puntero de árbol).
      const attachParent =
        idx < 0 && state.activeParentId && el.parentId == null ? state.activeParentId : null;
      const withParent = attachParent ? { ...el, parentId: attachParent } : el;
      // Al reemplazar (p. ej. el re-upsert async de dibujo/imagen), conserva el padre previo.
      const next =
        idx >= 0
          ? { ...withParent, parentId: withParent.parentId ?? state.elements[idx].parentId }
          : withParent;
      const elements =
        idx >= 0
          ? state.elements.map((e, i) => (i === idx ? next : e))
          : [...state.elements, next];
      // El árbol crece: al colgar un detalle de un tema activo, crea la arista padre→hijo
      // (sin etiqueta, fina) si no existe, para que dagre lo rankee debajo del tema.
      let edges = state.edges;
      if (attachParent && !edges.some((e) => e.source === attachParent && e.target === el.id)) {
        edgeCounter += 1;
        edges = [
          ...edges,
          { id: `edge-${edgeCounter}`, source: attachParent, target: el.id, label: "" },
        ];
      }
      return { elements, edges, version: state.version + 1, highlightedId: el.id };
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
        cameraTarget: { kind: "node", id: targetId },
        cameraTick: state.cameraTick + 1,
      };
    });
    return ok;
  },

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
      cameraTarget: { kind: "node", id },
      cameraTick: state.cameraTick + 1,
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
      cameraTarget: { kind: "node", id },
      cameraTick: state.cameraTick + 1,
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
      cameraTarget: { kind: "node", id },
      cameraTick: state.cameraTick + 1,
    })),

  clear: () =>
    set((state) => ({
      elements: [],
      edges: [],
      clarifications: {},
      highlightedId: null,
      activeParentId: null,
      cameraTarget: { kind: "overview" },
      version: state.version + 1,
      savedMapId: null,
      savedTitle: null,
    })),
}));

/** Hijos directos de un tema (elementos cuyo parentId apunta a `pid`). */
export const childrenOf = (els: CanvasElement[], pid: string) =>
  els.filter((e) => e.parentId === pid);

/** True si `id` tiene al menos un hijo (entonces se dibuja como contenedor). */
export const isContainer = (els: CanvasElement[], id: string) =>
  els.some((e) => e.parentId === id);

/** Aplica `fn` al elemento tabla con `id`, devolviendo una nueva lista de elementos. */
function mapTable(
  elements: CanvasElement[],
  id: string,
  fn: (t: TableElement) => TableElement,
): CanvasElement[] {
  return elements.map((e) => (e.id === id && e.kind === "table" ? fn(e) : e));
}
