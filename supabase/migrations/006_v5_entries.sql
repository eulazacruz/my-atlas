-- v5: tabela genérica "entries" (prioridades, ideias, devocionais, emoções, livros, treinos, receitas…)
-- e armazenamento de fotos por casal (bucket "atlas", pasta = couple_id)
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  title       text not null default '',
  body        text,
  date        date,
  done        boolean not null default false,
  private     boolean not null default false,
  data        jsonb not null default '{}'::jsonb,
  sort        double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists entries_couple_kind_idx on public.entries (couple_id, kind, date);
alter table public.entries enable row level security;
create policy entries_select on public.entries for select using (couple_id = public.my_couple_id() and (not private or created_by = auth.uid()));
create policy entries_insert on public.entries for insert with check (couple_id = public.my_couple_id() and created_by = auth.uid());
create policy entries_update on public.entries for update using (couple_id = public.my_couple_id() and (not private or created_by = auth.uid())) with check (couple_id = public.my_couple_id());
create policy entries_delete on public.entries for delete using (couple_id = public.my_couple_id() and (not private or created_by = auth.uid()));
alter publication supabase_realtime add table public.entries;
create or replace trigger push_entries after insert on public.entries for each row
  when (new.kind in ('prayed','sos','devotional','testimony','capsule','focus','priority_done','idea_shared'))
  execute function public.notify_push();
insert into storage.buckets (id, name, public) values ('atlas', 'atlas', false) on conflict (id) do nothing;
create policy atlas_files_select on storage.objects for select to authenticated using (bucket_id = 'atlas' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy atlas_files_insert on storage.objects for insert to authenticated with check (bucket_id = 'atlas' and (storage.foldername(name))[1] = public.my_couple_id()::text);
create policy atlas_files_delete on storage.objects for delete to authenticated using (bucket_id = 'atlas' and (storage.foldername(name))[1] = public.my_couple_id()::text);
