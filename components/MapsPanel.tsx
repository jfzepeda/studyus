"use client";

// Modal "Mis mapas": guarda el mapa actual y lista/abre/borra los guardados.
import { useEffect, useState } from "react";

import { deleteMap, listMaps, saveMap, type MapRow } from "@/lib/maps";
import { useCanvasStore } from "@/lib/store";

export function MapsPanel({ onClose }: { onClose: () => void }) {
  const elements = useCanvasStore((s) => s.elements);
  const edges = useCanvasStore((s) => s.edges);
  const clarifications = useCanvasStore((s) => s.clarifications);
  const savedMapId = useCanvasStore((s) => s.savedMapId);
  const savedTitle = useCanvasStore((s) => s.savedTitle);
  const load = useCanvasStore((s) => s.load);
  const setSavedMap = useCanvasStore((s) => s.setSavedMap);

  const [title, setTitle] = useState(savedTitle ?? "");
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setMaps(await listMaps());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar tus mapas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async () => {
    const t = title.trim();
    if (!t) {
      setError("Ponle un título a tu mapa.");
      return;
    }
    if (elements.length === 0) {
      setError("El mapa está vacío, no hay nada que guardar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const row = await saveMap(t, { elements, edges, clarifications }, savedMapId);
      setSavedMap(row.id, row.title);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el mapa.");
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = (m: MapRow) => {
    load(m.data.elements, m.data.edges, m.data.clarifications ?? {});
    setSavedMap(m.id, m.title);
    onClose();
  };

  const handleDelete = async (m: MapRow) => {
    setBusy(true);
    try {
      await deleteMap(m.id);
      if (savedMapId === m.id) setSavedMap(null, null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar el mapa.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Mis mapas</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título del mapa actual"
            className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {savedMapId ? "Actualizar" : "Guardar"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-slate-400">Cargando…</p>
          ) : maps.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no tienes mapas guardados.</p>
          ) : (
            <ul className="space-y-2">
              {maps.map((m) => (
                <li
                  key={m.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    m.id === savedMapId
                      ? "border-indigo-400/40 bg-indigo-500/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{m.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(m.updated_at).toLocaleString("es")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(m)}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(m)}
                      disabled={busy}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400 hover:text-rose-300 disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
