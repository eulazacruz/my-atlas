// My Atlas — envio de push (FCM HTTP v1) disparado por gatilhos do banco.
// Segredos: FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço). SUPABASE_URL e
// SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente pelo Supabase.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const MOODS: Record<string, string> = { radiante: 'radiante ☀️', focado: 'focado 🎯', em_paz: 'em paz 🕊️', cansado: 'cansado 🥱', estressado: 'estressado 🌪️' };
const STATUS: Record<string, string> = { foco: 'Em foco / Trabalho 💻', transito: 'No trânsito 🛵', treino: 'Treinando 🏋️', saindo: 'Saindo do trabalho 🚀', casa: 'Em casa 🏠' };
const NEEDS: Record<string, string> = { silencio: 'precisa de silêncio / espaço 🔇', colo: 'precisa de colo / atenção 🫂', desabafar: 'precisa só desabafar 🗣️', comer: 'quer sair pra comer algo 🍔' };
const PET: Record<string, string> = { pet_cabo: 'está brincando de cabo de guerra com o Atlas 🪢', pet_petisco: 'deu um petisco pro Atlas 🦴', pet_carinho: 'está fazendo carinho no Atlas 👋', pet_lambida: 'mandou uma lambida do Atlas pra você 🐾' };
const HOUSE: Record<string, string> = { louca: 'lavou a louça 🍽️', lixo: 'tirou o lixo 🗑️', atlas: 'passeou com o Atlas 🐕', casa: 'organizou a casa 🧹', compras: 'fez as compras 🛒' };
const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

/* ───────── OAuth do Google com a conta de serviço (JWT RS256) ───────── */
let cached: { token: string; exp: number } | null = null;
const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function accessToken(sa: Row) {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: sa.token_uri, iat: now, exp: now + 3600 }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${b64url(sig)}` }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('oauth: ' + JSON.stringify(json));
  cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

/* ───────── Monta a mensagem a partir do evento ───────── */
async function build(table: string, type: string, r: Row, old: Row | null) {
  const actor: string | undefined = r.created_by ?? r.walked_by ?? r.from_profile ?? r.profile_id ?? (table === 'profiles' ? r.id : undefined);
  if (!actor) return null;
  const { data: who } = await sb.from('profiles').select('display_name, couple_id').eq('id', actor).single();
  if (!who?.couple_id) return null;
  const name = String(who.display_name ?? 'Seu par').split(' ')[0];
  let title = '';
  let body = '';
  let to: string | null = null;
  let link = 'app.myatlas://action/open/home';

  if (table === 'nudges') {
    const k = r.message || r.kind;
    to = r.to_profile;
    if (NEEDS[k]) [title, body] = [`${name} ${NEEDS[k]}`, 'Toque para responder'];
    else if (PET[k]) [title, body, link] = [`${name} ${PET[k]}`, 'Atlas virtual', 'app.myatlas://action/open/pet'];
    else if (k === 'carinho') [title, body] = [`${name} te mandou um carinho 🤍`, 'Pensando em você agora.'];
    else [title, body] = [`${name} te cutucou 👉`, 'Ei! Dá uma olhadinha aqui.'];
  } else if (table === 'profiles') {
    if (old && r.context_status !== old.context_status && STATUS[r.context_status]) [title, body] = [`${name}: ${STATUS[r.context_status]}`, 'Status atualizado agora'];
    else if (old && r.mood !== old.mood && MOODS[r.mood]) [title, body] = [`${name} está ${MOODS[r.mood]}`, `Bateria mental em ${r.mental_battery}%`];
    else return null;
  } else if (table === 'transactions') [title, body, link] = [`${r.type === 'expense' ? 'Nova despesa' : 'Nova entrada'}: ${brl(Number(r.amount))}`, `${name} · ${r.description}`, 'app.myatlas://action/open/finance'];
  else if (table === 'events') [title, body, link] = [`${name} marcou: ${r.title}`, new Date(r.starts_at).toLocaleString('pt-BR', { timeZone: 'America/Recife', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), 'app.myatlas://action/open/agenda'];
  else if (table === 'tasks') [title, body, link] = [r.assignee ? 'Nova tarefa para você' : 'Nova tarefa para vocês', r.title, 'app.myatlas://action/open/agenda'];
  else if (table === 'household_tasks') [title, body] = [`${name} ${HOUSE[r.task] ?? 'fez uma tarefa da casa'}`, 'Equilíbrio da semana atualizado'];
  else if (table === 'shopping_items') [title, body, link] = [`${name} adicionou à lista de compras`, r.name, 'app.myatlas://action/open/shopping'];
  else if (table === 'prayers') [title, body] = [`${name} pediu oração 🙏`, r.title];
  else if (table === 'checkins') [title, body, link] = [`${name} fez o check-in da semana 💬`, 'Faça o seu para ver as respostas de vocês dois', 'app.myatlas://action/open/couple'];
  else if (table === 'bible_reads') [title, body, link] = [`${name} leu a Bíblia de hoje 📖`, 'Leitura a dois', 'app.myatlas://action/open/bible'];
  else if (table === 'entries') {
    const d = r.data ?? {};
    if (r.kind === 'prayed') { [title, body] = [`${name} orou pelo seu pedido 🙏`, r.title || 'Estou orando por você']; to = d.to ?? null; }
    else if (r.kind === 'sos') [title, body] = [`${name} precisa de você agora 🫂`, 'Momento de ansiedade — liga ou manda um carinho'];
    else if (r.kind === 'devotional') [title, body, link] = [`${name} escreveu o devocional de hoje ✍️`, r.title || 'Leitura a dois', 'app.myatlas://action/open/faith'];
    else if (r.kind === 'testimony') [title, body] = [`${name}: oração respondida 🙌`, r.title];
    else if (r.kind === 'capsule') [title, body] = [`${name} deixou uma cápsula do tempo 💌`, r.date ? `Abre em ${String(r.date).split('-').reverse().join('/')}` : 'Para abrir no futuro'];
    else if (r.kind === 'focus') [title, body] = [`${name} entrou em modo foco 🎯`, `${d.minutes ?? 25} min sem distrações`];
    else return null;
  }
  else if (table === 'pet_walks') [title, body, link] = [`${name} levou o Atlas para passear 🐾`, 'Passeio do dia registrado', 'app.myatlas://action/open/pet'];
  else return null;

  // destinatário: o parceiro (ou o alvo explícito do cutucão)
  let recipients: string[] = [];
  if (to) recipients = [to];
  else {
    const { data: ps } = await sb.from('profiles').select('id').eq('couple_id', who.couple_id).neq('id', actor);
    recipients = (ps ?? []).map((p) => p.id);
  }
  if (table === 'tasks' && r.assignee && r.assignee !== actor) recipients = [r.assignee];
  return { title, body, link, recipients };
}

Deno.serve(async (req) => {
  try {
    const { data: s } = await sb.from('app_hook_secret').select('secret').eq('id', 1).single();
    if (!s || req.headers.get('x-atlas-hook') !== s.secret) return new Response('forbidden', { status: 403 });

    const { table, type, record, old_record } = await req.json();
    const msg = await build(table, type, record, old_record);
    if (!msg || !msg.recipients.length) return Response.json({ skipped: true });

    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!raw) return Response.json({ skipped: 'no FIREBASE_SERVICE_ACCOUNT' });
    const sa = JSON.parse(raw);
    const token = await accessToken(sa);

    const { data: tokens } = await sb.from('push_tokens').select('token').in('profile_id', msg.recipients);
    const results = await Promise.all(
      (tokens ?? []).map(async ({ token: t }) => {
        const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token: t,
              notification: { title: msg.title, body: msg.body },
              data: { link: msg.link, table },
              android: { priority: 'high', notification: { channel_id: 'atlas', icon: 'ic_stat_atlas', color: '#000000', sound: 'default' } },
            },
          }),
        });
        if (res.status === 404 || res.status === 400) {
          const j = await res.json().catch(() => ({}));
          if (JSON.stringify(j).includes('UNREGISTERED') || JSON.stringify(j).includes('INVALID_ARGUMENT')) await sb.from('push_tokens').delete().eq('token', t);
          return { t: t.slice(0, 8), status: res.status };
        }
        return { t: t.slice(0, 8), status: res.status };
      }),
    );
    return Response.json({ sent: results });
  } catch (e) {
    console.error(e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
