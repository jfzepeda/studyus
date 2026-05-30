"use client";

import { useEffect, useState } from "react";

import { AccountBar } from "@/components/AccountBar";
import { ApiKeyGate } from "@/components/ApiKeyGate";
import { Canvas } from "@/components/Canvas";
import { DepthBreadcrumb } from "@/components/DepthBreadcrumb";
import { MicOrb } from "@/components/MicOrb";
import { MuteButton } from "@/components/MuteButton";
import { Transcript } from "@/components/Transcript";
import { useCanvasStore } from "@/lib/store";
import { sampleLesson } from "@/lib/sampleLesson";
import { hasOpenAIKey } from "@/lib/userKeys";
import { useTutorSession } from "@/lib/useTutorSession";

export default function Home() {
  const { status, error, muted, transcript, connect, disconnect, toggleMute } =
    useTutorSession();
  const clear = useCanvasStore((s) => s.clear);
  const load = useCanvasStore((s) => s.load);
  const hasElements = useCanvasStore((s) => s.elements.length > 0);
  const sessionActive = status !== "idle" && status !== "connecting";

  // Abrimos el gate al montar si el usuario aún no ingresó su key (solo cliente).
  const [keyGateOpen, setKeyGateOpen] = useState(false);
  useEffect(() => {
    if (!hasOpenAIKey()) setKeyGateOpen(true);
  }, []);

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col overflow-hidden px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Study.us
          </h1>
          <p className="text-sm text-slate-400">
            Aprende sobre cualquier tema charlando con nuestro canvas
            interactivo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MicOrb
            status={status}
            onConnect={connect}
            onDisconnect={disconnect}
          />
          {sessionActive && <MuteButton muted={muted} onToggle={toggleMute} />}
          <button
            type="button"
            onClick={() => setKeyGateOpen(true)}
            title="API key"
            aria-label="API key"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7.5" cy="15.5" r="4.5" />
              <path d="m10.7 12.3 8.3-8.3" />
              <path d="m18 5 2 2" />
              <path d="m15 8 2 2" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => load(sampleLesson.elements, sampleLesson.edges)}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            Ver ejemplo
          </button>
          {hasElements && (
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Limpiar
            </button>
          )}
          <AccountBar />
        </div>
      </header>

      <div className="mb-4 flex min-h-[20px] items-center gap-3">
        <Transcript lines={transcript} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="relative min-h-0 flex-1">
        <DepthBreadcrumb />
        <Canvas />
      </section>

      {keyGateOpen && <ApiKeyGate onClose={() => setKeyGateOpen(false)} />}
    </main>
  );
}
