-- Esquema de "Study.us" para Supabase.
-- Córrelo en el SQL Editor del dashboard de Supabase.

create table if not exists public.maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Mapa sin título',
  data jsonb not null, -- { elements, edges, clarifications }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: cada usuario solo ve y edita sus propios mapas.
alter table public.maps enable row level security;

create policy "los usuarios solo ven y editan sus mapas"
  on public.maps for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists maps_user_id_updated_at_idx
  on public.maps (user_id, updated_at desc);
