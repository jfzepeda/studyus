"use client";

import type { TutorStatus } from "@/lib/useTutorSession";

const LABEL: Record<TutorStatus, string> = {
  idle: "Conectar micrófono",
  connecting: "Conectando…",
  listening: "Escuchando…",
  thinking: "Pensando…",
  speaking: "Hablando…",
};

const ORB_COLOR: Record<TutorStatus, string> = {
  idle: "bg-slate-600",
  connecting: "bg-amber-500",
  listening: "bg-emerald-500",
  thinking: "bg-indigo-500",
  speaking: "bg-fuchsia-500",
};

export function MicOrb({
  status,
  onConnect,
  onDisconnect,
}: {
  status: TutorStatus;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connected = status !== "idle";
  const active = status === "listening" || status === "thinking" || status === "speaking";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={connected ? onDisconnect : onConnect}
        disabled={status === "connecting"}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full transition disabled:opacity-60"
        aria-label={connected ? "Desconectar" : "Conectar micrófono"}
      >
        {active && (
          <span
            className={`absolute inset-0 rounded-full ${ORB_COLOR[status]} animate-pulse-ring`}
          />
        )}
        <span
          className={`relative flex h-14 w-14 items-center justify-center rounded-full ${ORB_COLOR[status]} shadow-lg transition`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {connected ? (
              <rect x="6" y="6" width="12" height="12" rx="2" fill="white" stroke="white" />
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
              </>
            )}
          </svg>
        </span>
      </button>
      <span className="text-sm text-slate-300">{LABEL[status]}</span>
    </div>
  );
}
