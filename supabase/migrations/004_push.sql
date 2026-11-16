create extension if not exists pg_net;

-- Segredo compartilhado entre o banco e a função de push (sem policies: só o servidor lê)
create table if not exists public.app_hook_secret (id int primary key default 1, secret text not null);
alter table public.app_hook_secret enable row level security;
insert into public.app_hook_secret (id, secret) values (1, '<gerado-no-deploy>') on conflict (id) do nothing;

create or replace function public.notify_push()
returns trigger
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select secret into v_secret from public.app_hook_secret where id = 1;
  perform net.http_post(
    url := 'https://hbpjgdvfguqqjzlpqtkh.supabase.co/functions/v1/push',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-atlas-hook', v_secret)
  );
  return NEW;
end;
$$;
revoke execute on function public.notify_push() from public, anon, authenticated;

create or replace trigger push_nudges after insert on public.nudges for each row execute function public.notify_push();
create or replace trigger push_transactions after insert on public.transactions for each row execute function public.notify_push();
create or replace trigger push_events after insert on public.events for each row execute function public.notify_push();
create or replace trigger push_tasks after insert on public.tasks for each row execute function public.notify_push();
create or replace trigger push_household after insert on public.household_tasks for each row execute function public.notify_push();
create or replace trigger push_shopping after insert on public.shopping_items for each row execute function public.notify_push();
create or replace trigger push_prayers after insert on public.prayers for each row execute function public.notify_push();
create or replace trigger push_walks after insert on public.pet_walks for each row execute function public.notify_push();
create or replace trigger push_profiles after update of context_status, mood on public.profiles
  for each row when (old.context_status is distinct from new.context_status or old.mood is distinct from new.mood)
  execute function public.notify_push();
