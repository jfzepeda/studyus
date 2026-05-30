"use client";

import { Canvas } from "@/components/Canvas";
import { MicOrb } from "@/components/MicOrb";
import { MuteButton } from "@/components/MuteButton";
import { Transcript } from "@/components/Transcript";
import { useCanvasStore } from "@/lib/store";
import { sampleLesson } from "@/lib/sampleLesson";
import { useTutorSession } from "@/lib/useTutorSession";

export default function Home() {
  const { status, error, muted, transcript, connect, disconnect, toggleMute } =
    useTutorSession();
  const clear = useCanvasStore((s) => s.clear);
  const load = useCanvasStore((s) => s.load);
  const hasElements = useCanvasStore((s) => s.elements.length > 0);
  const sessionActive = status !== "idle" && status !== "connecting";

  return (
    <main className="mx-auto flex h-screen max-w-7xl flex-col overflow-hidden px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Canvas que habla
          </h1>
          <p className="text-sm text-slate-400">
            Háblale y aprende cualquier tema con recursos visuales en vivo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MicOrb status={status} onConnect={connect} onDisconnect={disconnect} />
          {sessionActive && <MuteButton muted={muted} onToggle={toggleMute} />}
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

      <section className="min-h-0 flex-1">
        <Canvas />
      </section>
    </main>
  );
}
