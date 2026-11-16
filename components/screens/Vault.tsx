'use client';

import { motion } from 'framer-motion';
import { Copy, Delete, KeyRound, Lock, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIsland } from '@/components/island/IslandProvider';
import { useAtlas } from '@/components/providers/AtlasProvider';
import { useUI } from '@/components/providers/UIProvider';
import { Button, Empty, Glass, Section } from '@/components/ui/primitives';
import { DEFAULT_VAULT_PIN, VAULT_CATEGORIES } from '@/lib/constants';
import { haptic } from '@/lib/native';
import { cn } from '@/lib/utils';

const PIN_KEY = 'my-atlas:vault-pin';
const UNLOCK_KEY = 'my-atlas:vault-unlocked-at';
const getPin = () => {
  try { return localStorage.getItem(PIN_KEY) || DEFAULT_VAULT_PIN; } catch { return DEFAULT_VAULT_PIN; }
};
const mask = (v: string) => (v.length <= 4 ? '••••' : `${v.slice(0, 2)}${'•'.repeat(Math.min(8, v.length - 4))}${v.slice(-2)}`);

function PinPad({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (code.length < 4) return;
    if (code === getPin()) {
      haptic('success');
      try { sessionStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch { /* noop */ }
      onOk();
    } else {
      haptic('warning');
      setErr(true);
      window.setTimeout(() => { setErr(false); setCode(''); }, 550);
    }
  }, [code, onOk]);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
  return (
    <Glass className="flex flex-col items-center px-6 py-8">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-black text-white dark:bg-white dark:text-black"><Lock size={22} /></span>
      <p className="mt-4 text-[17px] font-semibold">Cofre do casal</p>
      <p className="text-[13px] muted">Digite o PIN para ver os dados</p>
      <motion.div className="mt-5 flex gap-3" animate={err ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-3.5 w-3.5 rounded-full border-2 border-current transition', i < code.length && 'bg-current', err && 'text-red-500')} />
        ))}
      </motion.div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === '' ? <span key={i} /> : (
            <motion.button key={i} whileTap={{ scale: 0.88 }} onClick={() => setCode((c) => (k === 'del' ? c.slice(0, -1) : c.length < 4 ? c + k : c))} className="glass-thin grid h-16 w-16 place-items-center !rounded-full text-[22px] font-medium" aria-label={k === 'del' ? 'Apagar' : k}>
              {k === 'del' ? <Delete size={20} /> : k}
            </motion.button>
          ),
        )}
      </div>
      <p className="mt-5 text-[11px] muted">PIN padrão: 1234 · troque em Ajustes</p>
    </Glass>
  );
}

export function Vault() {
  const { rows } = useAtlas();
  const { openSheet } = useUI();
  const island = useIsland();
  const [unlocked, setUnlocked] = useState(false);
  const [reveal, setReveal] = useState<string | null>(null);
  useEffect(() => {
    try {
      const at = Number(sessionStorage.getItem(UNLOCK_KEY) || 0);
      if (Date.now() - at < 5 * 60_000) setUnlocked(true);
    } catch { /* noop */ }
  }, []);
  if (!unlocked) return <PinPad onOk={() => setUnlocked(true)} />;
  const items = rows('vault_items').sort((a, b) => a.sort - b.sort);
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const t = document.createElement('textarea');
      t.value = value;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    haptic('success');
    island.push({ kind: 'vault', title: `${label} copiado ✓`, subtitle: 'Pronto para colar' });
  };
  const cats = VAULT_CATEGORIES.filter((c) => items.some((i) => i.category === c));
  return (
    <div>
      {items.length === 0 && <Empty icon={<KeyRound size={22} />} title="Cofre vazio" hint="Guarde CPFs, chaves Pix, placa da moto, Wi-Fi e medidas de roupa." action={<Button variant="primary" onClick={() => openSheet('vaultItem')}>Adicionar</Button>} />}
      {cats.map((c) => (
        <Section key={c} title={c}>
          <div className="glass overflow-hidden">
            {items.filter((i) => i.category === c).map((i) => (
              <div key={i.id} className="flex items-center gap-2 border-b px-4 py-3 last:border-0 hairline">
                <button className="min-w-0 flex-1 text-left" onClick={() => copy(i.label, i.value)} onContextMenu={(e) => { e.preventDefault(); setReveal(reveal === i.id ? null : i.id); }}>
                  <p className="truncate text-[12px] muted">{i.label}</p>
                  <p className="truncate font-mono text-[15px] font-medium">{reveal === i.id ? i.value : mask(i.value)}</p>
                </button>
                <button aria-label="Mostrar" onClick={() => setReveal(reveal === i.id ? null : i.id)} className="h-9 rounded-full px-3 text-[12px] font-medium muted">{reveal === i.id ? 'Ocultar' : 'Ver'}</button>
                <button aria-label="Copiar" onClick={() => copy(i.label, i.value)} className="grid h-9 w-9 place-items-center rounded-full bg-black text-white dark:bg-white dark:text-black"><Copy size={15} /></button>
                <button aria-label="Editar" onClick={() => openSheet('vaultItem', { item: i })} className="grid h-9 w-9 place-items-center rounded-full muted"><Pencil size={15} /></button>
              </div>
            ))}
          </div>
        </Section>
      ))}
      {items.length > 0 && <p className="text-center text-[12px] muted">Toque em um item para copiar · protegido pelo PIN</p>}
    </div>
  );
}
