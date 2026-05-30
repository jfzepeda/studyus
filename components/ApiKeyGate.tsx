"use client";

import { useState } from "react";
import {
  getAnthropicKey,
  getOpenAIKey,
  clearKeys,
  isLikelyOpenAIKey,
  setKeys,
} from "@/lib/userKeys";

export function ApiKeyGate({ onClose }: { onClose: () => void }) {
  const [openai, setOpenai] = useState(() => getOpenAIKey() ?? "");
  const [anthropic, setAnthropic] = useState(() => getAnthropicKey() ?? "");
  const [showAdvanced, setShowAdvanced] = useState(() => !!getAnthropicKey());
  const [touched, setTouched] = useState(false);

  const valid = isLikelyOpenAIKey(openai);

  const save = () => {
    setTouched(true);
    if (!valid) return;
    setKeys({ openai, anthropic });
    onClose();
  };

  const forget = () => {
    clearKeys();
    setOpenai("");
    setAnthropic("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white">Tu API key de OpenAI</h2>
        <p className="mt-1 text-sm text-slate-400">
          Esta app corre con <span className="text-slate-200">tu</span> cuenta de
          OpenAI. Pega tu key para empezar.
        </p>

        <label className="mt-4 block text-xs font-medium text-slate-300">
          OpenAI API key
        </label>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={openai}
          onChange={(e) => setOpenai(e.target.value)}
          placeholder="sk-..."
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
        />
        {touched && !valid && (
          <p className="mt-1 text-xs text-rose-300">
            Esa key no tiene el formato esperado (debe empezar con{" "}
            <code>sk-</code>).
          </p>
        )}

        {showAdvanced ? (
          <>
            <label className="mt-4 block text-xs font-medium text-slate-300">
              Anthropic API key{" "}
              <span className="text-slate-500">(opcional — para dibujos SVG)</span>
            </label>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={anthropic}
              onChange={(e) => setAnthropic(e.target.value)}
              placeholder="sk-ant-..."
              className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-400/60"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="mt-3 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Avanzado: agregar key de Anthropic (dibujos)
          </button>
        )}

        <p className="mt-4 rounded-lg border border-white/5 bg-white/5 p-3 text-xs leading-relaxed text-slate-400">
          Tu key se guarda <span className="text-slate-200">solo en este
          navegador</span> y se envía directo a OpenAI para iniciar tu sesión de
          voz. No la almacenamos en ningún servidor.{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
          >
            ¿Dónde consigo una?
          </a>
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={forget}
            className="text-xs text-slate-400 transition hover:text-rose-300"
          >
            Olvidar mi key
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:bg-indigo-500/30"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
