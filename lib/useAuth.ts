"use client";

// Sesión del usuario sin login explícito: si no hay sesión, creamos una sesión
// ANÓNIMA de Supabase. El token vive en el navegador (cookie que el middleware
// refresca), así que al recargar se recuerda al mismo usuario y sus mapas.
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabase();
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      let current = data.user;
      // Sin sesión previa en este navegador: crea una anónima y recuérdala.
      if (!current) {
        const { data: anon } = await supabase.auth.signInAnonymously();
        current = anon.user ?? null;
      }
      if (active) {
        setUser(current);
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => setUser(session?.user ?? null),
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, configured: isSupabaseConfigured };
}
