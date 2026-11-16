'use client';

import { useEffect, useState } from 'react';

/** O login do Google (iniciado no app Android) termina aqui e devolve o código ao app. */
export default function VoltarPage() {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search.slice(1) || window.location.hash.slice(1));
    params.delete('app');
    setFailed(!!(params.get('error') || params.get('error_description')));
    const rest = params.toString();
    const u = /Android/i.test(navigator.userAgent)
      ? `intent://auth${rest ? `?${rest}` : ''}#Intent;scheme=app.myatlas;package=app.myatlas.twa;end`
      : `app.myatlas://auth${rest ? `?${rest}` : ''}`;
    setUrl(u);
    const t = window.setTimeout(() => (window.location.href = u), 150);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030303] px-8 text-center text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-20 w-20 rounded-[24px]" />
      <h1 className="mt-6 text-[22px] font-bold tracking-tight">{failed ? 'Não deu para entrar' : 'Login concluído ✓'}</h1>
      <p className="mb-7 mt-1.5 max-w-[300px] text-[14px] text-white/55">{failed ? 'Volte ao app e tente de novo.' : 'Toque no botão para voltar ao aplicativo.'}</p>
      <a href={url || '#'} className="flex h-[52px] w-full max-w-[320px] items-center justify-center rounded-full bg-white text-[16px] font-bold text-black">
        Voltar para o My Atlas
      </a>
      <p className="mt-4 text-[12px] text-white/35">Se nada acontecer, feche esta aba e abra o app.</p>
    </main>
  );
}
