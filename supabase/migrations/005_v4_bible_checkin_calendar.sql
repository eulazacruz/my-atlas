-- v4: Bíblia (marcações, leitura a dois), check-in semanal e agenda Google (iCal)

create table if not exists public.bible_marks (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  book        int  not null check (book between 1 and 66),
  chapter     int  not null,
  verse       int  not null,
  color       text not null default 'gold',
  note        text,
  created_at  timestamptz not null default now(),
  unique (created_by, book, chapter, verse)
);
create index if not exists bible_marks_couple_idx on public.bible_marks (couple_id, book, chapter);

create table if not exists public.bible_reads (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  book        int  not null,
  chapter     int  not null,
  read_at     timestamptz not null default now(),
  unique (profile_id, book, chapter)
);

create table if not exists public.bible_plan (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null unique references public.couples (id) on delete cascade,
  plan        text not null default 'nt',
  start_date  date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.checkins (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  week        date not null,
  score       int  check (score between 1 and 5),
  answers     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (profile_id, week)
);

-- Endereço secreto iCal do Google Agenda: só o dono lê; a função do servidor busca os eventos
create table if not exists public.calendar_feeds (
  id          uuid primary key references public.profiles (id) on delete cascade,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  url         text not null,
  updated_at  timestamptz not null default now()
);

alter table public.bible_marks    enable row level security;
alter table public.bible_reads    enable row level security;
alter table public.bible_plan     enable row level security;
alter table public.checkins       enable row level security;
alter table public.calendar_feeds enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bible_marks','bible_reads','bible_plan','checkins'] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format('create policy %I_all on public.%I for all using (couple_id = public.my_couple_id()) with check (couple_id = public.my_couple_id())', t, t);
  end loop;
end $$;

drop policy if exists bible_marks_own on public.bible_marks;
create policy bible_marks_own on public.bible_marks as restrictive for all using (true) with check (created_by = auth.uid());
drop policy if exists bible_reads_own on public.bible_reads;
create policy bible_reads_own on public.bible_reads as restrictive for all using (true) with check (profile_id = auth.uid());
drop policy if exists checkins_own on public.checkins;
create policy checkins_own on public.checkins as restrictive for all using (true) with check (profile_id = auth.uid());

drop policy if exists calendar_feeds_own on public.calendar_feeds;
create policy calendar_feeds_own on public.calendar_feeds for all
  using (id = auth.uid()) with check (id = auth.uid() and couple_id = public.my_couple_id());

alter publication supabase_realtime add table public.bible_marks, public.bible_reads, public.bible_plan, public.checkins;

create or replace trigger push_checkins after insert on public.checkins for each row execute function public.notify_push();
create or replace trigger push_bible_reads after insert on public.bible_reads for each row execute function public.notify_push();
