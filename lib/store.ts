import { create } from "zustand";

export type ChartType = "bar" | "line" | "pie";

export type CardElement = {
  id: string;
  kind: "card";
  titulo: string;
  markdown: string;
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

export type CanvasElement = CardElement | DiagramElement | ChartElement;

/** Omit que se distribuye sobre la unión (Omit normal colapsa a las claves comunes). */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export type NewCanvasElement = DistributiveOmit<CanvasElement, "id">;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `el-${counter}`;
}

interface CanvasState {
  elements: CanvasElement[];
  /** Agrega un elemento al canvas y devuelve su id. */
  addElement: (el: NewCanvasElement) => string;
  clear: () => void;
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  addElement: (el) => {
    const id = nextId();
    set((state) => ({ elements: [...state.elements, { ...el, id } as CanvasElement] }));
    return id;
  },
  clear: () => set({ elements: [] }),
}));
