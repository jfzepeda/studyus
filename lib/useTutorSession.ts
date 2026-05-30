"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeItem, RealtimeSession } from "@openai/agents-realtime";
import { getOpenAIKey } from "./userKeys";

export type TutorStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking";

export type TranscriptLine = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

function extractText(item: RealtimeItem): string {
  if (item.type !== "message") return "";
  const parts = (item.content ?? []).map((c) => {
    if ("text" in c && typeof c.text === "string") return c.text;
    if ("transcript" in c && typeof c.transcript === "string") return c.transcript;
    return "";
  });
  return parts.join(" ").trim();
}

export function useTutorSession() {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<TutorStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const connect = useCallback(async () => {
    if (sessionRef.current || status === "connecting") return;
    setError(null);
    setStatus("connecting");

    const userKey = getOpenAIKey();
    if (!userKey) {
      setError("Ingresa tu API key de OpenAI para comenzar.");
      setStatus("idle");
      return;
    }

    try {
      const { RealtimeSession } = await import("@openai/agents-realtime");
      const { createTutorAgent } = await import("./agent");

      const res = await fetch("/api/realtime-token", {
        method: "POST",
        headers: { "x-openai-key": userKey },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "No se pudo obtener el token de sesión.");
      }
      const data = await res.json();
      const apiKey: string | undefined = data?.value;
      if (!apiKey) throw new Error("El token de sesión es inválido.");

      const session = new RealtimeSession(createTutorAgent(), {
        model: "gpt-realtime-2",
        config: {
          reasoning: { effort: "low" },
          audio: {
            input: {
              transcription: { model: "gpt-4o-mini-transcribe", language: "es" },
            },
          },
        },
      });

      session.on("agent_start", () => setStatus("thinking"));
      session.on("audio_start", () => setStatus("speaking"));
      session.on("audio_stopped", () => setStatus("listening"));
      session.on("audio_interrupted", () => setStatus("listening"));
      session.on("agent_end", () => setStatus("listening"));
      session.on("error", (e) => {
        // Errores transitorios del transporte: los mostramos sin tumbar la sesión.
        console.error("Realtime error:", e);
        setError("Hubo un problema con la conexión de voz.");
      });
      session.on("history_updated", (history: RealtimeItem[]) => {
        const lines: TranscriptLine[] = [];
        for (const item of history) {
          if (item.type !== "message") continue;
          if (item.role !== "user" && item.role !== "assistant") continue;
          const text = extractText(item);
          if (text) lines.push({ id: item.itemId, role: item.role, text });
        }
        setTranscript(lines.slice(-8));
      });

      await session.connect({ apiKey });
      session.mute(false);
      sessionRef.current = session;
      setMuted(false);
      setStatus("listening");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Necesito permiso para usar el micrófono. Habilítalo y vuelve a intentar."
          : err instanceof Error
            ? err.message
            : "No se pudo iniciar la sesión.";
      setError(message);
      setStatus("idle");
      sessionRef.current?.close();
      sessionRef.current = null;
    }
  }, [status]);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    setMuted(false);
    setStatus("idle");
  }, []);

  const toggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setMuted((prev) => {
      const next = !prev;
      session.mute(next);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, []);

  return { status, error, muted, transcript, connect, disconnect, toggleMute };
}
