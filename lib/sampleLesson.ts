import type { CanvasElement, CanvasEdge } from "./store";

// SVG de un cloroplasto rotulado (elemento "drawing").
const CLOROPLASTO_SVG = `<svg viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif">
  <defs>
    <radialGradient id="clp" cx="45%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#bbf7d0"/>
      <stop offset="100%" stop-color="#86efac"/>
    </radialGradient>
  </defs>
  <ellipse cx="170" cy="118" rx="140" ry="84" fill="url(#clp)" stroke="#16a34a" stroke-width="3"/>
  <g fill="#15803d">
    <rect x="92" y="92" width="46" height="11" rx="5"/>
    <rect x="92" y="107" width="46" height="11" rx="5"/>
    <rect x="92" y="122" width="46" height="11" rx="5"/>
  </g>
  <g fill="#166534">
    <rect x="160" y="78" width="46" height="11" rx="5"/>
    <rect x="160" y="93" width="46" height="11" rx="5"/>
    <rect x="160" y="108" width="46" height="11" rx="5"/>
    <rect x="160" y="123" width="46" height="11" rx="5"/>
  </g>
  <g fill="#15803d">
    <rect x="226" y="98" width="42" height="11" rx="5"/>
    <rect x="226" y="113" width="42" height="11" rx="5"/>
    <rect x="226" y="128" width="42" height="11" rx="5"/>
  </g>
  <path d="M138 128 L160 99" stroke="#22c55e" stroke-width="3" fill="none"/>
  <path d="M206 129 L226 118" stroke="#22c55e" stroke-width="3" fill="none"/>
  <text x="170" y="226" text-anchor="middle" font-size="13" fill="#166534" font-weight="bold">Cloroplasto</text>
  <text x="286" y="54" font-size="11" fill="#334155">Membrana</text>
  <line x1="284" y1="58" x2="262" y2="80" stroke="#94a3b8" stroke-width="1"/>
  <text x="20" y="54" font-size="11" fill="#334155">Tilacoides</text>
  <line x1="58" y1="58" x2="112" y2="98" stroke="#94a3b8" stroke-width="1"/>
  <text x="288" y="188" font-size="11" fill="#334155">Estroma</text>
  <line x1="290" y1="184" x2="250" y2="158" stroke="#94a3b8" stroke-width="1"/>
</svg>`;

// Ilustración estilizada de una planta (elemento "image", como data URL).
const PLANTA_SVG = `<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="220" fill="#eff6ff"/>
  <circle cx="266" cy="48" r="26" fill="#fcd34d"/>
  <g stroke="#fcd34d" stroke-width="4" stroke-linecap="round">
    <line x1="266" y1="8" x2="266" y2="18"/>
    <line x1="304" y1="48" x2="314" y2="48"/>
    <line x1="294" y1="20" x2="301" y2="13"/>
    <line x1="294" y1="76" x2="301" y2="83"/>
  </g>
  <path d="M118 176 h84 l-13 36 h-58 z" fill="#d97706"/>
  <rect x="114" y="166" width="92" height="14" rx="3" fill="#b45309"/>
  <path d="M160 166 C158 132 160 112 160 96" stroke="#16a34a" stroke-width="5" fill="none"/>
  <path d="M160 132 C128 122 118 100 150 106 C161 111 160 122 160 132 Z" fill="#22c55e"/>
  <path d="M160 122 C192 110 202 88 170 96 C159 101 160 112 160 122 Z" fill="#16a34a"/>
  <path d="M160 100 C140 92 135 74 158 82 C161 87 160 92 160 100 Z" fill="#4ade80"/>
</svg>`;

const PLANTA_DATA_URL = `data:image/svg+xml,${encodeURIComponent(PLANTA_SVG)}`;

const elements: CanvasElement[] = [
  {
    id: "definicion",
    kind: "card",
    titulo: "¿Qué es la fotosíntesis?",
    markdown:
      "La **fotosíntesis** es el proceso por el que las plantas transforman **luz solar**, **agua** y **CO₂** en **glucosa** y **oxígeno**.\n\nOcurre en los **cloroplastos**, gracias al pigmento **clorofila**.",
  },
  {
    id: "ecuacion",
    kind: "formula",
    titulo: "Ecuación global",
    latex: "6\\,CO_2 + 6\\,H_2O \\;\\xrightarrow{\\text{luz}}\\; C_6H_{12}O_6 + 6\\,O_2",
  },
  {
    id: "proceso",
    kind: "diagram",
    titulo: "Cómo ocurre",
    mermaid:
      "flowchart TD\n  A[Luz solar] --> B[Clorofila capta energia]\n  B --> C[Fase luminosa]\n  C --> D[Ciclo de Calvin]\n  D --> E[Glucosa + O2]",
  },
  {
    id: "factores",
    kind: "chart",
    titulo: "Luz vs tasa de fotosíntesis",
    tipo: "line",
    data: [
      { label: "0", value: 0 },
      { label: "20", value: 35 },
      { label: "40", value: 62 },
      { label: "60", value: 80 },
      { label: "80", value: 88 },
      { label: "100", value: 90 },
    ],
  },
  {
    id: "cloroplasto",
    kind: "drawing",
    titulo: "El cloroplasto",
    svg: CLOROPLASTO_SVG,
    loading: false,
  },
  {
    id: "planta_real",
    kind: "image",
    titulo: "En la naturaleza",
    src: PLANTA_DATA_URL,
    loading: false,
  },
  {
    id: "quiz1",
    kind: "quiz",
    titulo: "Comprueba lo que sabes",
    pregunta: "¿Qué gas liberan las plantas durante la fotosíntesis?",
    opciones: ["Oxígeno (O₂)", "Dióxido de carbono (CO₂)", "Nitrógeno (N₂)"],
    correcta: 0,
    explicacion:
      "Las plantas liberan O₂ en la fase luminosa, al romper moléculas de agua para obtener electrones.",
    revelada: false,
    elegida: null,
  },
];

const edges: CanvasEdge[] = [
  { id: "se1", source: "definicion", target: "ecuacion", label: "se resume en" },
  { id: "se2", source: "definicion", target: "proceso", label: "paso a paso" },
  { id: "se3", source: "proceso", target: "cloroplasto", label: "ocurre en" },
  { id: "se4", source: "proceso", target: "factores", label: "depende de la luz" },
  { id: "se5", source: "definicion", target: "planta_real", label: "ejemplo real" },
  { id: "se6", source: "definicion", target: "quiz1", label: "evalúa" },
];

export const sampleLesson = { elements, edges };
