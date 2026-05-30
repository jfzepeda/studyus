import dagre from "@dagrejs/dagre";
import type { CanvasElement, CanvasEdge } from "./store";

// --- Constantes de tamaño/zoom (ajustables en vivo) ---
export const NODE_W = 340; // ancho mundial de un recurso normal
export const TABLE_NODE_W = 560; // las tablas son más anchas
export const FALLBACK_H = 200; // alto por defecto antes de medir
export const ENTER_MAXZOOM = 3; // zoom máximo al volar a una rama
export const LOD_FULL_PX = 240; // si NODE_W*zoom >= esto, el recurso muestra su cuerpo completo

// Separaciones del único grafo (árbol que crece de arriba hacia abajo).
const NODESEP = 60;
const RANKSEP = 100;

export type XY = { x: number; y: number };
export type Measured = { width?: number; height?: number } | undefined;
/** Resultado de layout por nodo: solo posición (ya no hay contenedores con tamaño). */
export type LayoutResult = { position: XY };

type Sized = { id: string; width: number; height: number };
type Edge2 = { source: string; target: string };

/** Ancho mundial de un nodo según su tipo (determinista, no depende de la medida). */
export function widthForKind(el: CanvasElement) {
  return el.kind === "table" ? TABLE_NODE_W : NODE_W;
}

/** Corre dagre (TB) sobre un conjunto de nodos; devuelve posiciones top-left normalizadas a (0,0) + bbox. */
function runDagre(
  nodes: Sized[],
  edges: Edge2[],
  opts: { nodesep: number; ranksep: number },
): { pos: Map<string, XY>; width: number; height: number } {
  const pos = new Map<string, XY>();
  if (nodes.length === 0) return { pos, width: 0, height: 0 };

  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: opts.nodesep, ranksep: opts.ranksep, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: n.width, height: n.height }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });
  dagre.layout(g);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  nodes.forEach((n) => {
    const p = g.node(n.id);
    const x = p.x - n.width / 2;
    const y = p.y - n.height / 2;
    pos.set(n.id, { x, y });
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + n.width);
    maxY = Math.max(maxY, y + n.height);
  });
  // Normaliza para que la esquina superior izquierda del bbox quede en (0,0).
  pos.forEach((p) => {
    p.x -= minX;
    p.y -= minY;
  });
  return { pos, width: maxX - minX, height: maxY - minY };
}

/**
 * Layout de un solo nivel para todo el mundo: un único grafo donde el árbol crece.
 * Las aristas (incluidas las padre→hijo que crea `profundizar`) definen los rangos,
 * así que los detalles de un tema quedan debajo de él.
 */
export function layoutWorld(
  elements: CanvasElement[],
  edges: CanvasEdge[],
  measuredById: Map<string, Measured>,
): Map<string, LayoutResult> {
  const sized: Sized[] = elements.map((el) => {
    const m = measuredById.get(el.id);
    return { id: el.id, width: widthForKind(el), height: m?.height ?? FALLBACK_H };
  });
  const edge2: Edge2[] = edges.map((e) => ({ source: e.source, target: e.target }));
  const { pos } = runDagre(sized, edge2, { nodesep: NODESEP, ranksep: RANKSEP });

  const result = new Map<string, LayoutResult>();
  for (const el of elements) {
    result.set(el.id, { position: pos.get(el.id) ?? { x: 0, y: 0 } });
  }
  return result;
}
