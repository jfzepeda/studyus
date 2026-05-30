import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-realtime-2";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta OPENAI_API_KEY en el servidor." },
      { status: 500 },
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
