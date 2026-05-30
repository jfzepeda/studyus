# Diseño: "Profundizar = el árbol crece" (grafo plano)

Fecha: 2026-05-29
Estado: aprobado

## Problema

El layout de "Canvas que habla" sufre encimado y desaparición de nodos, y el
deep-dive (contenedor a la derecha) se ve mal. Diagnóstico por trazado estático
del pipeline `store → React Flow → medir DOM → layoutWorld → escribir posición`:

- **RC-A** — El LOD por zoom cambia la altura medida de un hijo (placeholder 64px
  vs cuerpo completo ~300px), y esa medida alimenta el layout. Si el layout corre
  con el nodo en placeholder, al acercar el cuerpo real se encima.
- **RC-B** — El contenido async (Mermaid, Recharts, KaTeX, imágenes) mide su
  tamaño al montarse, después del layout. El efecto de layout depende de
  `[version, nodesInitialized]`, así que ese crecimiento no re-acomoda nada.
- **RC-C** — `extent:"parent"` recorta los hijos al rectángulo del contenedor; si
  el contenedor quedó mal medido (RC-A/RC-B), los hijos se apilan/ocultan.
- **RC-D** — Los nodos nuevos nacen en (0,0) y se apilan ahí hasta que el debounce
  resuelve.
- **RC-E** — La banda de título del contenedor (`COVER_H=360`) lo domina; el
  `fitView` a los hijos baja el zoom por debajo del umbral LOD → placeholders
  vacíos justo al entrar a leer.

Raíz común: el layout es un cálculo único basado en medidas del DOM, pero sus
entradas (LOD por zoom, crecimiento async) mutan después sin reconciliación, y
`extent:parent` convierte cualquier error de tamaño en encimado.

## Decisión de modelo

Eliminar el nivel de contenedor. Todo es un **único grafo `dagre` (TB)** de nodos
`resource`. Profundizar en un tema = marcarlo `activeParentId`; los recursos que
cree el tutor se cuelgan de él (`parentId` + arista `padre→hijo` visible y sutil)
y la cámara vuela a esa rama. Todo lo demás permanece (LOD para lo lejano).
Profundidad ilimitada. (Elegido por el usuario sobre vista-de-detalle / panel.)

## Cambios por archivo

### lib/layout.ts (reescritura)
- `layoutTree(elements, edges, measuredById) → Map<id,{position}>`: un solo dagre.
- Ancho por kind (`widthForKind`: 340, tabla 560) determinista; alto = medida o
  `FALLBACK_H`.
- Fuera: `COVER_H`, `PAD`, `EMPTY_W/H`, `layoutContainer`, `layoutWorld`.
- Exporta `widthForKind`, `TABLE_NODE_W` (los usa Canvas).

### lib/store.ts
- `upsertElement`: al colgar un detalle de un tema activo, además de heredar
  `parentId`, crear arista `padre→hijo` (dedup) para que el árbol crezca y dagre
  lo rankee debajo. (`isContainer` se conserva exportado, sin uso de contenedor.)

### components/Canvas.tsx
- `nodeTypes = { resource }`; borrar `ContainerNode`, `orderParentsFirst`,
  `extent:"parent"`, `parentId` en el nodo RF.
- **RC-A** — caché monótona de altura completa por nodo (`fullHeightRef`,
  `max(measured, prev)`); el layout usa esa altura, nunca la del placeholder.
- **RC-B** — re-layout cuando cambia la firma de medidas
  (`nodes.map(n => n.measured?.height)`), debounced, además de `version`.
- **RC-D** — nodo nuevo se siembra cerca del padre (no en (0,0)) y arranca
  `opacity:0` → `1` tras el primer layout.
- Cámara: target `into` reinterpretado como "encuadra tema + hijos" (vuela a la
  rama); overview/alejar = `fitView` a todo.
- Acento de tema: eyebrow "TEMA" cuando el nodo tiene hijos (sin banda gigante).

### lib/agent.ts
- `profundizar`: quitar el tope de 2 niveles (ya no se hace `exitDepth` al entrar
  a otro tema). El nodo nuevo se crea bajo el tema activo y luego se entra a él.

## Fuera de alcance
Renderers individuales, animaciones de tabla, `useTutorSession`/voz, APIs
`/api/draw` y `/api/image`, `DepthBreadcrumb`.

## Verificación
Preview: cargar ejemplo → simular profundizar en varios niveles → 0 encimados,
detalle legible, cámara vuela a la rama. `tsc` + `build` limpios.
