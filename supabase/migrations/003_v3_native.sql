-- ═══════════════════════════════════════════════════════════════════════
--  MY ATLAS v3 — status de contexto, "Preciso de…", acordos da casa,
--  Pitbull virtual, sono, cafeína, cofre, localização e push
-- ═══════════════════════════════════════════════════════════════════════

-- Status de contexto (1 toque) direto no perfil → realtime para o parceiro
alter table public.profiles add column if not exists context_status text;
alter table public.profiles add column if not exists context_updated_at timestamptz;

-- "Preciso de…" e interações com o Atlas virtual usam nudges.kind = 'cutucao'
-- com o tipo estendido em nudges.message (silencio, colo, desabafar, comer, pet_*).

-- Acordos & termostato doméstico (cada linha = "eu fiz hoje")
create table if not exists public.household_tasks (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  task        text not null,
  done_at     timestamptz not null default now()
);
create index if not exists household_tasks_couple_idx on public.household_tasks (couple_id, done_at desc);

-- Pitbull virtual (1 por casal)
create table if not exists public.pet_virtual_state (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null unique references public.couples (id) on delete cascade,
  happiness       int not null default 80 check (happiness between 0 and 100),
  energy          int not null default 80 check (energy between 0 and 100),
  bonus_xp        int not null default 0,
  last_action     text,
  last_action_by  uuid references public.profiles (id) on delete set null,
  last_action_at  timestamptz,
  updated_at      timestamptz not null default now()
);

-- Sono
create table if not exists public.sleep_logs (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  slept_at      timestamptz not null,
  woke_at       timestamptz,
  duration_min  int,
  confirmed     boolean not null default false
);
create index if not exists sleep_logs_profile_idx on public.sleep_logs (profile_id, slept_at desc);

-- Cafeína
create table if not exists public.caffeine_logs (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  taken_at    timestamptz not null default now(),
  mg          int not null check (mg > 0),
  kind        text not null default 'Café'
);

-- Cofre tap-to-copy (protegido por RLS do casal; o PIN é uma trava de tela)
create table if not exists public.vault_items (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  label       text not null,
  value       text not null,
  category    text not null default 'Outros',
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- Localização em tempo real (1 linha por pessoa; id = profile id)
create table if not exists public.locations (
  id          uuid primary key references public.profiles (id) on delete cascade,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  sharing     boolean not null default false,
  lat         double precision,
  lng         double precision,
  accuracy    real,
  speed       real,
  battery     int,
  updated_at  timestamptz not null default now()
);

-- Tokens de push (FCM)
create table if not exists public.push_tokens (
  token       text primary key,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  platform    text not null default 'android',
  updated_at  timestamptz not null default now()
);

-- ═════════════ RLS ═════════════
alter table public.household_tasks   enable row level security;
alter table public.pet_virtual_state enable row level security;
alter table public.sleep_logs        enable row level security;
alter table public.caffeine_logs     enable row level security;
alter table public.vault_items       enable row level security;
alter table public.locations         enable row level security;
alter table public.push_tokens       enable row level security;

do $$
declare t text;
begin
  foreach t in array array['household_tasks','pet_virtual_state','sleep_logs','caffeine_logs','vault_items'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format('create policy %I_all on public.%I for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())', t, t);
  end loop;
end $$;

drop policy if exists household_tasks_own_insert on public.household_tasks;
create policy household_tasks_own_insert on public.household_tasks as restrictive for insert with check (created_by = auth.uid());
drop policy if exists vault_items_own_insert on public.vault_items;
create policy vault_items_own_insert on public.vault_items as restrictive for insert with check (created_by = auth.uid());
drop policy if exists sleep_logs_own_write on public.sleep_logs;
create policy sleep_logs_own_write on public.sleep_logs as restrictive for insert with check (profile_id = auth.uid());
drop policy if exists caffeine_logs_own_write on public.caffeine_logs;
create policy caffeine_logs_own_write on public.caffeine_logs as restrictive for insert with check (profile_id = auth.uid());

-- Localização: cada um escreve a sua; o parceiro só lê se "sharing" estiver ligado
drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations for select
  using (id = auth.uid() or (couple_id = public.my_couple_id() and sharing));
drop policy if exists locations_write on public.locations;
create policy locations_write on public.locations for all
  using (id = auth.uid()) with check (id = auth.uid() and couple_id = public.my_couple_id());

-- Push: cada um gerencia os próprios tokens (o envio é feito pelo servidor)
drop policy if exists push_tokens_own on public.push_tokens;
create policy push_tokens_own on public.push_tokens for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid() and couple_id = public.my_couple_id());

-- ═════════════ REALTIME ═════════════
do $$
declare t text;
begin
  foreach t in array array['household_tasks','pet_virtual_state','sleep_logs','caffeine_logs','vault_items','locations'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
