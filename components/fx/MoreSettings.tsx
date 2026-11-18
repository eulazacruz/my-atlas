'use client';

import { Download, FileSpreadsheet, FileText, Fingerprint, Lock, Sparkles } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Chip, Glass, Section, Switch } from '@/components/ui/primitives';
import { readPrefs, usePrefs } from '@/lib/fx';
import { isNative } from '@/lib/native';
import { makePdf, shareFile, toCSV } from '@/lib/share';
import { firstName, fmtDay, parseYmd, ymd } from '@/lib/utils';
import { authenticate, biometricAvailable, unlockPrivate } from './Guard';

function GlassToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => { setOn(!document.documentElement.classList.contains('lite')); }, []);
  return <Switch checked={on} onChange={(v) => { setOn(v); try { localStorage.setItem('my-atlas:glass', v ? '1' : '0'); } catch { /* noop */ } document.documentElement.classList.toggle('lite', !v); }} label="Vidro" />;
}

export function ExperienceSettings() {
  const { prefs, set } = usePrefs();
  const Row = ({ t, d, children }: { t: string; d: string; children: ReactNode }) => (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0 hairline">
      <div className="min-w-0 flex-1"><p className="text-[15px]">{t}</p><p className="text-[12px] muted">{d}</p></div>
      {children}
    </div>
  );
  return (
    <Section title="Experiência">
      <div className="glass overflow-hidden">
        <Row t="Intro ao abrir" d="Animação curta com o símbolo do Atlas"><Switch checked={prefs.intro} onChange={(v) => set({ intro: v })} label="Intro" /></Row>
        <Row t="Sons" d="Plim ao concluir, carinho, comemorações"><Switch checked={prefs.sounds} onChange={(v) => set({ sounds: v })} label="Sons" /></Row>
        <Row t="Vidro com desfoque" d="Mais bonito, porém mais pesado no Android"><GlassToggle /></Row>
        <Row t="Modo discreto" d="Esconde valores em R$ e o ciclo"><Switch checked={prefs.discreet} onChange={(v) => set({ discreet: v })} label="Modo discreto" /></Row>
        <div className="px-4 py-3">
          <p className="text-[15px]">Tamanho do texto</p>
          <div className="mt-2 flex gap-2">
            {[{ v: 1, l: 'Normal' }, { v: 1.1, l: 'Grande' }, { v: 1.2, l: 'Maior' }].map((o) => <Chip key={o.v} active={prefs.textScale === o.v} onClick={() => set({ textScale: o.v })}>{o.l}</Chip>)}
          </div>
        </div>
      </div>
    </Section>
  );
}

export function SecuritySettings() {
  const { prefs, set } = usePrefs();
  const [avail, setAvail] = useState<boolean | null>(null);
  useEffect(() => { biometricAvailable().then(setAvail); }, []);
  const choose = async (v: 'off' | 'app' | 'private') => {
    if (v !== 'off' && !(await authenticate('Confirme para ativar o bloqueio'))) return;
    set({ lock: v });
  };
  return (
    <Section title="Bloqueio">
      <Glass className="p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white dark:bg-white dark:text-black"><Fingerprint size={19} /></span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold">Digital ou PIN do celular</p>
            <p className="text-[12px] muted">{!isNative() ? 'Disponível no app do celular.' : avail === false ? 'Cadastre uma digital ou bloqueio de tela no Android.' : 'Protege o app quando você abrir ou voltar depois de 1 minuto.'}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {([['off', 'Desligado'], ['app', 'App inteiro'], ['private', 'Só cofre e diário']] as const).map(([v, l]) => (
            <Chip key={v} active={prefs.lock === v} onClick={() => isNative() && choose(v)}>{l}</Chip>
          ))}
        </div>
      </Glass>
    </Section>
  );
}

export function DataSettings() {
  const { state, rows, me, nameOf, alert } = useAtlas();
  const { navigate } = useUI();
  const [busy, setBusy] = useState<string | null>(null);
  if (!state || !me) return null;
  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try { await fn(); } catch (e) { alert({ kind: 'sync', title: 'Não deu para exportar', subtitle: String((e as Error)?.message ?? e), duration: 4000 }); }
    setBusy(null);
  };
  const backup = () => run('json', async () => {
    const db = { ...state.db, entries: state.db.entries.filter((e) => !e.private || e.createdBy === me.id) };
    await shareFile(`my-atlas-backup-${ymd()}.json`, JSON.stringify({ app: 'Vivalo', exportedAt: new Date().toISOString(), couple: state.couple, db }, null, 2), 'application/json', 'Backup do Vivalo');
  });
  const finance = () => run('csv', async () => {
    const tx = rows('transactions').sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).map((t) => ({ data: t.occurredOn, tipo: t.type === 'expense' ? 'Saída' : 'Entrada', descricao: t.description, categoria: t.category, valor: t.amount.toFixed(2).replace('.', ','), quem: firstName(nameOf(t.createdBy)) }));
    await shareFile(`my-atlas-financas-${ymd()}.csv`, toCSV(tx), 'text/csv', 'Finanças do casal');
  });
  const spiritual = () => run('pdf', async () => {
    if (!(await unlockPrivate())) return;
    const e = rows('entries');
    const date = (d?: string | null) => (d ? fmtDay(parseYmd(d), { day: '2-digit', month: 'short', year: 'numeric' }) : '');
    const secs = [
      ...e.filter((x) => x.kind === 'devotional').sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).map((x) => ({ heading: `✍ ${x.title || 'Devocional'}`, meta: `${x.data?.ref ?? ''} · ${date(x.date)} · ${firstName(nameOf(x.createdBy))}`, text: [x.data?.s && `Escritura: ${x.data.s}`, x.data?.o && `Observação: ${x.data.o}`, x.data?.a && `Aplicação: ${x.data.a}`, x.data?.p && `Oração: ${x.data.p}`].filter(Boolean).join('\n') })),
      ...e.filter((x) => x.kind === 'sermon').map((x) => ({ heading: `⛪ ${x.title}`, meta: `${x.data?.preacher ?? ''} · ${x.data?.ref ?? ''} · ${date(x.date)}`, text: [x.body, x.data?.apply && `Aplicar: ${x.data.apply}`].filter(Boolean).join('\n') })),
      ...rows('prayers').filter((p) => p.answered).map((p) => ({ heading: `🙌 ${p.title}`, meta: `Oração respondida · ${p.answeredAt ? new Date(p.answeredAt).toLocaleDateString('pt-BR') : ''}`, text: p.answerNote ?? '' })),
      ...e.filter((x) => x.kind === 'testimony').map((x) => ({ heading: `🌟 ${x.title}`, meta: date(x.date), text: x.body ?? '' })),
    ].map((s) => ({ ...s, text: s.text.replace(/[^\u0000-ÿ\n]/g, '') , heading: s.heading.replace(/[^\u0000-ÿ]/g, '').trim() }));
    const blob = await makePdf('Diário espiritual do casal', secs.length ? secs : [{ heading: 'Ainda sem registros', text: 'Escreva devocionais, anote cultos e marque orações respondidas.' }]);
    await shareFile(`my-atlas-diario-espiritual-${ymd()}.pdf`, blob, 'application/pdf', 'Diário espiritual');
  });
  void readPrefs;
  return (
    <Section title="Seus dados">
      <div className="glass overflow-hidden">
        {[
          { k: 'json', icon: Download, t: 'Backup completo', d: 'Arquivo com tudo (para guardar)', fn: backup },
          { k: 'csv', icon: FileSpreadsheet, t: 'Finanças em planilha', d: 'Abre no Excel e Google Planilhas', fn: finance },
          { k: 'pdf', icon: FileText, t: 'Diário espiritual em PDF', d: 'Devocionais, cultos, orações respondidas', fn: spiritual },
        ].map((o) => (
          <button key={o.k} onClick={o.fn} disabled={!!busy} className="flex w-full items-center gap-3 border-b px-4 py-3.5 text-left last:border-0 hairline">
            <o.icon size={18} />
            <div className="flex-1"><p className="text-[15px]">{o.t}</p><p className="text-[12px] muted">{o.d}</p></div>
            {busy === o.k && <span className="text-[12px] muted">gerando…</span>}
          </button>
        ))}
        <button onClick={() => navigate('wrapped')} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
          <Sparkles size={18} /><div className="flex-1"><p className="text-[15px]">Retrospectiva {new Date().getFullYear()}</p><p className="text-[12px] muted">O ano de vocês em números</p></div>
        </button>
      </div>
    </Section>
  );
}

/** Pede a digital antes de mostrar áreas privadas (quando o bloqueio é "só cofre e diário"). */
export function PrivateGate({ children }: { children: ReactNode }) {
  const { prefs } = usePrefs();
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (prefs.lock !== 'private') { setOk(true); return; }
    unlockPrivate().then(setOk);
  }, [prefs.lock]);
  if (ok) return <>{children}</>;
  return (
    <Glass className="flex flex-col items-center p-8 text-center">
      <Lock size={26} />
      <p className="mt-3 text-[16px] font-semibold">Área privada</p>
      <Button variant="primary" className="mt-4" onClick={() => unlockPrivate().then(setOk)}><Fingerprint size={16} /> Desbloquear</Button>
    </Glass>
  );
}
