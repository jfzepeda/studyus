"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useViewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  childrenOf,
  isContainer,
  useCanvasStore,
  type CanvasElement,
} from "@/lib/store";
import {
  COVER_H,
  EMPTY_H,
  EMPTY_W,
  ENTER_MAXZOOM,
  FALLBACK_H,
  LOD_FULL_PX,
  NODE_W,
  layoutWorld,
} from "@/lib/layout";
import { ClarificationBadge } from "./ClarificationBadge";
import { ErrorBoundary } from "./ErrorBoundary";
import { CardRenderer } from "./renderers/CardRenderer";
import { ChartRenderer } from "./renderers/ChartRenderer";
import { DiagramRenderer } from "./renderers/DiagramRenderer";
import { DrawingRenderer } from "./renderers/DrawingRenderer";
import { FormulaRenderer } from "./renderers/FormulaRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { QuizRenderer } from "./renderers/QuizRenderer";
import { TableRenderer } from "./renderers/TableRenderer";

const TABLE_NODE_W = 560;

function widthForKind(el: CanvasElement) {
  return el.kind === "table" ? TABLE_NODE_W : NODE_W;
}

function renderBody(el: CanvasElement) {
  switch (el.kind) {
    case "card":
      return <CardRenderer markdown={el.markdown} />;
    case "formula":
      return <FormulaRenderer latex={el.latex} />;
    case "diagram":
      return <DiagramRenderer id={el.id} code={el.mermaid} />;
    case "chart":
      return <ChartRenderer tipo={el.tipo} data={el.data} />;
    case "drawing":
      return <DrawingRenderer svg={el.svg} loading={el.loading} />;
    case "image":
      return <ImageRenderer src={el.src} titulo={el.titulo} loading={el.loading} />;
    case "quiz":
      return <QuizRenderer quiz={el} />;
    case "table":
      return <TableRenderer table={el} />;
  }
}

const KIND_LABEL: Record<CanvasElement["kind"], string> = {
  card: "Tarjeta",
  formula: "Fórmula",
  diagram: "Diagrama",
  chart: "Gráfico",
  drawing: "Esquema",
  image: "Imagen",
  quiz: "Quiz",
  table: "Tabla",
};

// Placeholder barato para LOD: evita montar Mermaid/Recharts/imágenes cuando el nodo es diminuto en pantalla.
function ResourcePlaceholder({ kind }: { kind: CanvasElement["kind"] }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-lg border border-white/5 bg-slate-800/40 text-[11px] font-medium uppercase tracking-widest text-slate-500">
      {KIND_LABEL[kind]}
    </div>
  );
}

type ResourceNodeData = { el: CanvasElement };
type ResourceNode = Node<ResourceNodeData, "resource">;
type ContainerNode = Node<ResourceNodeData, "container">;
type AppNode = ResourceNode | ContainerNode;

function ResourceNode({ id, data }: NodeProps<ResourceNode>) {
  const highlighted = useCanvasStore((s) => s.highlightedId === id);
  const { zoom } = useViewport();
  const clarifications = useCanvasStore((s) => s.clarifications[id]);
  const el = data.el;
  // Los temas de nivel 0 siempre se ven completos (idéntico a antes). Solo los hijos
  // anidados usan LOD: muestran un placeholder barato mientras son diminutos en pantalla.
  const full = el.parentId == null || NODE_W * zoom >= LOD_FULL_PX;
  return (
    <div
      style={{ width: widthForKind(el) }}
      className={`relative rounded-2xl border bg-slate-900/70 p-4 shadow-xl shadow-black/30 backdrop-blur transition ${
        highlighted
          ? "border-indigo-400 ring-2 ring-indigo-400/70 shadow-indigo-500/30"
          : "border-white/10"
      }`}
    >
      {clarifications && clarifications.length > 0 && (
        <div className="absolute -right-2 -top-2 z-20 flex flex-row-reverse gap-1">
          {clarifications.map((c) => (
            <ClarificationBadge key={c.id} termino={c.termino} definicion={c.definicion} />
          ))}
        </div>
      )}
      <Handle type="target" position={Position.Top} className="!bg-indigo-400/40" />
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-indigo-300">
        {el.titulo}
      </h3>
      {full ? (
        <ErrorBoundary>{renderBody(el)}</ErrorBoundary>
      ) : (
        <ResourcePlaceholder kind={el.kind} />
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400/40" />
    </div>
  );
}

// Contenedor de un tema: marco grande con una banda de título enorme (legible al alejarse).
// Sus hijos son nodos React Flow aparte, anidados vía parentId, así que aquí no se dibuja cuerpo.
function ContainerNode({ data, width, height }: NodeProps<ContainerNode>) {
  const el = data.el;
  const w = width ?? EMPTY_W;
  const h = height ?? EMPTY_H;
  return (
    <div
      style={{ width: w, height: h }}
      className="rounded-[2.5rem] border-2 border-indigo-400/25 bg-indigo-500/[0.04] shadow-2xl shadow-black/40 backdrop-blur-sm"
    >
      <Handle type="target" position={Position.Top} className="!bg-indigo-400/40" />
      <div
        style={{ height: COVER_H }}
        className="flex flex-col justify-center gap-3 border-b border-white/10 px-12"
      >
        <span
          style={{ fontSize: COVER_H * 0.14 }}
          className="font-semibold uppercase tracking-[0.3em] text-indigo-300/60"
        >
          Tema
        </span>
        <h2
          style={{ fontSize: COVER_H * 0.42, lineHeight: 1.02 }}
          className="font-bold tracking-tight text-indigo-50"
        >
          {el.titulo}
        </h2>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400/40" />
    </div>
  );
}

const nodeTypes = { resource: ResourceNode, container: ContainerNode };

// Ordena los elementos para que cada tema (padre) aparezca antes que sus hijos: requisito de React Flow.
function orderParentsFirst(els: CanvasElement[]): CanvasElement[] {
  const topics = els.filter((e) => e.parentId == null);
  const topicIds = new Set(topics.map((t) => t.id));
  const out: CanvasElement[] = [];
  for (const t of topics) {
    out.push(t);
    for (const c of els) if (c.parentId === t.id) out.push(c);
  }
  for (const e of els) if (e.parentId != null && !topicIds.has(e.parentId)) out.push(e);
  return out;
}

function Flow() {
  const storeElements = useCanvasStore((s) => s.elements);
  const storeEdges = useCanvasStore((s) => s.edges);
  const version = useCanvasStore((s) => s.version);
  const cameraTarget = useCanvasStore((s) => s.cameraTarget);
  const cameraTick = useCanvasStore((s) => s.cameraTick);

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodesInitialized = useNodesInitialized();
  const { fitView, getNode, setCenter } = useReactFlow();
  const layoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centra la cámara en un nodo por su posición ABSOLUTA (suma la del padre si está anidado).
  // Reintenta unos frames por si el nodo aún no fue confirmado por React Flow (recién creado).
  const flyToNode = useCallback(
    (id: string, zoom: number) => {
      let tries = 0;
      const attempt = () => {
        const n = getNode(id);
        if (!n) {
          if (tries++ < 8) requestAnimationFrame(attempt);
          return;
        }
        const base = n.parentId ? getNode(n.parentId) : null;
        const ax = (base?.position.x ?? 0) + n.position.x;
        const ay = (base?.position.y ?? 0) + n.position.y;
        const w = n.measured?.width ?? n.width ?? NODE_W;
        const h = n.measured?.height ?? n.height ?? FALLBACK_H;
        setCenter(ax + w / 2, ay + h / 2, { zoom, duration: 600 });
      };
      attempt();
    },
    [getNode, setCenter],
  );

  // Sincroniza nodos/aristas desde el store, preservando posiciones/medidas/tamaños ya calculados.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return orderParentsFirst(storeElements).map((el) => {
        const existing = byId.get(el.id);
        const base = {
          id: el.id,
          position: existing?.position ?? { x: 0, y: 0 },
          data: { el },
          measured: existing?.measured,
          width: existing?.width,
          height: existing?.height,
          ...(el.parentId ? { parentId: el.parentId, extent: "parent" as const } : {}),
        };
        return (
          isContainer(storeElements, el.id)
            ? { ...base, type: "container" as const }
            : { ...base, type: "resource" as const }
        ) as AppNode;
      });
    });
    setEdges(
      storeEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
        style: { stroke: "#818cf8", strokeWidth: 1.5 },
        labelStyle: { fill: "#cbd5e1", fontSize: 11 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
      })),
    );
  }, [storeElements, storeEdges, setNodes, setEdges]);

  // Re-layout de dos niveles al cambiar la estructura. Debounced para coalescer ráfagas de upsert
  // durante la generación en vivo. Mientras hay un tema activo, no se hace el fit global.
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    if (layoutTimer.current) clearTimeout(layoutTimer.current);
    layoutTimer.current = setTimeout(() => {
      setNodes((curr) => {
        const measuredById = new Map(curr.map((n) => [n.id, n.measured]));
        const layout = layoutWorld(storeElements, storeEdges, measuredById);
        return curr.map((n) => {
          const r = layout.get(n.id);
          if (!r) return n;
          return {
            ...n,
            position: r.position,
            ...(r.width != null ? { width: r.width, height: r.height } : {}),
          };
        });
      });
      requestAnimationFrame(() => {
        const apid = useCanvasStore.getState().activeParentId;
        if (apid) {
          const kids = childrenOf(useCanvasStore.getState().elements, apid).map((e) => ({
            id: e.id,
          }));
          if (kids.length) {
            void fitView({ nodes: kids, padding: 0.3, duration: 300, maxZoom: ENTER_MAXZOOM });
          }
        } else {
          void fitView({ padding: 0.25, duration: 450, maxZoom: 1.1 });
        }
      });
    }, 120);
    return () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nodesInitialized]);

  // Mueve la cámara según el objetivo del store (resaltar / profundizar / alejar).
  useEffect(() => {
    const t = cameraTarget;
    if (t.kind === "overview") {
      const topicIds = storeElements
        .filter((e) => e.parentId == null)
        .map((e) => ({ id: e.id }));
      if (topicIds.length) {
        void fitView({ nodes: topicIds, padding: 0.2, duration: 700, maxZoom: 1.1 });
      }
      return;
    }
    if (t.kind === "into") {
      const kids = childrenOf(storeElements, t.id).map((e) => ({ id: e.id }));
      if (kids.length === 0) {
        flyToNode(t.id, 0.9); // tema aún vacío: solo céntralo; los hijos lo re-encuadran al aparecer
        return;
      }
      // Movimiento Prezi: encuadra el contenedor un instante y luego vuela a sus hijos.
      void fitView({ nodes: [{ id: t.id }], duration: 300, maxZoom: 1.1 }).then(() =>
        fitView({ nodes: kids, padding: 0.3, duration: 600, maxZoom: ENTER_MAXZOOM }),
      );
      return;
    }
    if (t.kind === "node") {
      flyToNode(t.id, 1.15);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraTick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.05}
      maxZoom={5}
      onlyRenderVisibleElements
      nodesDraggable={false}
      proOptions={{ hideAttribution: true }}
      className="!bg-transparent"
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#334155" />
    </ReactFlow>
  );
}

export function Canvas() {
  const hasElements = useCanvasStore((s) => s.elements.length > 0);

  if (!hasElements) {
    return (
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center text-slate-400">
        <p className="max-w-md text-lg">
          Tu lienzo está vacío. Conecta el micrófono y di algo como{" "}
          <span className="text-slate-200">«explícame el ciclo del agua»</span> para
          verlo cobrar vida.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-white/5">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
}
