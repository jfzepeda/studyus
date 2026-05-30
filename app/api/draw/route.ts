import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Extrae el texto de una respuesta de la Responses API (tolerante a ambas formas).
function extractText(data: unknown): string {
  const d = data as { output_text?: unknown; output?: unknown };
  if (typeof d.output_text === "string" && d.output_text.trim()) {
    return d.output_text;
  }
  const out = Array.isArray(d.output) ? d.output : [];
  let text = "";
  for (const item of out) {
    const content = (item as { content?: unknown }).content;
    if (Array.isArray(content)) {
      for (const c of content) {
        const t = (c as { text?: unknown }).text;
        if (typeof t === "string") text += t;
      }
    }
  }
  return text;
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta OPENAI_API_KEY." }, { status: 500 });
  }

  let descripcion = "";
  try {
    ({ descripcion } = await req.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (!descripcion) {
    return NextResponse.json({ error: "Falta 'descripcion'." }, { status: 400 });
  }

  const prompt = `Genera un SVG educativo, detallado y atractivo que ilustre: "${descripcion}".

Requisitos estrictos:
- Devuelve SOLO el código SVG: empieza con <svg ...> y termina con </svg>. Sin markdown, sin explicaciones, sin comillas alrededor.
- Incluye un viewBox (por ejemplo viewBox="0 0 480 360").
- Usa <defs> con gradientes lineales/radiales, sombras suaves y una paleta de colores vivos y armónicos.
- Dibuja formas reconocibles (no monigotes): prefiere formas básicas (<rect>, <circle>, <ellipse>, <line>, <polygon>) y usa <path> solo cuando haga falta; agrupa con <g>.
- Rotula las partes importantes con <text> legible (font-family sans-serif, ~14px).
- Estilo: infografía moderna y limpia, fondo claro o transparente.
- EFICIENCIA: sé detallado pero conciso, objetivo por debajo de ~3500 caracteres. Evita <path> con cientos de puntos.
- Prohibido: <script>, <foreignObject>, manejadores on*.`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt,
        reasoning: { effort: "minimal" },
        max_output_tokens: 12000,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json(
        { error: "El modelo rechazó la generación del SVG.", detail },
        { status: 502 },
      );
    }

    const data = await r.json();
    const text = extractText(data);
    const match = text.match(/<svg[\s\S]*<\/svg>/i);
    return NextResponse.json({ svg: match ? match[0] : "" });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo contactar al modelo.", detail: String(err) },
      { status: 502 },
    );
  }
}
