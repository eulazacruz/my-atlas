'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas, type NudgeKind } from '@/components/providers/AtlasProvider';
import { useUI, type View } from '@/components/providers/UIProvider';
import { useCycle } from '@/components/shell/useCycle';
import { activeSleep, caffeineAt, fmtDuration, lastNight } from '@/lib/body';
import { DAILY_WORDS, DATE_KINDS, HABITS, MOODS, PHASES, statusOf, WATER_GOAL, wordOfTheDay } from '@/lib/constants';
import { savePushToken } from '@/lib/db';
import { getCutout, isNative, onDeepLink, pushWidgetData, registerPush, scheduleLocal, type Scheduled } from '@/lib/native';
import { petStats } from '@/lib/pet';
import { hasRead, readingFor, refLabel } from '@/lib/bible';
import { readReminders } from '@/components/hubs/MindBody';
import { useExternalEvents } from '@/lib/calendar';
import { getSupabase } from '@/lib/supabase';
import { addDays, daysBetween, firstName, hhmm, money, nextOccurrence, ymd } from '@/lib/utils';

const hashId = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 800000 + 1;
};

/** Efeitos de plataforma: widgets, lembretes, push, localização, sono e deep links. */
export function NativeEffects() {
  const atlas = useAtlas();
  const { state, me, partner, couple, rows, mode, status } = atlas;
  const ui = useUI();
  const cycle = useCycle();
  const gcal = useExternalEvents(status === 'ready' && mode === 'supabase');
  const atlasRef = useRef(atlas);
  atlasRef.current = atlas;
  const uiRef = useRef(ui);
  uiRef.current = ui;

  /* ───── Ações vindas de widgets / atalhos (app.myatlas://action/…) ───── */
  useEffect(() => {
    if (status !== 'ready') return;
    const run = (path: string) => {
      const [a, b] = path.split('/');
      const A = atlasRef.current;
      const U = uiRef.current;
      if (a === 'water') A.addWater(500);
      if (a === 'breathe') U.setBreathingOpen(true);
      if (a === 'expense') U.openSheet('expense');
      if (a === 'task') U.openSheet('task');
      if (a === 'nudge') A.sendNudge((b as NudgeKind) || 'carinho');
      if (a === 'pet' && b) A.petAction(b as never);
      if (a === 'status' && b) A.setContextStatus(b);
      if (a === 'sleep') A.startSleep();
      if (a === 'open' && b) U.navigate(b as View);
      if (a === 'sos') window.dispatchEvent(new Event('atlas:sos'));
      if (a === 'focus') U.navigate('focus');
      if (a === 'mood') U.navigate('couple');
      if (a === 'col' && b) U.navigate('col', b);
      if (a === 'tool' && b) U.navigate('tool', b);
    };
    const q = new URLSearchParams(window.location.search).get('action');
    if (q) {
      window.history.replaceState(window.history.state, '', '/');
      window.setTimeout(() => run(q), 400);
    }
    let off = () => {};
    onDeepLink((url) => {
      const m = url.match(/^app\.myatlas:\/\/action\/(.+)$/);
      if (m) window.setTimeout(() => run(m[1]), 250);
    }).then((f) => (off = f));
    return () => off();
  }, [status]);

  /* ───── Área segura do topo (furo da câmera) no app nativo ───── */
  useEffect(() => {
    if (!isNative()) return;
    getCutout().then((c) => {
      if (!c) return;
      const px = c.hasCutout ? c.bottom / (c.density || window.devicePixelRatio || 1) : 0;
      document.documentElement.style.setProperty('--sat', `${Math.round(px)}px`);
    });
  }, []);

  /* ───── Sono inteligente: detecta o desbloqueio da tela ───── */
  useEffect(() => {
    if (status !== 'ready') return;
    let prompted = '';
    const check = (force = false) => {
      const A = atlasRef.current;
      if (!A.state || document.visibilityState !== 'visible') return;
      const s = activeSleep(A.state.db.sleep_logs, A.state.meId);
      if (!s || prompted === s.id) return;
      const min = (Date.now() - new Date(s.sleptAt).getTime()) / 60_000;
      if (!force && min < 30) return;
      prompted = s.id;
      const wake = new Date();
      A.alert({
        kind: 'sleep',
        title: `Bom dia! Você dormiu ${fmtDuration(Math.max(1, min))} ☀️`,
        subtitle: 'Confirmar registro do sono?',
        actions: [
          { label: 'Confirmar', primary: true, onClick: () => A.finishSleep(true, wake) },
          { label: 'Ainda não', onClick: () => (prompted = '') },
        ],
        duration: 20000,
      });
    };
    const onVis = () => check();
    const onSim = () => check(true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    window.addEventListener('atlas:simulate-wake', onSim);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      window.removeEventListener('atlas:simulate-wake', onSim);
    };
  }, [status]);

  /* ───── Push (Firebase) ───── */
  useEffect(() => {
    if (status !== 'ready' || mode !== 'supabase' || !state || !isNative()) return;
    const sb = getSupabase();
    registerPush((token) => sb && savePushToken(sb, state.couple.id, state.meId, token).catch(console.warn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode]);

  /* ───── Primeira abertura no Android: pedir permissões ───── */
  useEffect(() => {
    if (status !== 'ready' || !isNative()) return;
    try {
      if (localStorage.getItem('my-atlas:perm-asked') || !localStorage.getItem('my-atlas:onboarded')) return;
      localStorage.setItem('my-atlas:perm-asked', '1');
    } catch { /* noop */ }
    window.setTimeout(() => uiRef.current.openSheet('permissions'), 1200);
  }, [status]);

  /* ───── Localização em tempo real ───── */
  const myLoc = state ? state.db.locations.find((l) => l.id === state.meId) : undefined;
  const sharing = !!myLoc?.sharing;
  const [bgTick, setBgTick] = useState(0);
  const [remTick, setRemTick] = useState(0);
  useEffect(() => {
    const on = () => setRemTick((t) => t + 1);
    window.addEventListener('atlas:reminders', on);
    return () => window.removeEventListener('atlas:reminders', on);
  }, []);
  useEffect(() => {
    const on = () => setBgTick((t) => t + 1);
    window.addEventListener('atlas:bg-location', on);
    return () => window.removeEventListener('atlas:bg-location', on);
  }, []);
  useEffect(() => {
    if (status !== 'ready' || !sharing) return;
    let stopped = false;
    let last = 0;
    let cleanup = () => {};
    let lastPos: { lat: number; lng: number; acc: number } | null = null;
    const moved = (lat: number, lng: number) => {
      if (!lastPos) return Infinity;
      const dy = (lat - lastPos.lat) * 111_320;
      const dx = (lng - lastPos.lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
      return Math.sqrt(dx * dx + dy * dy);
    };
    const send = async (lat: number, lng: number, accuracy?: number | null, speed?: number | null) => {
      const acc = accuracy ?? 999;
      const since = Date.now() - last;
      // descarta leituras imprecisas quando já temos uma boa e recente
      if (lastPos && acc > 120 && acc > lastPos.acc * 2 && since < 120_000) return;
      // envia quando andou 15 m+, melhorou a precisão ou a cada 60 s
      if (since < 8_000) return;
      if (lastPos && moved(lat, lng) < 15 && acc >= lastPos.acc && since < 60_000) return;
      last = Date.now();
      lastPos = { lat, lng, acc };
      let battery: number | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = await (navigator as any).getBattery?.();
        if (b) battery = Math.round(b.level * 100);
      } catch { /* noop */ }
      const A = atlasRef.current;
      if (!A.state || stopped) return;
      const cur = A.state.db.locations.find((l) => l.id === A.state!.meId);
      A.save('locations', { id: A.state.meId, sharing: cur?.sharing ?? true, lat, lng, accuracy: accuracy != null ? Math.round(accuracy) : null, speed: speed ?? null, battery, updatedAt: new Date().toISOString() });
    };
    (async () => {
      if (isNative()) {
        const { registerPlugin } = await import('@capacitor/core');
        const { Geolocation } = await import('@capacitor/geolocation');
        // GPS de alta precisão com o app aberto
        const fg = await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 5_000 }, (p) => {
          if (p) send(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed);
        }).catch(() => null);
        // segundo plano só se a pessoa ligar (o Android exige um aviso fixo)
        let bgOn = false;
        try { bgOn = localStorage.getItem('my-atlas:bg-location') === '1'; } catch { /* noop */ }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BG = registerPlugin<any>('BackgroundGeolocation');
        const id = !bgOn ? null : await BG.addWatcher(
          { backgroundTitle: 'Vivalo', backgroundMessage: 'Compartilhando sua localização com seu amor', requestPermissions: true, stale: false, distanceFilter: 10 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (loc: any, err: any) => {
            if (err || !loc) return;
            send(loc.latitude, loc.longitude, loc.accuracy, loc.speed);
          },
        ).catch(() => null);
        cleanup = () => {
          if (fg) Geolocation.clearWatch({ id: fg }).catch(() => {});
          if (id) BG.removeWatcher({ id }).catch(() => {});
        };
      } else if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition((p) => send(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed), () => {}, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 });
        cleanup = () => navigator.geolocation.clearWatch(id);
      }
      if (stopped) cleanup();
    })();
    return () => {
      stopped = true;
      cleanup();
    };
  }, [status, sharing, bgTick]);

  /* ───── Lembretes locais (agenda, datas, ciclo, água, sono) ───── */
  const schedule = useMemo<Scheduled[]>(() => {
    if (!state || !me) return [];
    const list: Scheduled[] = [];
    const now = new Date();
    rows('events').forEach((e) => {
      const at = new Date(new Date(e.startsAt).getTime() - (e.allDay ? -9 * 3600_000 : 30 * 60_000));
      if (at > now && at < addDays(now, 14)) list.push({ id: hashId('ev' + e.id), title: e.allDay ? `Hoje: ${e.title}` : `Em 30 min: ${e.title}`, body: e.location ? `📍 ${e.location}` : 'Agenda do casal', at });
    });
    rows('special_dates').forEach((d) => {
      const n = nextOccurrence(d.date, d.recurring);
      const at = new Date(n);
      at.setHours(8, 30, 0, 0);
      if (at > now && at < addDays(now, 60)) list.push({ id: hashId('sd' + d.id), title: `Hoje é dia especial ${DATE_KINDS.find((k) => k.value === d.kind)?.emoji ?? '⭐'}`, body: d.title, at });
    });
    if (cycle.active && cycle.info.nextPeriod) {
      const at = addDays(cycle.info.nextPeriod, -2);
      at.setHours(9, 0, 0, 0);
      list.push({ id: hashId('cy' + ymd(at)), title: 'Menstruação prevista em 2 dias', body: cycle.isOwner ? 'Deixe o kit pronto e pegue leve.' : `Capriche no carinho com ${firstName(cycle.owner?.displayName ?? '')} 🤍`, at });
    }
    const water = state.db.habit_logs.find((h) => h.profileId === me.id && h.logDate === ymd())?.waterMl ?? 0;
    if (water < WATER_GOAL)
      [10, 12, 14, 16, 18, 20].forEach((h) => {
        const at = new Date();
        at.setHours(h, 0, 0, 0);
        list.push({ id: hashId('wa' + h), title: 'Hora de beber 500ml de água 💧', body: `Você está em ${(water / 1000).toFixed(1)}L de 3L`, at });
      });
    // Google Agenda: aviso 30 min antes (só os seus compromissos)
    gcal.events.filter((e) => e.owner === me.id && !e.allDay).forEach((e) => {
      const at = new Date(new Date(e.start).getTime() - 30 * 60_000);
      if (at > now && at < addDays(now, 7)) list.push({ id: hashId('g' + e.id), title: `Em 30 min: ${e.title}`, body: e.location ? `📍 ${e.location}` : 'Google Agenda', at });
    });
    // check-in no domingo às 19h
    const sunday = new Date(); sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7)); sunday.setHours(19, 0, 0, 0);
    list.push({ id: hashId('checkin' + ymd(sunday)), title: 'Check-in da semana 💬', body: 'Dois minutos para conversar sobre a semana de vocês.', at: sunday });
    // leitura a dois às 21h se ainda não leu
    const plan = state.db.bible_plan[0];
    if (plan) {
      const t = readingFor(plan.plan, plan.startDate);
      const pending = t.chapters.some((c) => !hasRead(state.db.bible_reads, me.id, c.book, c.chapter));
      const at = new Date(); at.setHours(21, 0, 0, 0);
      if (pending && t.chapters.length) list.push({ id: hashId('bible' + ymd()), title: 'Leitura de hoje 📖', body: t.chapters.map((c) => refLabel(c.book, c.chapter)).join(' · '), at });
    }
    /* ───── lembretes de cuidado e da vida a dois ───── */
    const rem = readReminders();
    const at = (h: number, m = 0, dayOffset = 0) => { const d = addDays(new Date(), dayOffset); d.setHours(h, m, 0, 0); return d; };
    for (const off of [0, 1]) {
      if (rem.breaks) [[10, 30], [15, 0], [17, 30]].forEach(([h, m], i) => list.push({ id: hashId(`br${i}${off}`), title: 'Pausa de respiro 🌿', body: '1 minuto: ombros soltos, respire fundo 4 vezes e beba água.', at: at(h, m, off) }));
      if (rem.sun) list.push({ id: hashId(`sun${off}`), title: 'Sol e movimento ☀️', body: 'Que tal 15 minutos lá fora? O Atlas agradece o passeio.', at: at(16, 30, off) });
      if (rem.unwind) { const [h, m] = rem.unwindAt.split(':').map(Number); list.push({ id: hashId(`unw${off}`), title: 'Hora de desligar 🌙', body: 'Celular longe, uma gratidão e oração juntos.', at: at(h, m, off) }); }
      list.push({ id: hashId(`sum${off}`), title: 'Resumo do seu dia', body: 'Veja o que você conquistou hoje e o que vem amanhã.', at: at(21, 15, off) });
      const pr = state.db.entries.filter((e) => e.kind === 'priority' && e.createdBy === me.id && e.date === ymd(addDays(new Date(), off)));
      if (!pr.length) list.push({ id: hashId(`pri${off}`), title: 'Suas 3 prioridades de hoje', body: 'Quais são as 3 coisas que importam hoje?', at: at(7, 40, off) });
    }
    const cn = state.db.entries.find((e) => e.kind === 'setting' && e.title === 'couple_night');
    if (cn) {
      for (let off = 0; off < 8; off++) {
        const d = addDays(new Date(), off);
        if (d.getDay() === cn.data.day) {
          const [h, m] = String(cn.data.time ?? '20:00').split(':').map(Number);
          list.push({ id: hashId(`cnd${ymd(d)}`), title: 'Hoje é a noite do casal 🤍', body: `Às ${cn.data.time}. Sem celular, só vocês dois.`, at: at(h - 2 < 0 ? 0 : h - 2, m, off) });
          list.push({ id: hashId(`cnv${ymd(d)}`), title: 'Amanhã é a noite do casal', body: 'Já pensaram no que vão fazer?', at: at(20, 0, off - 1) });
        }
      }
    }
    state.db.entries.forEach((e) => {
      if (e.kind === 'document' && e.date) { const d = new Date(`${e.date}T09:00:00`); [30, 7, 0].forEach((k) => list.push({ id: hashId(`doc${e.id}${k}`), title: k ? `Vence em ${k} dias: ${e.title}` : `Vence hoje: ${e.title}`, body: 'Documentos e garantias', at: addDays(d, -k) })); }
      if (e.kind === 'capsule' && e.date && e.createdBy !== me.id) list.push({ id: hashId(`cap${e.id}`), title: 'Uma cápsula do tempo abriu 💌', body: e.title, at: new Date(`${e.date}T09:00:00`) });
      if (e.kind === 'church' && e.date && e.data?.time) { const d = new Date(`${e.date}T${e.data.time}:00`); list.push({ id: hashId(`ch${e.id}`), title: `Em 1 hora: ${e.title}`, body: e.data.place ?? 'Agenda da igreja', at: new Date(d.getTime() - 3600_000) }); }
      if (e.kind === 'serve' && e.date && e.createdBy === me.id) list.push({ id: hashId(`sv${e.id}`), title: `Amanhã você serve: ${e.title}`, body: e.data?.role ?? 'Escala', at: new Date(`${ymd(addDays(new Date(`${e.date}T12:00:00`), -1))}T19:00:00`) });
      if (e.kind === 'fast' && e.date && e.createdBy === me.id) { const st = new Date(`${e.date}T${e.data?.start || '00:00'}:00`); list.push({ id: hashId(`fa${e.id}`), title: 'Jejum concluído 🕊️', body: `${e.title}. Glória a Deus!`, at: new Date(st.getTime() + (Number(e.data?.hours) || 12) * 3600_000) }); }
      if (e.kind === 'memory' && e.createdBy === me.id && e.data?.next) list.push({ id: hashId(`mem${e.data.next}`), title: 'Versículos para revisar 🧷', body: 'Alguns cartões estão esperando você.', at: new Date(`${e.data.next}T12:30:00`) });
    });
    const night = new Date();
    night.setHours(22, 30, 0, 0);
    list.push({ id: hashId('sleep'), title: 'Hora de desacelerar 🌙', body: 'Toque em "Iniciar sono" quando for deitar.', at: night });
    return list;
  }, [state, me, rows, cycle, gcal.events, remTick]);

  useEffect(() => {
    if (status !== 'ready') return;
    const t = window.setTimeout(() => scheduleLocal(schedule).catch(console.warn), 1500);
    return () => window.clearTimeout(t);
  }, [schedule, status]);

  /* ───── Widgets da tela inicial ───── */
  useEffect(() => {
    if (status !== 'ready' || !state || !me || !partner || !couple) return;
    const t = window.setTimeout(() => {
      const today = ymd();
      const h = state.db.habit_logs.find((x) => x.profileId === me.id && x.logDate === today);
      const month = today.slice(0, 7);
      const mtx = state.db.transactions.filter((x) => x.occurredOn.startsWith(month));
      const spent = mtx.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
      const balance = mtx.reduce((s, x) => s + (x.type === 'income' ? x.amount : -x.amount), 0);
      const pet = petStats(state.db.pet_virtual_state[0], state.db.habit_logs, state.db.household_tasks);
      const nd = state.db.special_dates.map((d) => ({ d, n: nextOccurrence(d.date, d.recurring) })).sort((a, b) => a.n.getTime() - b.n.getTime())[0];
      const word = wordOfTheDay();
      const ln = lastNight(state.db.sleep_logs, me.id);
      const caf = Math.round(caffeineAt(state.db.caffeine_logs.filter((c) => c.profileId === me.id), new Date(new Date().setHours(22, 0, 0, 0))));
      const person = (p: typeof me) => ({
        name: p.pending ? 'Convide' : firstName(p.displayName),
        mood: `${MOODS[p.mood].emoji} ${MOODS[p.mood].label}`,
        battery: p.mentalBattery,
        status: statusOf(p.contextStatus) ? `${statusOf(p.contextStatus)!.emoji} ${statusOf(p.contextStatus)!.short}` : '',
      });
      pushWidgetData({
        updated: hhmm(new Date().toISOString()),
        me: person(me),
        partner: person(partner),
        today: {
          events: [
            ...state.db.events.filter((e) => ymd(new Date(e.startsAt)) === today).map((e) => ({ at: e.startsAt, all: e.allDay, title: e.title })),
            ...gcal.events.filter((e) => ymd(new Date(e.start)) === today && e.owner === me.id).map((e) => ({ at: e.start, all: e.allDay, title: e.title })),
          ].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 4).map((e) => `${e.all ? 'Dia' : hhmm(e.at)}  ${e.title}`),
          tasks: state.db.tasks.filter((x) => !x.done && x.dueDate && x.dueDate <= today).slice(0, 4).map((x) => x.title),
        },
        water: { ml: h?.waterMl ?? 0, goal: WATER_GOAL, label: `${((h?.waterMl ?? 0) / 1000).toFixed(1)}L de 3L` },
        habits: HABITS.map((x) => ({ label: x.label, done: !!h?.[x.key] })),
        cycle: cycle.active && cycle.info.lastStart
          ? { active: true, day: cycle.info.cycleDay, phase: cycle.info.phase ? PHASES[cycle.info.phase].label : '', next: cycle.info.daysLate > 0 ? `Atrasada ${cycle.info.daysLate}d` : `Menstruação em ${cycle.info.daysToNext}d`, owner: cycle.isOwner ? '' : firstName(cycle.owner?.displayName ?? '') }
          : { active: false },
        pet: { label: pet.label, pose: pet.pose, happiness: pet.happiness, energy: pet.energy, level: pet.level },
        finance: { balance: money(balance), spentPct: Math.round((spent / couple.monthlyBudget) * 100), spent: money(spent) },
        date: nd ? { title: nd.d.title, days: daysBetween(new Date(), nd.n), emoji: DATE_KINDS.find((k) => k.value === nd.d.kind)?.emoji ?? '⭐' } : null,
        word: { text: word.text, ref: word.ref },
        words: [0, 1, 2].map((p) => { const w = DAILY_WORDS.filter((x) => x.kind === 'Versículo'); const d = Math.floor(Date.now() / 86_400_000); const x = w[(d * 3 + p) % w.length]; return { text: x.text, ref: x.ref }; }),
        priorities: state.db.entries.filter((e) => e.kind === 'priority' && e.createdBy === me.id && e.date === today).map((e) => ({ title: e.title, done: e.done })),
        shopping: { count: state.db.shopping_items.filter((i) => !i.checked).length, items: state.db.shopping_items.filter((i) => !i.checked).slice(0, 4).map((i) => i.name) },
        sleep: { last: ln?.durationMin ? fmtDuration(ln.durationMin) : '—', sleeping: !!activeSleep(state.db.sleep_logs, me.id), caffeine22: caf },
      });
    }, 1200);
    return () => window.clearTimeout(t);
  }, [state, me, partner, couple, cycle, status, gcal.events]);

  return null;
}
