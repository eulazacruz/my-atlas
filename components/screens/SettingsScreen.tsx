'use client';

import { BellRing, Check, Copy, LogOut, Monitor, Moon, RefreshCw, Repeat, Smartphone, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useTestIsland } from '@/components/shell/useTestIsland';
import { DataSettings, ExperienceSettings, SecuritySettings } from '@/components/fx/MoreSettings';
import { GoogleCalendarSettings, IslandCalibration, IslandOutside, IslandSimulator, PrivacyAndPermissions } from './SettingsExtras';
import { Button, Chip, Field, Glass, PageHeader, Section } from '@/components/ui/primitives';
import { firstName, money, parseMoney } from '@/lib/utils';

export function SettingsScreen() {
  const { mode, me, partner, couple, save, updateCouple, switchPerspective, resetDemo, joinCouple, signOut } = useAtlas();
  const { theme, setTheme } = useTheme();
  const testIsland = useTestIsland();
  const [name, setName] = useState(me?.displayName ?? '');
  const [budget, setBudget] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setName(me?.displayName ?? ''), [me?.displayName]);
  if (!me || !couple) return null;

  return (
    <div>
      <PageHeader title="Ajustes" back />

      <Section title="Perfil">
        <Glass className="space-y-3 p-4">
          <Field label="Seu nome no app">
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              <Button onClick={() => name.trim() && save('profiles', { ...me, displayName: name.trim() })}>Salvar</Button>
            </div>
          </Field>
        </Glass>
      </Section>

      <Section title="Aparência">
        <div className="flex gap-2">
          {[
            { v: 'dark', label: 'Escuro', icon: Moon },
            { v: 'light', label: 'Claro', icon: Sun },
            { v: 'system', label: 'Sistema', icon: Monitor },
          ].map(({ v, label, icon: Icon }) => (
            <Chip key={v} active={mounted && theme === v} onClick={() => setTheme(v)} className="flex-1 justify-center">
              <Icon size={14} /> {label}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Casal">
        <Glass className="p-4">
          <p className="label">Código do casal</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-mono text-[26px] font-bold tracking-[0.3em]">{couple.inviteCode}</p>
            <Button
              onClick={() => {
                navigator.clipboard?.writeText(couple.inviteCode);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <p className="mt-1 text-[12px] muted">{partner?.pending ? 'Envie este código para seu par entrar no casal.' : `Conectado com ${firstName(partner?.displayName ?? '')}.`}</p>
          {mode === 'supabase' && partner?.pending && (
            <div className="mt-4 border-t pt-4 hairline">
              <Field label="Entrar no casal do meu par">
                <div className="flex gap-2">
                  <input value={code} maxLength={6} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" className="input font-mono tracking-[0.25em]" />
                  <Button
                    variant="primary"
                    disabled={code.length < 6}
                    onClick={async () => {
                      try {
                        setErr(null);
                        await joinCouple(code);
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : 'Não foi possível entrar.');
                      }
                    }}
                  >
                    Entrar
                  </Button>
                </div>
              </Field>
              {err && <p className="mt-1 text-[12px] text-red-500">{err}</p>}
            </div>
          )}
        </Glass>
        <Glass className="mt-3 p-4">
          <Field label={`Orçamento mensal · atual ${money(couple.monthlyBudget)}`}>
            <div className="flex gap-2">
              <input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Novo valor" className="input" />
              <Button onClick={() => { const n = parseMoney(budget); if (n > 0) { updateCouple({ monthlyBudget: n }); setBudget(''); } }}>Salvar</Button>
            </div>
          </Field>
        </Glass>
      </Section>

      <Section title="Atlas Island">
        <Glass className="flex items-center gap-3 p-4" onClick={testIsland}>
          <BellRing size={18} />
          <div className="flex-1">
            <p className="text-[15px] font-medium">Testar notificação da câmera</p>
            <p className="text-[12px] muted">Toque várias vezes para ver todos os tipos.</p>
          </div>
        </Glass>
      </Section>
      <IslandSimulator />
      <IslandOutside />
      <IslandCalibration />
      <ExperienceSettings />
      <SecuritySettings />
      <GoogleCalendarSettings />
      <DataSettings />
      <PrivacyAndPermissions />

      <Section title="Instalar no celular">
        <Glass className="p-4">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className="mt-0.5 shrink-0" />
            <p className="text-[13px] leading-relaxed muted">
              Baixe o APK em <b className="text-black dark:text-white">github.com/eulazacruz/my-atlas/releases</b>, abra o arquivo e permita “instalar apps desconhecidos”. Ao instalar a versão nova por cima, seus dados continuam.
            </p>
          </div>
        </Glass>
      </Section>

      {mode === 'demo' ? (
        <Section title="Modo demonstração">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={switchPerspective}>
              <Repeat size={15} /> Ver como {firstName(partner?.displayName ?? '')}
            </Button>
            <Button onClick={resetDemo}>
              <RefreshCw size={15} /> Resetar dados
            </Button>
          </div>
        </Section>
      ) : (
        <Section>
          <Button variant="danger" className="w-full" onClick={signOut}>
            <LogOut size={15} /> Sair da conta
          </Button>
        </Section>
      )}
      <p className="pb-4 text-center text-[11px] muted">My Atlas · Life & Couple OS · v6.1</p>
    </div>
  );
}
