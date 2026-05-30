import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  // BYOK: key del usuario por header, con fallback al env del servidor.
  const apiKey = req.headers.get("x-openai-key")?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta tu OpenAI API key." }, { status: 401 });
  }

  let prompt = "";
  try {
    ({ prompt } = await req.json());
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "Falta 'prompt'." }, { status: 400 });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: `Ilustración educativa, clara y atractiva. ${prompt}`,
        size: "1024x1024",
        quality: "low",
        output_format: "jpeg",
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return NextResponse.json(
        { error: "El modelo rechazó la generación de la imagen.", detail },
        { status: 502 },
      );
    }

    const data = await r.json();
    const b64 = data?.data?.[0]?.b64_json;
    return NextResponse.json({
      src: b64 ? `data:image/jpeg;base64,${b64}` : "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo contactar al modelo.", detail: String(err) },
      { status: 502 },
    );
  }
}
