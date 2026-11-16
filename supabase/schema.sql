-- ═══════════════════════════════════════════════════════════════════════
--  MY ATLAS — Life & Couple OS
--  Schema completo do Supabase. Cole TUDO no SQL Editor e clique em "Run".
--  É idempotente o suficiente para rodar numa base nova.
--
--  Modelo:
--    couples ─┬─ profiles (2 por casal: role 'A' = você, 'B' = esposa)
--             ├─ mood_logs      (histórico de humor/bateria → gráfico de ondas)
--             ├─ habit_logs     (1 linha por pessoa por dia: hábitos + água)
--             ├─ transactions   (carteira compartilhada / individual)
--             ├─ pets ─┬─ pet_walks     (quem levou pra passear)
--             │        └─ pet_vaccines  (cartão de vacinas digital)
--             └─ nudges         (cutucões / carinhos → Atlas Island do parceiro)
--
--  Segurança: RLS em tudo. Cada pessoa só enxerga dados do PRÓPRIO casal.
-- ═══════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ───────────────────────────────────────────────────────────────────────
-- 0. ALLOWLIST (uso exclusivo do casal)
--    Se esta tabela tiver ao menos 1 e-mail, SÓ esses e-mails conseguem
--    criar conta via Google. Deixe vazia para liberar geral (não recomendado).
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.app_allowed_emails (
  email text primary key
);
alter table public.app_allowed_emails enable row level security;
-- (sem policies = ninguém lê pelo client; só o banco/trigger usa)

-- 👉 TROQUE PELOS E-MAILS DE VOCÊS:
-- insert into public.app_allowed_emails (email) values
--   ('seu-email@gmail.com'),
--   ('email-da-esposa@gmail.com');

-- ───────────────────────────────────────────────────────────────────────
-- 1. COUPLES
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.couples (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'Nós Dois',
  invite_code     text not null unique default upper(substr(md5(random()::text), 1, 6)),
  monthly_budget  numeric(12,2) not null default 4000,
  created_at      timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────
-- 2. PROFILES (1:1 com auth.users)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  couple_id       uuid references public.couples (id) on delete set null,
  role            text check (role in ('A','B')),
  display_name    text,
  avatar_url      text,
  mood            text not null default 'em_paz'
                  check (mood in ('radiante','focado','cansado','estressado','em_paz')),
  mental_battery  int  not null default 70 check (mental_battery between 0 and 100),
  updated_at      timestamptz not null default now()
);
create index if not exists profiles_couple_idx on public.profiles (couple_id);

-- ───────────────────────────────────────────────────────────────────────
-- 3. MOOD LOGS (alimenta o Spline Area Chart do casal)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.mood_logs (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  mood            text not null,
  mental_battery  int  not null check (mental_battery between 0 and 100),
  created_at      timestamptz not null default now()
);
create index if not exists mood_logs_couple_time_idx on public.mood_logs (couple_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────
-- 4. HABIT LOGS (Bio-Rhythm: devocional, treino, dieta, leitura, água)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  log_date    date not null default current_date,
  devotional  boolean not null default false,
  workout     boolean not null default false,
  clean_diet  boolean not null default false,
  reading     boolean not null default false,
  water_ml    int not null default 0 check (water_ml >= 0),
  updated_at  timestamptz not null default now(),
  unique (profile_id, log_date)
);
create index if not exists habit_logs_couple_date_idx on public.habit_logs (couple_id, log_date desc);

-- ───────────────────────────────────────────────────────────────────────
-- 5. TRANSACTIONS (Shared Wallet)
--    scope: 'shared' = NOSSAS | 'individual' = INDIVIDUAIS
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  type         text not null check (type in ('income','expense')),
  scope        text not null default 'shared' check (scope in ('shared','individual')),
  amount       numeric(12,2) not null check (amount > 0),
  description  text not null,
  category     text not null default 'Outros',
  occurred_on  date not null default current_date,
  created_at   timestamptz not null default now()
);
create index if not exists transactions_couple_date_idx on public.transactions (couple_id, occurred_on desc);

-- ───────────────────────────────────────────────────────────────────────
-- 6. PET CARE
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.pets (
  id                uuid primary key default gen_random_uuid(),
  couple_id         uuid not null references public.couples (id) on delete cascade,
  name              text not null default 'Atlas',
  breed             text,
  last_bath_at      timestamptz,
  food_refilled_at  timestamptz default now(),
  food_bag_days     int not null default 30 check (food_bag_days > 0),  -- quantos dias dura um saco
  created_at        timestamptz not null default now()
);

create table if not exists public.pet_walks (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  pet_id      uuid not null references public.pets (id) on delete cascade,
  walked_by   uuid not null references public.profiles (id) on delete cascade,
  walked_at   timestamptz not null default now()
);
create index if not exists pet_walks_pet_time_idx on public.pet_walks (pet_id, walked_at desc);

create table if not exists public.pet_vaccines (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null references public.couples (id) on delete cascade,
  pet_id           uuid not null references public.pets (id) on delete cascade,
  name             text not null,             -- V10, Antirrábica, Vermífugo, Antipulgas
  applied_on       date,
  valid_until      date,
  interval_months  int not null default 12,
  unique (pet_id, name)
);

-- ───────────────────────────────────────────────────────────────────────
-- 7. NUDGES (cutucão / carinho → aparece na Atlas Island do parceiro)
-- ───────────────────────────────────────────────────────────────────────
create table if not exists public.nudges (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples (id) on delete cascade,
  from_profile  uuid not null references public.profiles (id) on delete cascade,
  to_profile    uuid references public.profiles (id) on delete cascade,
  kind          text not null default 'carinho' check (kind in ('carinho','cutucao')),
  message       text,
  created_at    timestamptz not null default now()
);
create index if not exists nudges_to_idx on public.nudges (to_profile, created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
-- FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════════════════════════

-- Retorna o couple_id do usuário logado (usado em todas as policies).
-- SECURITY DEFINER evita recursão de RLS na tabela profiles.
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- Cria o profile automaticamente no 1º login com Google
-- e bloqueia e-mails fora da allowlist (se ela estiver preenchida).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.app_allowed_emails)
     and not exists (select 1 from public.app_allowed_emails where lower(email) = lower(new.email)) then
    raise exception 'Este e-mail não tem acesso ao My Atlas.';
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garante que o usuário tem um casal. Se não tiver, cria um (ele vira Partner A),
-- já com o pet "Atlas" e o cartão de vacinas padrão. Retorna o couple_id.
create or replace function public.ensure_couple()
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_couple uuid;
  v_pet    uuid;
begin
  select couple_id into v_couple from public.profiles where id = auth.uid();
  if v_couple is not null then
    return v_couple;
  end if;

  insert into public.couples default values returning id into v_couple;
  update public.profiles set couple_id = v_couple, role = 'A', updated_at = now() where id = auth.uid();

  insert into public.pets (couple_id, name, last_bath_at, food_refilled_at)
  values (v_couple, 'Atlas', now() - interval '3 days', now() - interval '10 days')
  returning id into v_pet;

  insert into public.pet_vaccines (couple_id, pet_id, name, interval_months) values
    (v_couple, v_pet, 'V10', 12),
    (v_couple, v_pet, 'Antirrábica', 12),
    (v_couple, v_pet, 'Vermífugo', 3),
    (v_couple, v_pet, 'Antipulgas', 1);

  return v_couple;
end;
$$;

-- A esposa entra no casal usando o código de convite (vira Partner B).
-- Se ela tinha um "casal solo" criado automaticamente, ele é removido.
create or replace function public.join_couple(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_target uuid;
  v_old    uuid;
  v_count  int;
begin
  select id into v_target from public.couples where invite_code = upper(trim(p_code));
  if v_target is null then
    raise exception 'Código de convite inválido.';
  end if;

  select count(*) into v_count from public.profiles where couple_id = v_target and id <> auth.uid();
  if v_count >= 2 then
    raise exception 'Este casal já está completo.';
  end if;

  select couple_id into v_old from public.profiles where id = auth.uid();

  update public.profiles
     set couple_id = v_target,
         role = case when v_count = 0 then 'A' else 'B' end,
         updated_at = now()
   where id = auth.uid();

  if v_old is not null and v_old <> v_target
     and not exists (select 1 from public.profiles where couple_id = v_old) then
    delete from public.couples where id = v_old;
  end if;

  return v_target;
end;
$$;

grant execute on function public.ensure_couple() to authenticated;
grant execute on function public.join_couple(text) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════
alter table public.couples      enable row level security;
alter table public.profiles     enable row level security;
alter table public.mood_logs    enable row level security;
alter table public.habit_logs   enable row level security;
alter table public.transactions enable row level security;
alter table public.pets         enable row level security;
alter table public.pet_walks    enable row level security;
alter table public.pet_vaccines enable row level security;
alter table public.nudges       enable row level security;

-- couples: só o próprio casal
drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select using (id = public.my_couple_id());
drop policy if exists couples_update on public.couples;
create policy couples_update on public.couples for update using (id = public.my_couple_id());

-- profiles: vejo o meu e o do meu parceiro; só edito o meu
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or couple_id = public.my_couple_id());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Demais tabelas: tudo liberado dentro do próprio casal
do $$
declare t text;
begin
  foreach t in array array['mood_logs','habit_logs','transactions','pets','pet_walks','pet_vaccines','nudges'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())',
      t, t
    );
  end loop;
end $$;

-- Regras extras de autoria (ninguém lança nada "em nome" do outro)
drop policy if exists habit_logs_own_write on public.habit_logs;
create policy habit_logs_own_write on public.habit_logs as restrictive for insert
  with check (profile_id = auth.uid());
drop policy if exists mood_logs_own_write on public.mood_logs;
create policy mood_logs_own_write on public.mood_logs as restrictive for insert
  with check (profile_id = auth.uid());
drop policy if exists transactions_own_write on public.transactions;
create policy transactions_own_write on public.transactions as restrictive for insert
  with check (created_by = auth.uid());
drop policy if exists nudges_own_write on public.nudges;
create policy nudges_own_write on public.nudges as restrictive for insert
  with check (from_profile = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════
-- REALTIME (Atlas Island do parceiro recebe eventos ao vivo)
-- ═══════════════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  foreach t in array array['profiles','mood_logs','habit_logs','transactions','pets','pet_walks','pet_vaccines','nudges','couples'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════════
-- PRONTO ✅
-- Próximos passos:
--   1. Authentication → Providers → Google: ative e cole Client ID/Secret.
--   2. Authentication → URL Configuration:
--        Site URL:       https://SEU-APP.vercel.app
--        Redirect URLs:  https://SEU-APP.vercel.app/auth/callback
--                        http://localhost:3000/auth/callback
--   3. Preencha a allowlist lá em cima com os e-mails de vocês.
--   4. Você loga primeiro (vira Partner A) → Ajustes → copie o código.
--      Sua esposa loga e cola o código em "Entrar no casal" (vira Partner B).
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- HARDENING: funções internas não ficam expostas ao público anônimo
-- ───────────────────────────────────────────────────────────────────────
revoke execute on function public.ensure_couple() from public, anon;
revoke execute on function public.join_couple(text) from public, anon;
revoke execute on function public.my_couple_id() from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.ensure_couple() to authenticated;
grant execute on function public.join_couple(text) to authenticated;
grant execute on function public.my_couple_id() to authenticated;


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
