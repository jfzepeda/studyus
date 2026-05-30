import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-realtime-2";

export async function POST(req: Request) {
  // La key del usuario (BYOK) llega por header; si no, caemos al env del servidor.
  // No la logueamos ni la guardamos: solo se usa para acuñar el token efímero.
  const apiKey = req.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta tu OpenAI API key." },
      { status: 401 },
    );
  }

  try {
    const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: MODEL,
        },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "OpenAI rechazó la creación del token.", detail },
        { status: 502 },
      );
    }

    const data = await res.json();
    // `data.value` es el token efímero (ek_...) que usa el navegador.
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo contactar a OpenAI.", detail: String(err) },
      { status: 502 },
    );
  }
}
