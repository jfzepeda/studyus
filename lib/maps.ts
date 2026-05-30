// CRUD de los mapas guardados por el usuario en Supabase.
// La seguridad la garantiza Row Level Security (cada quien ve solo sus filas);
// `user_id` lo rellena Postgres con `default auth.uid()`.
import type { CanvasEdge, CanvasElement, Clarification } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";

/** Lo único persistible de un mapa; el resto del store es estado efímero de UI. */
export type MapData = {
  elements: CanvasElement[];
  edges: CanvasEdge[];
  clarifications: Record<string, Clarification[]>;
};

export type MapRow = {
  id: string;
  title: string;
  data: MapData;
  updated_at: string;
};

/** Lista los mapas del usuario, del más reciente al más antiguo. */
export async function listMaps(): Promise<MapRow[]> {
  const { data, error } = await getSupabase()
    .from("maps")
    .select("id, title, data, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MapRow[];
}

/** Inserta un mapa nuevo (o actualiza el existente si se pasa `id`). */
export async function saveMap(
  title: string,
  data: MapData,
  id?: string | null,
): Promise<MapRow> {
  const supabase = getSupabase();
  const payload = id
    ? { id, title, data, updated_at: new Date().toISOString() }
    : { title, data };

  const { data: row, error } = await supabase
    .from("maps")
    .upsert(payload)
    .select("id, title, data, updated_at")
    .single();
  if (error) throw error;
  return row as MapRow;
}

export async function deleteMap(id: string): Promise<void> {
  const { error } = await getSupabase().from("maps").delete().eq("id", id);
  if (error) throw error;
}
