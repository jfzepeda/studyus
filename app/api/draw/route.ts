import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Extrae el texto de una respuesta de la Messages API de Anthropic.
function extractText(data: unknown): string {
  const content = (data as { content?: unknown }).content;
  if (!Array.isArray(content)) return "";
  let text = "";
  for (const c of content) {
    const block = c as { type?: unknown; text?: unknown };
    if (block.type === "text" && typeof block.text === "string") text += block.text;
  }
  return text;
}

export async function POST(req: Request) {
  // BYOK opcional: key de Anthropic del usuario por header, con fallback al env.
  const apiKey = req.headers.get("x-anthropic-key")?.trim() || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta tu Anthropic API key." }, { status: 401 });
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

  const system = `Eres un especialista que dibuja SVG educativos, detallados y atractivos a partir de una descripción.

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
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: [
          { type: "text", text: system, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          { role: "user", content: `Genera el SVG que ilustre: "${descripcion}".` },
        ],
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
