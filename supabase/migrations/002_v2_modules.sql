-- ═══════════════════════════════════════════════════════════════════════
--  MY ATLAS v2 — novos módulos
--  Ciclo menstrual · Relações · Agenda · Tarefas · Notas (Notion) ·
--  Compras · Datas especiais · Metas · Pedidos de oração
-- ═══════════════════════════════════════════════════════════════════════

alter table public.couples add column if not exists started_at date;

-- ───────── CICLO: configurações (1 linha por pessoa que acompanha) ─────────
-- id = profile id. share_with_partner = ela decide se o parceiro vê o ciclo.
create table if not exists public.cycle_settings (
  id                  uuid primary key references public.profiles (id) on delete cascade,
  couple_id           uuid not null references public.couples (id) on delete cascade,
  tracking            boolean not null default true,
  share_with_partner  boolean not null default true,
  cycle_length        int not null default 28 check (cycle_length between 18 and 60),
  period_length       int not null default 5 check (period_length between 1 and 15),
  updated_at          timestamptz not null default now()
);

-- ───────── CICLO: registro diário ─────────
create table if not exists public.cycle_days (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  day              date not null,
  flow             text not null default 'none' check (flow in ('none','spotting','light','medium','heavy')),
  symptoms         text[] not null default '{}',
  moods            text[] not null default '{}',
  discharge        text,
  temperature      numeric(4,2),
  ovulation_test   text check (ovulation_test in ('positive','negative')),
  pregnancy_test   text check (pregnancy_test in ('positive','negative')),
  notes            text,
  updated_at       timestamptz not null default now(),
  unique (profile_id, day)
);
create index if not exists cycle_days_profile_day_idx on public.cycle_days (profile_id, day desc);

-- ───────── RELAÇÕES (visível para os dois) ─────────
create table if not exists public.intimacy_logs (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  happened_at  timestamptz not null default now(),
  protection   text not null default 'none',
  notes        text,
  created_at   timestamptz not null default now()
);

-- ───────── AGENDA ─────────
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  owner       uuid references public.profiles (id) on delete set null, -- null = do casal
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  all_day     boolean not null default false,
  location    text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists events_couple_start_idx on public.events (couple_id, starts_at);

-- ───────── TAREFAS ─────────
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  assignee    uuid references public.profiles (id) on delete set null, -- null = nós dois
  title       text not null,
  notes       text,
  due_date    date,
  priority    int not null default 0 check (priority between 0 and 2),
  done        boolean not null default false,
  done_at     timestamptz,
  done_by     uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ───────── NOTAS (estilo Notion: páginas com blocos) ─────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  parent_id   uuid references public.notes (id) on delete cascade,
  title       text not null default '',
  icon        text,
  blocks      jsonb not null default '[]'::jsonb,
  is_private  boolean not null default false,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ───────── LISTA DE COMPRAS ─────────
create table if not exists public.shopping_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  qty         text,
  category    text not null default 'Mercado',
  checked     boolean not null default false,
  checked_by  uuid references public.profiles (id) on delete set null,
  checked_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- ───────── DATAS ESPECIAIS ─────────
create table if not exists public.special_dates (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  date        date not null,
  kind        text not null default 'outro',
  recurring   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ───────── METAS DO CASAL ─────────
create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  emoji       text,
  target      numeric(12,2) not null default 0,
  current     numeric(12,2) not null default 0,
  unit        text not null default 'R$',
  due_date    date,
  created_at  timestamptz not null default now()
);

-- ───────── PEDIDOS DE ORAÇÃO ─────────
create table if not exists public.prayers (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  title        text not null,
  details      text,
  answered     boolean not null default false,
  answered_at  timestamptz,
  answer_note  text,
  created_at   timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════════════════════════════
alter table public.cycle_settings enable row level security;
alter table public.cycle_days     enable row level security;
alter table public.intimacy_logs  enable row level security;
alter table public.events         enable row level security;
alter table public.tasks          enable row level security;
alter table public.notes          enable row level security;
alter table public.shopping_items enable row level security;
alter table public.special_dates  enable row level security;
alter table public.goals          enable row level security;
alter table public.prayers        enable row level security;

-- Base: tudo dentro do próprio casal
do $$
declare t text;
begin
  foreach t in array array['intimacy_logs','events','tasks','notes','shopping_items','special_dates','goals','prayers'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())',
      t, t
    );
    execute format('drop policy if exists %I_own_insert on public.%I', t, t);
    execute format(
      'create policy %I_own_insert on public.%I as restrictive for insert with check (created_by = auth.uid())',
      t, t
    );
  end loop;
end $$;

-- Notas privadas: só quem criou enxerga/edita
drop policy if exists notes_private_guard on public.notes;
create policy notes_private_guard on public.notes as restrictive for all
  using (not is_private or created_by = auth.uid())
  with check (not is_private or created_by = auth.uid());

-- Ciclo: config. O casal lê; só a dona escreve.
drop policy if exists cycle_settings_select on public.cycle_settings;
create policy cycle_settings_select on public.cycle_settings for select using (couple_id = public.my_couple_id());
drop policy if exists cycle_settings_write on public.cycle_settings;
create policy cycle_settings_write on public.cycle_settings for all
  using (id = auth.uid()) with check (id = auth.uid() and couple_id = public.my_couple_id());

-- Ciclo: dias. A dona vê e edita tudo; o parceiro só lê se ela compartilhar.
create or replace function public.cycle_shared(p_owner uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select share_with_partner from public.cycle_settings where id = p_owner), false)
$$;
revoke execute on function public.cycle_shared(uuid) from public, anon;
grant execute on function public.cycle_shared(uuid) to authenticated;

drop policy if exists cycle_days_select on public.cycle_days;
create policy cycle_days_select on public.cycle_days for select
  using (profile_id = auth.uid() or (couple_id = public.my_couple_id() and public.cycle_shared(profile_id)));
drop policy if exists cycle_days_write on public.cycle_days;
create policy cycle_days_write on public.cycle_days for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and couple_id = public.my_couple_id());

-- ═══════════════════════════════════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['cycle_settings','cycle_days','intimacy_logs','events','tasks','notes','shopping_items','special_dates','goals','prayers'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
