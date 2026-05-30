// Cliente de Supabase para el navegador (singleton).
// Si faltan las variables de entorno, `isSupabaseConfigured` es false y la app
// sigue funcionando con BYOK pero sin login ni guardado de mapas.
import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anon);

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado (faltan NEXT_PUBLIC_SUPABASE_*).");
  }
  if (!client) client = createBrowserClient(url!, anon!);
  return client;
}
