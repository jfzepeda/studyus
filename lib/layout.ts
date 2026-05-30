import dagre from "@dagrejs/dagre";
import { childrenOf, type CanvasElement, type CanvasEdge } from "./store";

// --- Constantes de tamaño/zoom (ajustables en vivo) ---
export const NODE_W = 340; // ancho mundial de un recurso (igual que antes)
export const FALLBACK_H = 200; // alto por defecto antes de medir
export const COVER_H = 360; // banda de título del contenedor (grande para leerse de lejos)
export const PAD = 80; // margen mundial dentro del contenedor alrededor de los hijos
export const EMPTY_W = 640; // tamaño de un contenedor sin hijos todavía
export const EMPTY_H = 520;
export const ENTER_MAXZOOM = 3; // zoom máximo al volar dentro de un tema
export const LOD_FULL_PX = 240; // si NODE_W*zoom >= esto, el recurso muestra su cuerpo completo

const INNER_NODESEP = 40;
const INNER_RANKSEP = 70;
const OUTER_NODESEP = 120;
const OUTER_RANKSEP = 160;

export type XY = { x: number; y: number };
export type Measured = { width?: number; height?: number } | undefined;
/** Resultado de layout por nodo: posición + (solo contenedores) tamaño explícito. */
export type LayoutResult = { position: XY; width?: number; height?: number };

type Sized = { id: string; width: number; height: number };
type Edge2 = { source: string; target: string };

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

/** Layout interno de un tema: tamaño del contenedor + posiciones parent-local de sus hijos. */
function layoutContainer(
  children: CanvasElement[],
  innerEdges: Edge2[],
  measuredById: Map<string, Measured>,
): { width: number; height: number; childPos: Map<string, XY> } {
  if (children.length === 0) {
    return { width: EMPTY_W, height: EMPTY_H, childPos: new Map() };
  }
  const sized: Sized[] = children.map((c) => {
    const m = measuredById.get(c.id);
    return { id: c.id, width: m?.width ?? NODE_W, height: m?.height ?? FALLBACK_H };
  });
  const { pos, width, height } = runDagre(sized, innerEdges, {
    nodesep: INNER_NODESEP,
    ranksep: INNER_RANKSEP,
  });
  // Desplaza los hijos hacia abajo bajo la banda de título y hacia adentro por el margen.
  const childPos = new Map<string, XY>();
  pos.forEach((p, id) => childPos.set(id, { x: p.x + PAD, y: p.y + PAD + COVER_H }));
  return { width: width + 2 * PAD, height: height + 2 * PAD + COVER_H, childPos };
}

/**
 * Layout de dos niveles para todo el mundo.
 * Devuelve, por id de elemento, su posición (mundial para temas, parent-local para hijos)
 * y, solo para temas-contenedor, su tamaño explícito.
 */
export function layoutWorld(
  elements: CanvasElement[],
  edges: CanvasEdge[],
  measuredById: Map<string, Measured>,
): Map<string, LayoutResult> {
  const result = new Map<string, LayoutResult>();
  const topics = elements.filter((e) => e.parentId == null);
  const topicIds = new Set(topics.map((t) => t.id));

  // 1) Cada tema con hijos: layout interno → tamaño de contenedor + posiciones locales de hijos.
  const containerSize = new Map<string, { width: number; height: number }>();
  for (const t of topics) {
    const kids = childrenOf(elements, t.id);
    if (kids.length === 0) continue; // tema-hoja: se trata como recurso normal (measured)
    const kidIds = new Set(kids.map((k) => k.id));
    const innerEdges = edges.filter((e) => kidIds.has(e.source) && kidIds.has(e.target));
    const { width, height, childPos } = layoutContainer(kids, innerEdges, measuredById);
    containerSize.set(t.id, { width, height });
    childPos.forEach((p, id) => result.set(id, { position: p }));
  }

  // 2) Layout externo de los temas de nivel 0 (contenedores con su tamaño; hojas con measured).
  const outerSized: Sized[] = topics.map((t) => {
    const c = containerSize.get(t.id);
    if (c) return { id: t.id, width: c.width, height: c.height };
    const m = measuredById.get(t.id);
    return { id: t.id, width: m?.width ?? NODE_W, height: m?.height ?? FALLBACK_H };
  });
  const outerEdges = edges.filter((e) => topicIds.has(e.source) && topicIds.has(e.target));
  const { pos } = runDagre(outerSized, outerEdges, {
    nodesep: OUTER_NODESEP,
    ranksep: OUTER_RANKSEP,
  });

  for (const t of topics) {
    const p = pos.get(t.id) ?? { x: 0, y: 0 };
    const c = containerSize.get(t.id);
    result.set(t.id, c ? { position: p, width: c.width, height: c.height } : { position: p });
  }

  return result;
}
