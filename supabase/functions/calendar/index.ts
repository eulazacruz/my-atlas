// Agenda Google do casal: lê os endereços iCal secretos (só no servidor) e devolve os eventos.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Ev = { id: string; title: string; start: string; end: string | null; allDay: boolean; location: string | null; owner: string };
const OFFSET = '-03:00'; // Brasil (sem horário de verão)

function unfold(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}
function unescape(v: string) {
  return v.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
}
function parseDate(prop: string, value: string): { d: Date; allDay: boolean } | null {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/.test(prop) || /^\d{8}$/.test(v)) {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return { d: new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00${OFFSET}`), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ? 'Z' : OFFSET}`;
  return { d: new Date(iso), allDay: false };
}
const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function expand(start: Date, rrule: string, from: Date, to: Date, ex: Set<number>): Date[] {
  const r: Record<string, string> = {};
  rrule.split(';').forEach((p) => { const [k, v] = p.split('='); if (k && v) r[k.toUpperCase()] = v; });
  const freq = r.FREQ;
  const interval = Math.max(1, Number(r.INTERVAL || 1));
  const count = r.COUNT ? Number(r.COUNT) : Infinity;
  const until = r.UNTIL ? parseDate('', r.UNTIL)?.d ?? to : to;
  const end = until < to ? until : to;
  const byday = r.BYDAY ? r.BYDAY.split(',').map((x) => DAYS.indexOf(x.replace(/^[+-]?\d+/, ''))).filter((x) => x >= 0) : null;
  const out: Date[] = [];
  let n = 0;
  const push = (d: Date) => {
    n++;
    if (d >= from && d <= end && !ex.has(d.getTime())) out.push(d);
  };
  const step = (d: Date, k: number) => {
    const x = new Date(d);
    if (freq === 'DAILY') x.setUTCDate(x.getUTCDate() + k);
    else if (freq === 'WEEKLY') x.setUTCDate(x.getUTCDate() + 7 * k);
    else if (freq === 'MONTHLY') x.setUTCMonth(x.getUTCMonth() + k);
    else if (freq === 'YEARLY') x.setUTCFullYear(x.getUTCFullYear() + k);
    return x;
  };
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return [start].filter((d) => d >= from && d <= to);
  for (let i = 0; i < 2000 && n < count; i++) {
    const base = step(start, i * interval);
    if (base > end) break;
    if (freq === 'WEEKLY' && byday && byday.length) {
      // dias da semana dentro da semana de "base" (em horário local -03)
      const local = new Date(base.getTime() - 3 * 3600_000);
      const wd = local.getUTCDay();
      for (const day of byday.sort()) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() + (day - wd));
        if (d < start) continue;
        if (n >= count || d > end) break;
        push(d);
      }
    } else push(base);
  }
  return out;
}

function parseICS(text: string, owner: string, from: Date, to: Date): Ev[] {
  const lines = unfold(text);
  const out: Ev[] = [];
  let cur: Record<string, { prop: string; value: string }[]> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT' && cur) {
      const g = (k: string) => cur![k]?.[0];
      const s = g('DTSTART') && parseDate(g('DTSTART')!.prop, g('DTSTART')!.value);
      if (s && g('STATUS')?.value !== 'CANCELLED') {
        const e = g('DTEND') ? parseDate(g('DTEND')!.prop, g('DTEND')!.value) : null;
        const dur = e ? e.d.getTime() - s.d.getTime() : 0;
        const ex = new Set<number>();
        (cur['EXDATE'] || []).forEach((x) => x.value.split(',').forEach((v) => { const p = parseDate(x.prop, v); if (p) ex.add(p.d.getTime()); }));
        const rr = g('RRULE')?.value;
        const starts = rr ? expand(s.d, rr, from, to, ex) : s.d >= new Date(from.getTime() - 86400000) && s.d <= to ? [s.d] : [];
        const uidv = g('UID')?.value || Math.random().toString(36);
        for (const st of starts) {
          out.push({
            id: `${uidv}@${st.getTime()}`,
            title: unescape(g('SUMMARY')?.value || '(sem título)'),
            start: st.toISOString(),
            end: dur ? new Date(st.getTime() + dur).toISOString() : null,
            allDay: s.allDay,
            location: g('LOCATION') ? unescape(g('LOCATION')!.value) || null : null,
            owner,
          });
        }
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const head = line.slice(0, i);
    const key = head.split(';')[0].toUpperCase();
    (cur[key] ||= []).push({ prop: head, value: line.slice(i + 1) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: 'unauthorized' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: prof } = await admin.from('profiles').select('couple_id').eq('id', u.user.id).single();
    if (!prof?.couple_id) return json({ events: [], feeds: [] });
    const { data: feeds } = await admin.from('calendar_feeds').select('id,url').eq('couple_id', prof.couple_id);
    const from = new Date(Date.now() - 14 * 86400000);
    const to = new Date(Date.now() + 120 * 86400000);
    const events: Ev[] = [];
    const status: { owner: string; ok: boolean; error?: string; count?: number }[] = [];
    await Promise.all((feeds ?? []).map(async (f) => {
      try {
        const feedUrl = String(f.url).replace(/^webcal:\/\//i, 'https://');
        const r = await fetch(feedUrl, { headers: { 'User-Agent': 'MyAtlas/1.0' } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const txt = await r.text();
        if (!txt.includes('BEGIN:VCALENDAR')) throw new Error('não é um calendário iCal');
        const evs = parseICS(txt, f.id, from, to);
        events.push(...evs);
        status.push({ owner: f.id, ok: true, count: evs.length });
      } catch (e) {
        status.push({ owner: f.id, ok: false, error: String((e as Error).message || e) });
      }
    }));
    events.sort((a, b) => a.start.localeCompare(b.start));
    return json({ events: events.slice(0, 1500), feeds: status, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
