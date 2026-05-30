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
import { childrenOf, useCanvasStore, type CanvasElement } from "@/lib/store";
import {
  ENTER_MAXZOOM,
  FALLBACK_H,
  LOD_FULL_PX,
  NODE_W,
  layoutWorld,
  widthForKind,
  type Measured,
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
type AppNode = ResourceNode;

function ResourceNode({ id, data }: NodeProps<ResourceNode>) {
  const highlighted = useCanvasStore((s) => s.highlightedId === id);
  // Un tema (nivel 0) con detalles colgando recibe un acento sutil + eyebrow "Tema".
  const isTopicWithKids = useCanvasStore(
    (s) => data.el.parentId == null && s.elements.some((e) => e.parentId === id),
  );
  const { zoom } = useViewport();
  const clarifications = useCanvasStore((s) => s.clarifications[id]);
  const el = data.el;
  // Los temas de nivel 0 siempre se ven completos. Solo los detalles anidados usan LOD:
  // muestran un placeholder barato mientras son diminutos en pantalla.
  const full = el.parentId == null || NODE_W * zoom >= LOD_FULL_PX;
  return (
    <div
      style={{ width: widthForKind(el) }}
      className={`relative rounded-2xl border bg-slate-900/70 p-4 shadow-xl shadow-black/30 backdrop-blur transition ${
        highlighted
          ? "border-indigo-400 ring-2 ring-indigo-400/70 shadow-indigo-500/30"
          : isTopicWithKids
            ? "border-indigo-400/40"
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
      {isTopicWithKids && (
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300/50">
          Tema
        </span>
      )}
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

const nodeTypes = { resource: ResourceNode };

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
  // Caché monótona de la altura del cuerpo completo por nodo. El layout la usa para que el
  // LOD (placeholder corto al alejar) y el contenido async no encojan la geometría (RC-A/RC-B).
  const fullHeight = useRef<Map<string, number>>(new Map());
  // Solo movemos la cámara en cambios estructurales, no en re-layouts por crecimiento async.
  const lastFitVersion = useRef<number>(-1);

  // Centra la cámara en un nodo por su posición absoluta (ya no hay anidamiento de RF).
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
        const w = n.measured?.width ?? n.width ?? NODE_W;
        const h = n.measured?.height ?? n.height ?? FALLBACK_H;
        setCenter(n.position.x + w / 2, n.position.y + h / 2, { zoom, duration: 600 });
      };
      attempt();
    },
    [getNode, setCenter],
  );

  // Sincroniza nodos/aristas desde el store, preservando posiciones/medidas/estilo ya calculados.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return storeElements.map((el) => {
        const existing = byId.get(el.id);
        // Siembra el nodo nuevo cerca de su padre (no en (0,0)) para que durante la generación
        // en vivo brote de su tema y no se apile en el origen mientras corre el layout (RC-D).
        const parent = el.parentId ? byId.get(el.parentId) : undefined;
        const seed = parent
          ? { x: parent.position.x, y: parent.position.y + 160 }
          : { x: 0, y: 0 };
        return {
          id: el.id,
          type: "resource" as const,
          position: existing?.position ?? seed,
          data: { el },
          measured: existing?.measured,
        } as AppNode;
      });
    });
    setEdges(
      storeEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        ...(e.label ? { label: e.label } : {}),
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

  // Firma de las alturas medidas: cambia cuando el contenido async (Mermaid/charts/KaTeX/
  // imágenes) crece tras montarse, para re-disparar el layout (RC-B).
  const measureSig = nodes.map((n) => Math.round(n.measured?.height ?? 0)).join(",");

  // Re-layout de un nivel al cambiar la estructura o las medidas. COALESCENTE: si ya hay un
  // layout agendado, no se reinicia el timer. Así, el contenido que mide de forma inestable
  // (p. ej. charts cuyo ResponsiveContainer no se asienta) no puede "starvar" el layout y
  // dejar los nodos apilados en (0,0).
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    if (layoutTimer.current) return;
    layoutTimer.current = setTimeout(() => {
      layoutTimer.current = null;
      const { elements, edges } = useCanvasStore.getState();
      setNodes((curr) => {
        const measuredById = new Map<string, Measured>();
        for (const n of curr) {
          const best = Math.max(n.measured?.height ?? 0, fullHeight.current.get(n.id) ?? 0);
          if (best > 0) fullHeight.current.set(n.id, best);
          measuredById.set(n.id, best > 0 ? { height: best } : undefined);
        }
        const layout = layoutWorld(elements, edges, measuredById);
        return curr.map((n) => {
          const r = layout.get(n.id);
          return r ? { ...n, position: r.position } : n;
        });
      });
      requestAnimationFrame(() => {
        // La cámara solo se mueve en cambios estructurales, no en re-layouts por medidas.
        const v = useCanvasStore.getState().version;
        const structural = v !== lastFitVersion.current;
        lastFitVersion.current = v;
        if (!structural) return;
        const apid = useCanvasStore.getState().activeParentId;
        if (apid) {
          const kids = childrenOf(useCanvasStore.getState().elements, apid).map((e) => ({
            id: e.id,
          }));
          if (kids.length) {
            void fitView({
              nodes: [{ id: apid }, ...kids],
              padding: 0.3,
              duration: 300,
              maxZoom: ENTER_MAXZOOM,
            });
          }
        } else {
          void fitView({ padding: 0.25, duration: 450, maxZoom: 1.1 });
        }
      });
    }, 140);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nodesInitialized, measureSig]);

  // Cancela un layout pendiente solo al desmontar (no en cada cambio de medida).
  useEffect(
    () => () => {
      if (layoutTimer.current) clearTimeout(layoutTimer.current);
    },
    [],
  );

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
      // "Vuela a la rama": encuadra el tema junto con sus detalles directos.
      const kids = childrenOf(storeElements, t.id).map((e) => ({ id: e.id }));
      if (kids.length === 0) {
        flyToNode(t.id, 0.9); // tema aún sin detalles: solo céntralo; al brotar lo re-encuadran
        return;
      }
      void fitView({ nodes: [{ id: t.id }], duration: 300, maxZoom: 1.1 }).then(() =>
        fitView({
          nodes: [{ id: t.id }, ...kids],
          padding: 0.3,
          duration: 600,
          maxZoom: ENTER_MAXZOOM,
        }),
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
