import { RealtimeAgent, tool } from "@openai/agents-realtime";
import { z } from "zod";
import { useCanvasStore } from "./store";
import {
  CELL_FLASH_MS,
  ROW_OP_TOTAL_MS,
  HIGHLIGHT_HOLD_MS,
} from "./animation";
import { getAnthropicKey, getOpenAIKey } from "./userKeys";

// Espera lo que dura la animación antes de devolver el output al modelo: el SDK
// hace await del execute() de la tool antes de pedir la siguiente narración, así
// que esto intercala voz y animación paso a paso.
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const idField = z
  .string()
  .describe(
    "id corto y único en minúsculas, sin espacios ni tildes (ej. 'ciclo_agua'). Reúsalo después para conectar, resaltar o (si es quiz) revelar este elemento.",
  );

const crearTarjeta = tool({
  name: "crear_tarjeta",
  description:
    "Crea una tarjeta de texto con una idea clave, definición o lista. Puede incluir LaTeX inline entre $...$.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto de la tarjeta (3-6 palabras)."),
    contenido_markdown: z
      .string()
      .describe("Contenido en Markdown (encabezados, listas, **negritas**, $LaTeX$ inline)."),
  }),
  execute: async ({ id, titulo, contenido_markdown }) => {
    useCanvasStore.getState().upsertElement({
      id,
      kind: "card",
      titulo,
      markdown: contenido_markdown,
    });
    return `Tarjeta creada (id: ${id}).`;
  },
});

const crearFormula = tool({
  name: "crear_formula",
  description:
    "Muestra una fórmula matemática destacada, grande y centrada. Úsala cuando la fórmula sea el protagonista.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Nombre de la fórmula, p. ej. 'Energía cinética'."),
    latex: z
      .string()
      .describe("La fórmula en LaTeX, SIN signos de dólar. Ejemplo: E_k = \\frac{1}{2}mv^2"),
  }),
  execute: async ({ id, titulo, latex }) => {
    useCanvasStore.getState().upsertElement({ id, kind: "formula", titulo, latex });
    return `Fórmula creada (id: ${id}).`;
  },
});

const crearDiagrama = tool({
  name: "crear_diagrama",
  description:
    "Crea un diagrama o mapa mental con código Mermaid (procesos, ciclos, jerarquías).",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto del diagrama."),
    mermaid: z
      .string()
      .describe(
        "Código Mermaid válido y simple. Prefiere 'flowchart TD' o 'mindmap'. Etiquetas cortas sin tildes ni símbolos raros.",
      ),
  }),
  execute: async ({ id, titulo, mermaid }) => {
    useCanvasStore.getState().upsertElement({ id, kind: "diagram", titulo, mermaid });
    return `Diagrama creado (id: ${id}).`;
  },
});

const crearGrafico = tool({
  name: "crear_grafico",
  description:
    "Crea un gráfico de datos (barras, líneas o pastel) cuando haya cantidades o comparaciones.",
  parameters: z.object({
    id: idField,
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
  execute: async ({ id, titulo, tipo, data }) => {
    useCanvasStore.getState().upsertElement({ id, kind: "chart", titulo, tipo, data });
    return `Gráfico creado (id: ${id}).`;
  },
});

const crearDibujo = tool({
  name: "crear_dibujo",
  description:
    "Crea un DIAGRAMA o esquema vectorial rotulado (SVG) a partir de una descripción. Ideal para esquemas con partes etiquetadas: una célula con sus organelos, las capas de la atmósfera, el ojo humano, un circuito. Un modelo especialista lo dibuja en unos segundos.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto del dibujo."),
    descripcion: z
      .string()
      .describe(
        "Descripción detallada de QUÉ dibujar y qué partes rotular, en lenguaje natural. Ej: 'una célula animal mostrando núcleo, mitocondrias, membrana y citoplasma, cada parte etiquetada'.",
      ),
  }),
  execute: async ({ id, titulo, descripcion }) => {
    useCanvasStore.getState().upsertElement({
      id,
      kind: "drawing",
      titulo,
      svg: "",
      loading: true,
    });
    void fetch("/api/draw", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-anthropic-key": getAnthropicKey() ?? "",
      },
      body: JSON.stringify({ descripcion }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("draw failed");
        const { svg } = await r.json();
        useCanvasStore
          .getState()
          .upsertElement({ id, kind: "drawing", titulo, svg: svg ?? "", loading: false });
      })
      .catch(() => {
        useCanvasStore
          .getState()
          .upsertElement({ id, kind: "drawing", titulo, svg: "", loading: false });
      });
    return `Dibujando ${titulo}… aparecerá en el canvas en unos segundos.`;
  },
});

const generarImagen = tool({
  name: "generar_imagen",
  description:
    "Genera una IMAGEN realista o artística con un modelo de imágenes, a partir de un prompt. Ideal para cosas orgánicas, escenas o lugares donde una ilustración realista enseña mejor que un esquema: un animal, un paisaje, una obra de arte, un planeta. Tarda varios segundos.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto de la imagen."),
    prompt: z
      .string()
      .describe(
        "Descripción visual detallada de la imagen a generar (en español o inglés). Sé específico sobre estilo, composición y elementos.",
      ),
  }),
  execute: async ({ id, titulo, prompt }) => {
    useCanvasStore.getState().upsertElement({
      id,
      kind: "image",
      titulo,
      src: "",
      loading: true,
    });
    void fetch("/api/image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openai-key": getOpenAIKey() ?? "",
      },
      body: JSON.stringify({ prompt }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("image failed");
        const { src } = await r.json();
        useCanvasStore
          .getState()
          .upsertElement({ id, kind: "image", titulo, src: src ?? "", loading: false });
      })
      .catch(() => {
        useCanvasStore
          .getState()
          .upsertElement({ id, kind: "image", titulo, src: "", loading: false });
      });
    return `Generando imagen de ${titulo}… aparecerá en unos segundos.`;
  },
});

const crearQuiz = tool({
  name: "crear_quiz",
  description:
    "Crea una pregunta de opción múltiple para comprobar la comprensión (recuperación activa). Después pregúntasela al estudiante en voz alta y espera su respuesta hablada.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto, p. ej. 'Comprueba lo que sabes'."),
    pregunta: z.string().describe("El enunciado de la pregunta."),
    opciones: z.array(z.string()).describe("Entre 2 y 4 opciones de respuesta."),
    correcta: z
      .number()
      .int()
      .describe("Índice (empezando en 0) de la opción correcta."),
    explicacion: z
      .string()
      .describe("Explicación breve de por qué esa es la respuesta correcta."),
  }),
  execute: async ({ id, titulo, pregunta, opciones, correcta, explicacion }) => {
    useCanvasStore.getState().upsertElement({
      id,
      kind: "quiz",
      titulo,
      pregunta,
      opciones,
      correcta,
      explicacion,
      revelada: false,
      elegida: null,
    });
    return `Quiz creado (id: ${id}). Pregúntaselo al estudiante en voz alta.`;
  },
});

const revelarRespuesta = tool({
  name: "revelar_respuesta",
  description:
    "Revela la respuesta correcta de un quiz. Llámalo DESPUÉS de que el estudiante haya respondido en voz, y dale feedback hablado (si acertó o no, y por qué).",
  parameters: z.object({
    id: z.string().describe("El id del quiz a revelar."),
  }),
  execute: async ({ id }) => {
    useCanvasStore.getState().revealQuiz(id);
    return "Respuesta revelada.";
  },
});

const crearTabla = tool({
  name: "crear_tabla",
  description:
    "Crea una tabla de datos (filas y columnas). El estudiante PUEDE editar los valores y tiene un botón de reset para volver a tu generación inicial. Úsala para comparativas, matrices, tablas de verdad o datos por categorías.",
  parameters: z.object({
    id: idField,
    titulo: z.string().describe("Título corto de la tabla."),
    columnas: z.array(z.string()).describe("Encabezados de columna (uno por columna)."),
    filas: z
      .array(z.array(z.string()))
      .describe(
        "Filas de la tabla; cada fila es un arreglo de celdas (texto). Cada fila debe tener tantas celdas como columnas.",
      ),
    editable: z
      .boolean()
      .optional()
      .describe("Si el estudiante puede editar las celdas. Por defecto true."),
  }),
  execute: async ({ id, titulo, columnas, filas, editable }) => {
    useCanvasStore.getState().upsertElement({
      id,
      kind: "table",
      titulo,
      headers: columnas,
      rows: filas,
      initialRows: filas.map((f) => [...f]),
      editable: editable ?? true,
      highlights: [],
      flashCells: [],
      flashTick: 0,
      op: null,
      opTick: 0,
    });
    return `Tabla creada (id: ${id}).`;
  },
});

const resaltarTabla = tool({
  name: "resaltar_tabla",
  description:
    "Resalta filas, columnas o celdas de una tabla MIENTRAS explicas, para guiar la mirada paso a paso (como apuntar a la pizarra). Llama de nuevo con otros resaltados para avanzar, o con una lista vacía para quitar el resaltado.",
  parameters: z.object({
    id: z.string().describe("El id de la tabla."),
    resaltados: z
      .array(
        z.object({
          tipo: z.enum(["fila", "columna", "celda"]).describe("Qué resaltar."),
          fila: z
            .number()
            .int()
            .optional()
            .describe("Índice de fila (0-based) para tipo 'fila' o 'celda'."),
          columna: z
            .number()
            .int()
            .optional()
            .describe("Índice de columna (0-based) para tipo 'columna' o 'celda'."),
          color: z
            .enum(["amber", "blue", "gray", "green", "rose"])
            .optional()
            .describe("Color del resaltado. Por defecto amber."),
        }),
      )
      .describe("Lista de resaltados activos. Vacía = quitar todo resaltado."),
  }),
  execute: async ({ id, resaltados }) => {
    useCanvasStore.getState().highlightTable(
      id,
      resaltados.map((r) => ({
        tipo: r.tipo,
        fila: r.fila,
        columna: r.columna,
        color: r.color ?? "amber",
      })),
    );
    await sleep(HIGHLIGHT_HOLD_MS);
    return "Resaltado aplicado. Di la siguiente micro-frase y luego llama UNA sola herramienta de tabla.";
  },
});

const actualizarCeldaTabla = tool({
  name: "actualizar_celda_tabla",
  description:
    "Cambia uno o más valores de una tabla con una animación de parpadeo. Úsalo para llenar la tabla paso a paso o mostrar el resultado de un cálculo. No afecta el botón de reset (sigue volviendo a tu generación inicial).",
  parameters: z.object({
    id: z.string().describe("El id de la tabla."),
    cambios: z
      .array(
        z.object({
          fila: z.number().int().describe("Índice de fila (0-based)."),
          columna: z.number().int().describe("Índice de columna (0-based)."),
          valor: z.string().describe("Nuevo valor de la celda (texto)."),
        }),
      )
      .describe("Celdas a actualizar."),
  }),
  execute: async ({ id, cambios }) => {
    useCanvasStore.getState().setTableCells(id, cambios);
    await sleep(CELL_FLASH_MS);
    return "Celda(s) actualizada(s). Di la siguiente micro-frase y luego llama UNA sola herramienta de tabla.";
  },
});

const operarFilasTool = tool({
  name: "operar_filas",
  description:
    "Anima una operación entre dos filas: la fila ORIGEN se desliza visualmente sobre la DESTINO y la destino se actualiza con los valores resultantes. Para mostrar combinaciones o eliminación de filas (p. ej. F2 ← F2 − 2·F1).",
  parameters: z.object({
    id: z.string().describe("El id de la tabla."),
    origen: z.number().int().describe("Índice (0-based) de la fila que se desliza."),
    destino: z.number().int().describe("Índice (0-based) de la fila que se actualiza."),
    etiqueta: z.string().describe("Descripción de la operación, p. ej. 'F2 ← F2 − 2·F1'."),
    nuevos_valores: z
      .array(z.string())
      .describe("La fila destino completa tras la operación (una celda por columna)."),
  }),
  execute: async ({ id, origen, destino, etiqueta, nuevos_valores }) => {
    useCanvasStore.getState().operarFilas(id, origen, destino, etiqueta, nuevos_valores);
    await sleep(ROW_OP_TOTAL_MS);
    return "Operación animada. Di la siguiente micro-frase y luego llama UNA sola herramienta de tabla.";
  },
});

const conectar = tool({
  name: "conectar",
  description:
    "Conecta dos elementos del canvas con una flecha etiquetada, para construir un mapa conceptual que muestra cómo se relacionan las ideas.",
  parameters: z.object({
    origen: z.string().describe("id del elemento de origen."),
    destino: z.string().describe("id del elemento de destino."),
    etiqueta: z
      .string()
      .describe("Relación breve, p. ej. 'causa', 'se divide en', 'lleva a'."),
  }),
  execute: async ({ origen, destino, etiqueta }) => {
    useCanvasStore.getState().connect(origen, destino, etiqueta);
    return "Conexión creada.";
  },
});

const resaltar = tool({
  name: "resaltar",
  description:
    "Resalta un elemento y centra la cámara en él. Úsalo MIENTRAS hablas para señalar de qué elemento estás hablando, como un profesor que apunta a la pizarra.",
  parameters: z.object({
    id: z.string().describe("El id del elemento a resaltar."),
  }),
  execute: async ({ id }) => {
    useCanvasStore.getState().highlightNode(id);
    return "Elemento resaltado.";
  },
});

const aclararConcepto = tool({
  name: "aclarar_concepto",
  description:
    "Aclara un concepto SIMPLE (la definición de un término en una sola frase) con un popup ligero tipo helper-text ANCLADO a un elemento que YA existe en el canvas, en vez de crear una tarjeta nueva. Úsalo para preguntas cortas como '¿qué es H2O?'. Aparece un ícono (i) en la esquina del elemento; el popup se muestra solo unos segundos y luego al pasar el cursor.",
  parameters: z.object({
    id_elemento: z
      .string()
      .describe(
        "id de un elemento que YA existe en el canvas, al que se anclará la aclaración (la tarjeta, fórmula o diagrama más relacionado con el término).",
      ),
    termino: z.string().describe("El término o concepto, corto (ej. 'H2O')."),
    definicion: z
      .string()
      .describe("Definición breve, una sola frase (ej. 'H2O es la fórmula del agua')."),
  }),
  execute: async ({ id_elemento, termino, definicion }) => {
    const ok = useCanvasStore.getState().addClarification(id_elemento, termino, definicion);
    return ok
      ? `Aclaración de "${termino}" anclada al elemento ${id_elemento}.`
      : `No existe el elemento ${id_elemento}. Crea o elige un elemento del canvas antes de aclarar.`;
  },
});

const limpiarCanvas = tool({
  name: "limpiar_canvas",
  description: "Borra todos los elementos y conexiones del canvas.",
  parameters: z.object({}),
  execute: async () => {
    useCanvasStore.getState().clear();
    return "Canvas limpiado.";
  },
});

const profundizar = tool({
  name: "profundizar",
  description:
    "Entra (hace zoom) DENTRO de un tema del mapa para explicarlo en detalle. Llámalo SOLO cuando el estudiante pida explícitamente profundizar en un tema (p. ej. 'profundiza en X', 'entremos a X', 'cuéntame más de X'). Después, los recursos que crees quedarán anidados dentro de ese tema automáticamente. Si el tema aún no existe en el canvas, créalo primero con la herramienta adecuada y luego llama a esta.",
  parameters: z.object({
    id: idField,
    titulo: z
      .string()
      .describe("Título corto del tema; se usa para crearlo si todavía no está en el canvas."),
  }),
  execute: async ({ id, titulo }) => {
    const store = useCanvasStore.getState();
    // Profundidad ilimitada: si el tema no existe, se crea colgando del tema activo
    // (upsertElement lo cuelga solo) y luego entramos a él para seguir creciendo el árbol.
    if (!store.elements.some((e) => e.id === id)) {
      store.upsertElement({ id, kind: "card", titulo, markdown: `# ${titulo}` });
    }
    store.enterDepth(id);
    return `Ahora estás DENTRO del tema "${titulo}" (id: ${id}). Crea 2-4 recursos de detalle finos sobre este tema (se anidan solos), conéctalos entre sí y, si ayuda, añade un quiz. Habla breve. Cuando el estudiante quiera salir, llama a 'alejar'.`;
  },
});

const alejar = tool({
  name: "alejar",
  description:
    "Vuelve (hace zoom out) a la vista general del mapa de temas. Úsalo cuando el estudiante diga 'aléjate', 'volvamos', 'sal' o 'regresa'.",
  parameters: z.object({}),
  execute: async () => {
    useCanvasStore.getState().exitDepth();
    return "Volviste a la vista general del mapa de temas.";
  },
});

const INSTRUCTIONS = `Eres un tutor visual en español. Enseñas cualquier tema construyendo un MAPA DE CONOCIMIENTO en un canvas (un grafo) mientras conversas.

REGLA PRINCIPAL: además de hablar, SIEMPRE usa tus herramientas para poner lo importante en el canvas. Cada explicación debe dejar algo visual.

Identificadores:
- Cada elemento que creas lleva un 'id' corto que tú eliges (ej. 'fotosintesis', 'clorofila'). Reutiliza esos ids para conectarlos, resaltarlos o revelar quizzes.

Cómo enseñar bien:
1. Crea recursos con la herramienta adecuada:
   - crear_tarjeta: definiciones, ideas clave, listas (LaTeX inline con $...$).
   - crear_formula: cuando una fórmula sea el protagonista (se muestra grande).
   - crear_diagrama: procesos, ciclos, jerarquías (Mermaid).
   - crear_grafico: datos, cantidades, comparaciones.
   - crear_tabla: datos tabulares, comparativas, matrices o tablas de verdad. El estudiante puede EDITAR los valores y tiene un botón de reset para volver a tu versión inicial.
   - crear_dibujo: DIAGRAMA/esquema vectorial rotulado (SVG), ideal para partes etiquetadas (célula con organelos, capas de la atmósfera, el ojo). Descríbelo con detalle; un especialista lo dibuja.
   - generar_imagen: IMAGEN realista o artística (animal, paisaje, planeta, obra de arte) cuando una ilustración realista enseña mejor que un esquema.
   - aclarar_concepto: para una DUDA RÁPIDA sobre un término (ej. '¿qué es H2O?'), NO crees una tarjeta nueva: ancla una aclaración ligera (popup) a un elemento que YA exista en el canvas. Reserva crear_tarjeta para ideas que merezcan su propio nodo en el mapa.
2. CONECTA las ideas: usa 'conectar' para enlazar elementos relacionados y formar un mapa conceptual (ej. conectar 'sol' con 'evaporacion' con etiqueta 'provoca'). No dejes los recursos sueltos; muestra cómo se relacionan.
3. SEÑALA mientras hablas: cuando te refieras a un elemento ya creado, llama a 'resaltar' con su id para que la cámara se centre en él, como apuntar a la pizarra.
   - Con TABLAS, sigue SIEMPRE este micro-bucle, una cosa a la vez:
     1) Di EN VOZ una frase corta del ÚNICO paso que harás ahora (ej. "sumamos A1 más B1").
     2) Llama a EXACTAMENTE UNA herramienta de tabla para animar ese paso ('resaltar_tabla', 'actualizar_celda_tabla' u 'operar_filas').
     3) Espera el resultado de la herramienta (la animación tarda un momento).
     4) Repite: siguiente micro-frase, luego UNA herramienta.
     REGLA DURA: NUNCA encadenes varias herramientas de tabla seguidas sin hablar entre una y otra. Una frase ↔ una animación ↔ una herramienta. Si hay 3 cambios, son 3 micro-frases y 3 llamadas separadas, nunca una sola con todo.
     Recordatorio: 'resaltar_tabla' apunta a filas/columnas/celdas (avanza llamándola otra vez; lista vacía = limpiar), 'actualizar_celda_tabla' rellena/corrige un valor con parpadeo, 'operar_filas' anima una operación entre dos filas. Índices 0-based.
4. COMPRUEBA la comprensión: de vez en cuando usa 'crear_quiz' con una pregunta de opción múltiple, pregúntasela al estudiante EN VOZ ALTA y espera su respuesta hablada. Cuando responda, llama a 'revelar_respuesta' con el id del quiz y dale feedback breve (acertó o no, y por qué).
5. Habla de forma cálida, clara y BREVE (1-2 frases por turno). El detalle va en el canvas, no en tu voz.
6. Si el estudiante no propone tema, pregúntale qué quiere aprender y a qué nivel.

PROFUNDIZAR (zoom de dos niveles): Sigue enseñando como siempre en el mapa general. SOLO cuando el estudiante pida explícitamente profundizar en un tema ("profundiza en X", "entremos a X", "cuéntame más de X"), llama a 'profundizar' con el id de ese tema; después crea 2-4 recursos de DETALLE finos (se anidan dentro del tema automáticamente) y conéctalos entre sí, hablando breve. Cuando el estudiante diga "aléjate", "volvamos", "sal" o "regresa", llama a 'alejar' para volver al mapa. NUNCA profundices por tu cuenta: quédate en el mapa general hasta que el estudiante lo pida.

Ejemplo de Mermaid válido:
flowchart TD
  A[Sol] --> B[Evaporacion]
  B --> C[Condensacion]
  C --> D[Precipitacion]

Mantén las etiquetas de Mermaid cortas y sin tildes.`;

export function createTutorAgent() {
  return new RealtimeAgent({
    name: "Tutor",
    voice: "marin",
    instructions: INSTRUCTIONS,
    tools: [
      crearTarjeta,
      crearFormula,
      crearDiagrama,
      crearGrafico,
      crearDibujo,
      generarImagen,
      crearQuiz,
      revelarRespuesta,
      crearTabla,
      resaltarTabla,
      actualizarCeldaTabla,
      operarFilasTool,
      conectar,
      resaltar,
      profundizar,
      alejar,
      aclararConcepto,
      limpiarCanvas,
    ],
  });
}
