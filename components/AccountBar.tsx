"use client";

// Botón "Mis mapas" en el header. La sesión es anónima y automática (ver useAuth),
// así que no hay botón de login. Si Supabase no está configurado, no renderiza nada.
import { useState } from "react";

import { MapsPanel } from "@/components/MapsPanel";
import { useAuth } from "@/lib/useAuth";

export function AccountBar() {
  const { user, configured } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  if (!configured || !user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/25"
      >
        Mis mapas
      </button>
      {panelOpen && <MapsPanel onClose={() => setPanelOpen(false)} />}
    </>
  );
}
