import { RealtimeAgent, tool } from "@openai/agents-realtime";
import { z } from "zod";
import { useCanvasStore } from "./store";

const crearTarjeta = tool({
  name: "crear_tarjeta",
  description:
    "Crea una tarjeta de texto en el canvas con una idea clave, definición, lista de puntos o fórmula. Úsala para resumir conceptos.",
  parameters: z.object({
    titulo: z.string().describe("Título corto de la tarjeta (3-6 palabras)."),
    contenido_markdown: z
      .string()
      .describe(
        "Contenido en Markdown (encabezados, listas, **negritas**). Para fórmulas matemáticas usa LaTeX entre signos de dólar, por ejemplo $E = mc^2$.",
      ),
  }),
  execute: async ({ titulo, contenido_markdown }) => {
    useCanvasStore.getState().addElement({
      kind: "card",
      titulo,
      markdown: contenido_markdown,
    });
    return "Tarjeta creada en el canvas.";
  },
});

const crearDiagrama = tool({
  name: "crear_diagrama",
  description:
    "Crea un diagrama o mapa mental en el canvas usando código Mermaid. Úsalo para procesos, ciclos, jerarquías o relaciones entre conceptos.",
  parameters: z.object({
    titulo: z.string().describe("Título corto del diagrama."),
    mermaid: z
      .string()
      .describe(
        "Código Mermaid válido y simple. Prefiere 'flowchart TD' o 'mindmap'. Usa etiquetas cortas sin caracteres especiales raros.",
      ),
  }),
  execute: async ({ titulo, mermaid }) => {
    useCanvasStore.getState().addElement({ kind: "diagram", titulo, mermaid });
    return "Diagrama creado en el canvas.";
  },
});

const crearGrafico = tool({
  name: "crear_grafico",
  description:
    "Crea un gráfico de datos en el canvas. Úsalo cuando haya cantidades, comparaciones o proporciones que mostrar.",
  parameters: z.object({
    titulo: z.string().describe("Título corto del gráfico."),
    tipo: z.enum(["bar", "line", "pie"]).describe("Tipo de gráfico."),
    data: z
      .array(
        z.object({
          label: z.string().describe("Etiqueta de la categoría o punto."),
          value: z.number().describe("Valor numérico."),
        }),
      )
      .describe("Entre 2 y 8 puntos de datos."),
  }),
  execute: async ({ titulo, tipo, data }) => {
    useCanvasStore.getState().addElement({ kind: "chart", titulo, tipo, data });
    return "Gráfico creado en el canvas.";
  },
});

const limpiarCanvas = tool({
  name: "limpiar_canvas",
  description: "Borra todos los elementos del canvas. Úsalo cuando el usuario pida empezar de nuevo o limpiar.",
  parameters: z.object({}),
  execute: async () => {
    useCanvasStore.getState().clear();
    return "Canvas limpiado.";
  },
});

const INSTRUCTIONS = `Eres un tutor visual en español. Tu trabajo es enseñar cualquier tema poblando un canvas con recursos gráficos mientras conversas.

REGLA PRINCIPAL: además de hablar, SIEMPRE usa tus herramientas para poner lo importante en el canvas. No te limites a responder en voz; cada explicación debe dejar algo visual.

Cómo trabajar:
- Habla de forma cálida, clara y BREVE (1 o 2 frases por turno). El detalle va en las tarjetas y diagramas, no en tu voz.
- Elige la herramienta adecuada:
  - crear_tarjeta: para definiciones, ideas clave, listas o fórmulas (usa LaTeX entre $...$).
  - crear_diagrama: para procesos, ciclos, jerarquías o relaciones (código Mermaid).
  - crear_grafico: cuando haya datos, cantidades o comparaciones.
  - limpiar_canvas: cuando pidan empezar de nuevo.
- Puedes usar varias herramientas en un mismo turno para cubrir un tema desde varios ángulos.
- Si el usuario no pide un tema concreto, sugiérele uno o pregúntale qué quiere aprender.

Ejemplos de Mermaid válido y simple:
flowchart TD
  A[Sol] --> B[Evaporacion]
  B --> C[Condensacion]
  C --> D[Precipitacion]
  D --> A

mindmap
  root((Fotosintesis))
    Luz solar
    Agua
    Dioxido de carbono
    Glucosa

Mantén las etiquetas de Mermaid cortas y sin tildes ni símbolos raros para evitar errores de sintaxis.`;

export function createTutorAgent() {
  return new RealtimeAgent({
    name: "Tutor",
    voice: "marin",
    instructions: INSTRUCTIONS,
    tools: [crearTarjeta, crearDiagrama, crearGrafico, limpiarCanvas],
  });
}
