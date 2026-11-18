'use client';
/* Fotos do casal no Storage (bucket "atlas", pasta = id do casal). No modo demo vira dataURL. */
import { useEffect, useState } from 'react';
import { driveEnabled, driveUrl, isDrivePath, uploadToDrive } from './drive';
import { getSupabase } from './supabase';
import { uid } from './utils';

async function shrink(file: File, max = 1400): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.82));
}

export async function uploadPhoto(file: File, coupleId: string, demo: boolean): Promise<string> {
  const blob = await shrink(file, demo ? 600 : 1400);
  if (demo) {
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(blob);
    });
  }
  if (driveEnabled()) {
    try { return await uploadToDrive(blob, `vivalo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`); }
    catch { /* sem Drive (permissão negada ou offline): cai para o armazenamento do app */ }
  }
  const sb = getSupabase();
  if (!sb) throw new Error('sem conexão');
  const path = `${coupleId}/${uid()}.jpg`;
  const { error } = await sb.storage.from('atlas').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

const urlCache = new Map<string, { url: string; exp: number }>();
export function usePhotoUrl(path?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return setUrl(null);
    if (path.startsWith('data:') || path.startsWith('http')) return setUrl(path);
    if (isDrivePath(path)) return setUrl(driveUrl(path));
    const c = urlCache.get(path);
    if (c && c.exp > Date.now()) return setUrl(c.url);
    let on = true;
    getSupabase()?.storage.from('atlas').createSignedUrl(path, 3600).then(({ data }) => {
      if (!data?.signedUrl || !on) return;
      urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3500_000 });
      setUrl(data.signedUrl);
    });
    return () => { on = false; };
  }, [path]);
  return url;
}

/** URL assinada (ou dataURL) para uso fora de componentes. */
export async function photoUrl(path: string): Promise<string | null> {
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  if (isDrivePath(path)) return driveUrl(path);
  const c = urlCache.get(path);
  if (c && c.exp > Date.now()) return c.url;
  const { data } = (await getSupabase()?.storage.from('atlas').createSignedUrl(path, 3600)) ?? { data: null };
  if (!data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 3500_000 });
  return data.signedUrl;
}
