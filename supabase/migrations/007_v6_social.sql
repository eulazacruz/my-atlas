-- v6: notificações das novas funções (instantes, timeline, mural, jornada, soneca, desejos, desafios)
create or replace trigger push_entries after insert on public.entries for each row
  when (new.kind in ('prayed','sos','devotional','testimony','capsule','focus','priority_done','idea_shared','instant','post','mural','journey_hard','alarm_snooze','wish','challenge') and not new.private)
  execute function public.notify_push();
