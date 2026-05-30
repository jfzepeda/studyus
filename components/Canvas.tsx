"use client";

import { useEffect } from "react";
import dagre from "@dagrejs/dagre";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore, type CanvasElement } from "@/lib/store";
import { ClarificationBadge } from "./ClarificationBadge";
import { ErrorBoundary } from "./ErrorBoundary";
import { CardRenderer } from "./renderers/CardRenderer";
import { ChartRenderer } from "./renderers/ChartRenderer";
import { DiagramRenderer } from "./renderers/DiagramRenderer";
import { DrawingRenderer } from "./renderers/DrawingRenderer";
import { FormulaRenderer } from "./renderers/FormulaRenderer";
import { ImageRenderer } from "./renderers/ImageRenderer";
import { QuizRenderer } from "./renderers/QuizRenderer";

const NODE_W = 340;
const FALLBACK_H = 200;

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
  }
}

type ResourceNodeData = { el: CanvasElement };
type ResourceNode = Node<ResourceNodeData, "resource">;

function ResourceNode({ id, data }: NodeProps<ResourceNode>) {
  const highlighted = useCanvasStore((s) => s.highlightedId === id);
  const clarifications = useCanvasStore((s) => s.clarifications[id]);
  const el = data.el;
  return (
    <div
      style={{ width: NODE_W }}
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
      <ErrorBoundary>{renderBody(el)}</ErrorBoundary>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400/40" />
    </div>
  );
}

const nodeTypes = { resource: ResourceNode };

function getLayouted(nodes: ResourceNode[], edges: Edge[]): ResourceNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) =>
    g.setNode(n.id, {
      width: n.measured?.width ?? NODE_W,
      height: n.measured?.height ?? FALLBACK_H,
    }),
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const p = g.node(n.id);
    const w = n.measured?.width ?? NODE_W;
    const h = n.measured?.height ?? FALLBACK_H;
    return { ...n, position: { x: p.x - w / 2, y: p.y - h / 2 } };
  });
}

function Flow() {
  const storeElements = useCanvasStore((s) => s.elements);
  const storeEdges = useCanvasStore((s) => s.edges);
  const version = useCanvasStore((s) => s.version);
  const focusTick = useCanvasStore((s) => s.focusTick);
  const highlightedId = useCanvasStore((s) => s.highlightedId);

  const [nodes, setNodes, onNodesChange] = useNodesState<ResourceNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const nodesInitialized = useNodesInitialized();
  const { fitView, getNode, setCenter } = useReactFlow();

  // Sincroniza nodos/aristas desde el store, preservando posiciones ya calculadas.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return storeElements.map((el) => {
        const existing = byId.get(el.id);
        return {
          id: el.id,
          type: "resource" as const,
          position: existing?.position ?? { x: 0, y: 0 },
          data: { el },
          measured: existing?.measured,
        };
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

  // Re-layout cuando cambia la estructura y los nodos ya fueron medidos.
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;
    setNodes((curr) => getLayouted(curr, edges));
    const raf = requestAnimationFrame(() =>
      fitView({ padding: 0.25, duration: 450, maxZoom: 1.1 }),
    );
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, nodesInitialized]);

  // Mueve la cámara al elemento resaltado (solo en foco deliberado).
  useEffect(() => {
    if (!highlightedId) return;
    const n = getNode(highlightedId);
    if (!n) return;
    const w = n.measured?.width ?? NODE_W;
    const h = n.measured?.height ?? FALLBACK_H;
    setCenter(n.position.x + w / 2, n.position.y + h / 2, {
      zoom: 1.15,
      duration: 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.2}
      maxZoom={1.8}
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
