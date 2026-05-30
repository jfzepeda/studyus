# Spec: Popups de aclaración de conceptos (helper-text)

## Objetivo

En "Canvas que habla", cuando el estudiante hace una pregunta **simple** sobre un
término (ej. «¿qué es H2O?»), el tutor NO debe crear una tarjeta completa (un nodo
nuevo que satura el grafo). En su lugar debe **anclar una aclaración ligera** a un
widget que ya existe en el canvas:

- Un ícono **ⓘ** (la "i" en un círculo) aparece en la esquina del widget relacionado.
- Al hacer **hover** sobre la ⓘ aparece un popup tipo *helper text* con la definición
  breve (ej. «H2O es la fórmula del agua»). NO interrumpe el flujo como un modal.
- **La primera vez** (al crearse), el popup se muestra **automáticamente, sin hover**,
  durante ~5 s; luego se colapsa al ícono ⓘ y a partir de ahí solo reaparece con hover.

**Usuario:** estudiante en una sesión de voz con el tutor.
**Éxito:** el tutor puede aclarar términos sueltos sin ensuciar el mapa conceptual con
nodos nuevos; la aclaración es visible al instante y consultable después con hover.

## Tech Stack

Sin dependencias nuevas. Lo ya presente:
- Next.js (App Router) + React 18, TypeScript.
- Zustand (`lib/store.ts`) para el estado del canvas.
- `@openai/agents-realtime` + Zod para las herramientas del tutor (`lib/agent.ts`).
- ReactFlow (`@xyflow/react`) para el grafo (`components/Canvas.tsx`).
- Tailwind para estilos (transiciones CSS, sin librería de tooltip).

## Comandos

```
Dev:   npm run dev
Build: npm run build
Lint:  npm run lint
```
Verificación visual vía Claude Preview MCP (preview_start / preview_screenshot).

## Estructura del proyecto (archivos que toca esta feature)

```
lib/store.ts                         → + tipo Clarification, estado y acción addClarification
lib/agent.ts                         → + herramienta aclarar_concepto; ajuste de INSTRUCTIONS
components/Canvas.tsx                 → ResourceNode monta la capa de badges ⓘ
components/ClarificationBadge.tsx     → NUEVO: ícono ⓘ + popup helper-text (auto-open 5s, hover)
docs/spec-aclaraciones.md            → este documento
```

## Diseño técnico

### Modelo de datos (store)

Las aclaraciones se guardan **fuera** de la unión discriminada `CanvasElement`
(para no tocar todos los tipos ni los renderers existentes), en un mapa por id de
elemento destino:

```ts
export type Clarification = {
  id: string;          // único, p. ej. "clar-1"
  termino: string;     // "H2O"
  definicion: string;  // "H2O es la fórmula del agua"
};

// dentro de CanvasState:
clarifications: Record<string, Clarification[]>; // key = id del elemento destino

addClarification: (targetId: string, termino: string, definicion: string) => void;
```

`addClarification`:
1. Si `targetId` no existe en `elements`, no hace nada (la herramienta devolverá un
   mensaje de error para que el tutor escoja/cree un elemento válido).
2. Inserta la nueva `Clarification` en `clarifications[targetId]`.
3. Reusa el mecanismo existente de foco: setea `highlightedId = targetId` e
   incrementa `focusTick`, para que la cámara se centre en el widget y el popup
   auto-mostrado quede a la vista.
4. `clear()` también vacía `clarifications`.

> "Primera vez = auto-show" se resuelve en el **componente**: el badge se monta cuando
> se agrega la aclaración y auto-abre el popup 5 s en su `useEffect` de montaje. Como
> ReactFlow mantiene el nodo montado, cada badge auto-abre exactamente una vez. No se
> necesita un flag `autoShow` persistente en el store.

### Herramienta del tutor (`lib/agent.ts`)

```ts
const aclararConcepto = tool({
  name: "aclarar_concepto",
  description:
    "Aclara un concepto SIMPLE (la definición de un término en una frase) con un popup ligero anclado a un elemento que YA existe en el canvas, en vez de crear una tarjeta nueva. Úsalo para preguntas cortas tipo '¿qué es H2O?'.",
  parameters: z.object({
    id_elemento: z
      .string()
      .describe("id de un elemento YA existente en el canvas al que se anclará la aclaración."),
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
```
(`addClarification` devolverá `boolean` para alimentar este mensaje.)

**INSTRUCTIONS** del tutor: añadir una línea — para preguntas cortas «¿qué es X?»
usar `aclarar_concepto` sobre el elemento relacionado más cercano, reservando
`crear_tarjeta` para ideas que merecen su propio nodo en el mapa.

### UI (`ClarificationBadge.tsx` + `Canvas.tsx`)

- En `ResourceNode`, leer `useCanvasStore((s) => s.clarifications[id])` y, si hay,
  renderizar una capa **absoluta** en la esquina superior derecha del nodo con un
  `ClarificationBadge` por aclaración.
- `ClarificationBadge`:
  - Ícono ⓘ (botón redondo, `aria-label={termino}`).
  - Popup: tarjetita pequeña (`absolute`, `z-50`, fondo oscuro translúcido, borde
    suave) que muestra `definicion`. Aparece con `hover`/`focus`.
  - Auto-open: `useEffect` al montar → abre el popup, `setTimeout` 5000 ms → cierra.
    Un timer se limpia en el cleanup. Tras el cierre, el estado vuelve a depender
    solo del hover.
  - El popup **no** debe quedar recortado: el nodo no tiene `overflow-hidden`; el
    badge usa `z-50` para superponerse a nodos vecinos.

## Code Style

Seguir el estilo existente: campos en español, herramientas con `tool({...})` + Zod,
acciones del store con `set((state) => ...)`, Tailwind con la paleta `slate/indigo`.
Ejemplo de la acción del store:

```ts
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
      focusTick: state.focusTick + 1,
    };
  });
  return ok;
},
```
(Nota: `addClarification` devuelve `boolean`; el resto de acciones siguen sin retorno.)

## Testing Strategy

El proyecto no tiene suite de tests automatizados (es un hackathon). Verificación:
1. `npm run build` pasa sin errores de TypeScript (la unión discriminada y la firma
   con retorno son los puntos de riesgo).
2. Verificación visual con Claude Preview:
   - Cargar «Ver ejemplo» para tener nodos en el canvas.
   - Simular una aclaración (vía `useCanvasStore.getState().addClarification(...)`
     en `preview_eval`) y confirmar: aparece la ⓘ, el popup se auto-muestra ~5 s,
     se colapsa, y reaparece al hacer hover.
   - Screenshot como prueba.

## Boundaries

- **Always:** mantener campos en español; correr `npm run build` antes de cerrar;
  cambios quirúrgicos (no tocar renderers ni tipos no relacionados).
- **Ask first:** agregar dependencias; cambiar la firma de acciones existentes del
  store; tocar `useTutorSession`.
- **Never:** convertir el popup en un modal bloqueante; crear un nodo nuevo para una
  aclaración; borrar código existente no relacionado.

## Success Criteria

- [ ] Existe la herramienta `aclarar_concepto(id_elemento, termino, definicion)` y el
      tutor la usa para preguntas simples (instrucciones actualizadas).
- [ ] Al ejecutarla sobre un elemento existente, aparece una ⓘ anclada a ese widget.
- [ ] El popup se muestra **automáticamente, sin hover, la primera vez** (~5 s) y la
      cámara se centra en el widget.
- [ ] Tras los ~5 s el popup se colapsa y **reaparece con hover** sobre la ⓘ.
- [ ] El popup es helper-text (no bloquea, no es modal) y muestra la definición.
- [ ] Si el `id_elemento` no existe, la herramienta devuelve un mensaje claro y no
      rompe nada.
- [ ] `npm run build` pasa.

## Open Questions

- ¿Varias aclaraciones por widget? → El diseño soporta un array; se muestran varias ⓘ
  apiladas. Si prefieres máximo una por widget, se simplifica (reemplazar en vez de
  acumular). **Asunción actual: se acumulan.**
- ¿Qué pasa si el canvas está vacío cuando el alumno pregunta? → El tutor debería
  crear primero un elemento (tarjeta/diagrama) y luego aclarar, o simplemente
  responder en voz. **Asunción: la aclaración requiere un widget destino.**
