'use client';
/* Atualização obrigatória: o app compara a própria versão com a publicada no site de download. */
import { AnimatePresence, motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { isNative, openExternal } from '@/lib/native';
import { APK_URL, VERSION_CODE, VERSION_URL } from '@/lib/version';
import { AtlasGlyph } from './Intro';

interface Remote { code: number; min?: number; version: string; notes?: string[]; apk?: string }

export function UpdateGate() {
  const [r, setR] = useState<Remote | null>(null);
  useEffect(() => {
    if (!isNative()) return; // no navegador/iPhone a versão web já é sempre a mais nova
    const check = () => fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' }).then((x) => (x.ok ? x.json() : null)).then((j: Remote | null) => {
      if (j && typeof j.code === 'number' && j.code > VERSION_CODE) setR(j);
    }).catch(() => {});
    check();
    const on = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  // Toda versão nova publicada é obrigatória (como combinado): sem botão de fechar.
  return (
    <AnimatePresence>
      {r && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[var(--bg)] px-8 text-center">
          <AtlasGlyph size={88} />
          <h2 className="mt-8 text-[28px] font-bold tracking-tight">Nova versão disponível</h2>
          <p className="mt-2 text-[15px] muted">Vivalo {r.version} chegou. Para continuar usando, atualize o app. Seus dados ficam salvos.</p>
          {r.notes?.length ? <ul className="mt-5 w-full max-w-sm space-y-1.5 rounded-[22px] bg-black/[0.04] p-4 text-left text-[14px] dark:bg-white/[0.06]">{r.notes.slice(0, 5).map((n) => <li key={n}>✨ {n}</li>)}</ul> : null}
          <button onClick={() => openExternal(r.apk || APK_URL)} className="mt-7 flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-emerald-500 text-[16px] font-bold text-white"><Download size={18} /> Baixar atualização</button>
          <p className="mt-4 max-w-xs text-[12px] muted">Depois de baixar, abra o arquivo e toque em "Atualizar". O Vivalo ainda não está na Play Store, por isso a atualização é feita por aqui.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
