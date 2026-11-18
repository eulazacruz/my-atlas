'use client';
/* Primeiro acesso do Vivalo: 3 perguntas que definem os módulos, pet, convite do par e consentimento (LGPD). */
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { Button } from '@/components/ui/primitives';
import { SITE } from '@/lib/version';
import { getSupabase } from '@/lib/supabase';
import { cn, uid } from '@/lib/utils';
import { AtlasGlyph } from './Intro';

const EMERALD = '#10B981';

function Opt({ on, onClick, emoji, title, hint }: { on: boolean; onClick: () => void; emoji: string; title: string; hint?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-[22px] border-2 p-4 text-left transition', on ? 'border-emerald-500 bg-emerald-500/10' : 'border-black/10 dark:border-white/10')}>
      <span className="text-[28px]">{emoji}</span>
      <span className="flex-1"><span className="block text-[16px] font-semibold">{title}</span>{hint && <span className="block text-[12.5px] muted">{hint}</span>}</span>
      {on && <Check size={20} style={{ color: EMERALD }} />}
    </motion.button>
  );
}

export function Setup() {
  const { me, partner, mode, status, save, rows, couple, joinCouple } = useAtlas();
  const open = status === 'ready' && mode === 'supabase' && !!me && me.setupDone === false;
  const [i, setI] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'m' | 'f' | 'x' | null>(null);
  const [duo, setDuo] = useState<boolean | null>(null);
  const [faith, setFaith] = useState<boolean | null>(null);
  const [pet, setPet] = useState<boolean | null>(null);
  const [petName, setPetName] = useState('');
  const [petKind, setPetKind] = useState('Cachorro');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (me && !name) setName(me.displayName?.split(' ')[0] ?? ''); }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = ['hello', 'sex', 'duo', 'faith', 'pet', ...(duo ? ['invite'] : []), 'privacy'] as const;
  const step = steps[Math.min(i, steps.length - 1)];
  const can = { hello: name.trim().length > 1, sex: !!sex, duo: duo !== null, faith: faith !== null, pet: pet === false || (pet === true && petName.trim().length > 0), invite: true, privacy: agree }[step];

  const finish = async () => {
    if (!me) return;
    setBusy(true);
    let email: string | null = null;
    try { email = (await getSupabase()?.auth.getUser())?.data.user?.email ?? null; } catch { /* noop */ }
    save('profiles', { ...me, displayName: name.trim(), sex, christian: faith, coupleMode: duo, hasPet: pet, setupDone: true, email, modules: me.modules ?? {} });
    if (pet && !rows('pets').length) save('pets', { id: uid(), name: petName.trim(), breed: petKind, lastBathAt: null, foodRefilledAt: null, foodBagDays: 30 });
    try { localStorage.removeItem('my-atlas:onboarded'); } catch { /* noop */ }
    setBusy(false);
  };
  const next = () => (step === 'privacy' ? finish() : setI(i + 1));

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[160] flex flex-col overflow-y-auto bg-[var(--bg)] px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[calc(2.5rem+var(--sat,0px))]">
          <div className="flex items-center gap-1.5">{steps.map((_, k) => <span key={k} className="h-1.5 rounded-full transition-all" style={{ width: k === i ? 22 : 6, background: k <= i ? EMERALD : 'rgba(127,127,127,.3)' }} />)}</div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="flex flex-1 flex-col justify-center py-8">
              {step === 'hello' && (
                <>
                  <AtlasGlyph size={84} />
                  <h2 className="mt-7 text-[32px] font-bold leading-tight tracking-tight">Bem-vindo ao Vivalo</h2>
                  <p className="mt-2 text-[16px] muted">Sua vida, seus planos e quem você ama em um só lugar. São só 4 perguntinhas para deixar o app do seu jeito.</p>
                  <label className="mt-7 block text-[13px] font-semibold">Como quer ser chamado?</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input mt-2 !text-[17px]" placeholder="Seu nome" />
                </>
              )}
              {step === 'sex' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Você é…</h2>
                  <p className="mt-1 text-[14px] muted">Usamos só para mostrar recursos que fazem sentido para você (como o acompanhamento do ciclo).</p>
                  <div className="mt-6 space-y-2.5">
                    <Opt on={sex === 'm'} onClick={() => setSex('m')} emoji="👨" title="Homem" />
                    <Opt on={sex === 'f'} onClick={() => setSex('f')} emoji="👩" title="Mulher" />
                    <Opt on={sex === 'x'} onClick={() => setSex('x')} emoji="🙂" title="Prefiro não dizer" />
                  </div>
                </>
              )}
              {step === 'duo' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Vai usar com seu amor?</h2>
                  <p className="mt-1 text-[14px] muted">Com seu par vocês compartilham agenda, instantes, timeline, jogos e a Jornada a Dois. Dá para mudar depois.</p>
                  <div className="mt-6 space-y-2.5">
                    <Opt on={duo === true} onClick={() => setDuo(true)} emoji="💑" title="Sim, com namorado(a) ou cônjuge" hint="Você convida seu par no próximo passo" />
                    <Opt on={duo === false} onClick={() => setDuo(false)} emoji="🧍" title="Só eu, por enquanto" hint="O app fica focado em você" />
                  </div>
                </>
              )}
              {step === 'faith' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Você é cristão?</h2>
                  <p className="mt-1 text-[14px] muted">Se sim, liberamos a aba Fé: Bíblia, plano de leitura, devocionais e oração.</p>
                  <div className="mt-6 space-y-2.5">
                    <Opt on={faith === true} onClick={() => setFaith(true)} emoji="🙏" title="Sim" />
                    <Opt on={faith === false} onClick={() => setFaith(false)} emoji="🌿" title="Não" hint="A aba Fé fica escondida (dá para ligar nos ajustes)" />
                  </div>
                </>
              )}
              {step === 'pet' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Tem pet?</h2>
                  <p className="mt-1 text-[14px] muted">Vacinas, passeios, ração e um bichinho virtual com o nome dele.</p>
                  <div className="mt-6 space-y-2.5">
                    <Opt on={pet === true} onClick={() => setPet(true)} emoji="🐾" title="Tenho" />
                    <Opt on={pet === false} onClick={() => setPet(false)} emoji="🚫" title="Não tenho" />
                  </div>
                  {pet && (
                    <div className="mt-5 space-y-2">
                      <input value={petName} onChange={(e) => setPetName(e.target.value)} className="input" placeholder="Nome do pet" />
                      <div className="flex flex-wrap gap-2">{['Cachorro', 'Gato', 'Outro'].map((k) => <button key={k} onClick={() => setPetKind(k)} className={cn('rounded-full px-4 py-2 text-[14px] font-medium', petKind === k ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/[0.05] dark:bg-white/[0.08]')}>{k}</button>)}</div>
                    </div>
                  )}
                </>
              )}
              {step === 'invite' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Conecte seu par</h2>
                  {partner && !partner.pending ? (
                    <p className="mt-3 text-[16px]">Vocês já estão conectados 💚</p>
                  ) : (
                    <>
                      <p className="mt-1 text-[14px] muted">Mande este código para seu amor. Quando ele(a) entrar no Vivalo, é só digitar o código.</p>
                      <div className="mt-5 flex items-center justify-between rounded-[22px] bg-black/[0.05] p-4 dark:bg-white/[0.07]">
                        <span className="font-mono text-[28px] font-bold tracking-[0.3em]">{couple?.inviteCode}</span>
                        <Button onClick={() => { navigator.clipboard?.writeText(`Vem usar o Vivalo comigo! Meu código de casal: ${couple?.inviteCode}\nBaixe em ${SITE}`); setCopied(true); }}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar convite'}</Button>
                      </div>
                      <p className="mt-6 text-[13px] font-semibold">Já recebeu um código do seu par?</p>
                      <div className="mt-2 flex gap-2">
                        <input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="input font-mono tracking-[0.25em]" />
                        <Button variant="primary" disabled={code.length < 6 || busy} onClick={async () => { setErr(''); setBusy(true); try { await joinCouple(code); } catch (e) { setErr(e instanceof Error ? e.message : 'Código inválido'); } setBusy(false); }}>Entrar</Button>
                      </div>
                      {err && <p className="mt-1 text-[12px] text-red-500">{err}</p>}
                      <p className="mt-3 text-[12px] muted">Pode pular e conectar depois em Ajustes → Casal.</p>
                    </>
                  )}
                </>
              )}
              {step === 'privacy' && (
                <>
                  <h2 className="text-[28px] font-bold tracking-tight">Seus dados são seus</h2>
                  <ul className="mt-4 space-y-2.5 text-[14.5px] leading-snug">
                    <li>🔒 Só você (e seu par, no que for do casal) vê seus registros.</li>
                    <li>🩺 Dados de saúde, humor e ciclo são sensíveis: guardamos só para o app funcionar para você.</li>
                    <li>📁 Fotos e vídeos podem ficar no seu Google Drive.</li>
                    <li>🗑️ Você pode excluir sua conta e tudo o que é seu a qualquer momento em Ajustes.</li>
                  </ul>
                  <label className="mt-6 flex items-start gap-3 rounded-[20px] bg-black/[0.04] p-4 dark:bg-white/[0.06]">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-5 w-5 accent-emerald-500" />
                    <span className="text-[13.5px] leading-snug">Li e aceito a <a href={`${SITE}privacidade.html`} target="_blank" rel="noreferrer" className="font-semibold underline">Política de Privacidade</a> e os <a href={`${SITE}termos.html`} target="_blank" rel="noreferrer" className="font-semibold underline">Termos de Uso</a>, e autorizo o uso dos meus dados sensíveis (saúde e bem-estar) para as funções do app.</span>
                  </label>
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-2">
            {i > 0 && <Button className="h-14 px-6" onClick={() => setI(i - 1)}>Voltar</Button>}
            <Button variant="primary" className="h-14 flex-1 text-[16px]" disabled={!can || busy} onClick={next}>{step === 'privacy' ? 'Começar a usar' : step === 'invite' ? (partner && !partner.pending ? 'Continuar' : 'Continuar (convido depois)') : 'Continuar'}</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
