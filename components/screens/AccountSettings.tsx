'use client';
/* Meus módulos, privacidade e exclusão de conta. */
import { useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Button, Glass, Section, Switch } from '@/components/ui/primitives';
import { useModules } from '@/lib/modules';
import { openExternal } from '@/lib/native';
import { getSupabase } from '@/lib/supabase';
import type { ModuleKey } from '@/lib/types';
import { APP_VERSION, SITE } from '@/lib/version';
import { connectDrive, driveEnabled, setDriveEnabled } from '@/lib/drive';

const LIST: [ModuleKey, string, string][] = [
  ['couple', 'Casal', 'Instantes, timeline, Jornada a Dois, jogos e agenda a dois'],
  ['faith', 'Fé', 'Aba Fé, Bíblia, devocionais e práticas de oração'],
  ['cycle', 'Ciclo', 'Acompanhamento do ciclo menstrual'],
  ['pet', 'Pet', 'Cuidados e o bichinho virtual'],
  ['finance', 'Finanças', 'Gastos, orçamento e cofrinhos'],
  ['lang', 'Idiomas', 'Inglês e espanhol com o professor'],
  ['nutrition', 'Alimentação', 'Refeições e tabela TACO'],
];

export function ModulesSettings() {
  const { me, save, mode } = useAtlas();
  const mods = useModules();
  if (!me) return null;
  const set = (k: ModuleKey, v: boolean) => save('profiles', { ...me, modules: { ...(me.modules ?? {}), [k]: v } });
  return (
    <Section title="Meus módulos">
      <Glass className="divide-y p-1 hairline">
        {LIST.map(([k, t, d]) => (
          <div key={k} className="flex items-center gap-3 px-3 py-3">
            <div className="flex-1"><p className="text-[15px] font-medium">{t}</p><p className="text-[12px] muted">{d}</p></div>
            <Switch checked={mods[k]} onChange={(v) => set(k, v)} label={t} />
          </div>
        ))}
      </Glass>
      {mode === 'supabase' && <button onClick={() => save('profiles', { ...me, setupDone: false })} className="mt-2 px-1 text-[12.5px] muted underline">Responder as perguntas iniciais de novo</button>}
    </Section>
  );
}

export function PrivacySettings() {
  const { mode, signOut } = useAtlas();
  const [ask, setAsk] = useState(false);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const del = async () => {
    setBusy(true); setErr('');
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('Sem conexão');
      const { error } = await sb.functions.invoke('delete-account', { body: { confirm: true } });
      if (error) throw error;
      try { Object.keys(localStorage).filter((k) => k.startsWith('my-atlas')).forEach((k) => localStorage.removeItem(k)); } catch { /* noop */ }
      await signOut();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível excluir agora.'); }
    setBusy(false);
  };
  return (
    <Section title="Privacidade e conta">
      <Glass className="space-y-2 p-4">
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => openExternal(`${SITE}privacidade.html`)}>Política de privacidade</Button>
          <Button className="flex-1" onClick={() => openExternal(`${SITE}termos.html`)}>Termos de uso</Button>
        </div>
        {mode === 'supabase' && (!ask ? (
          <Button variant="danger" className="w-full" onClick={() => setAsk(true)}>Excluir minha conta e meus dados</Button>
        ) : (
          <div className="rounded-2xl bg-red-500/10 p-3">
            <p className="text-[13.5px] leading-snug">Isso apaga para sempre seus registros, fotos guardadas no app e sua conta. O que for do casal e tiver sido criado pelo seu par continua com ele(a). Digite <b>EXCLUIR</b> para confirmar.</p>
            <input value={txt} onChange={(e) => setTxt(e.target.value.toUpperCase())} className="input mt-2" placeholder="EXCLUIR" />
            <div className="mt-2 flex gap-2">
              <Button className="flex-1" onClick={() => { setAsk(false); setTxt(''); }}>Cancelar</Button>
              <Button variant="danger" className="flex-1" disabled={txt !== 'EXCLUIR' || busy} onClick={del}>{busy ? 'Excluindo…' : 'Excluir tudo'}</Button>
            </div>
            {err && <p className="mt-1 text-[12px] text-red-500">{err}</p>}
          </div>
        ))}
        <p className="pt-1 text-center text-[11.5px] muted">Vivalo {APP_VERSION}</p>
      </Glass>
    </Section>
  );
}

export function DriveSettings() {
  const { mode } = useAtlas();
  const [on, setOn] = useState(() => driveEnabled());
  const [st, setSt] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  if (mode !== 'supabase') return null;
  const connect = async () => {
    setSt('busy'); setMsg('');
    try { await connectDrive(); setSt('ok'); } catch (e) { setSt('err'); setMsg(e instanceof Error ? e.message : 'Não foi possível conectar'); }
  };
  return (
    <Section title="Fotos e vídeos">
      <Glass className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[15px] font-medium">Salvar no meu Google Drive</p>
            <p className="text-[12px] muted">Ficam na pasta “Vivalo” do seu Drive. O app só acessa os arquivos que ele mesmo criou.</p>
          </div>
          <Switch checked={on} onChange={(v) => { setOn(v); setDriveEnabled(v); }} label="Google Drive" />
        </div>
        {on && <Button className="w-full" variant="secondary" disabled={st === 'busy'} onClick={connect}>{st === 'busy' ? 'Conectando…' : st === 'ok' ? 'Drive conectado ✓' : 'Conectar Google Drive'}</Button>}
        {st === 'err' && <p className="text-[12px] text-rose-400">{msg}. As fotos continuam salvas com segurança no servidor do app.</p>}
      </Glass>
    </Section>
  );
}
