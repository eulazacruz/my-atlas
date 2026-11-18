'use client';
/* Google Drive: fotos e vídeos ficam no Drive de cada pessoa (pasta "Vivalo"), com escopo drive.file
   (o app só enxerga o que ele mesmo criou). Para o par conseguir ver, o arquivo é compartilhado por link. */
import { AtlasNative, isNative } from './native';

export const GOOGLE_WEB_CLIENT_ID = '433702048363-1iq66d35r7qegl54bcbkgg703l8i12rq.apps.googleusercontent.com';
export const GOOGLE_API_KEY = 'AIzaSyD7PJgX9MVZVhBW5K8OFV7BQKzoihIJtHY';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const PREF = 'my-atlas:drive';

export const driveEnabled = () => { try { return localStorage.getItem(PREF) !== '0'; } catch { return true; } };
export const setDriveEnabled = (v: boolean) => { try { localStorage.setItem(PREF, v ? '1' : '0'); } catch { /* noop */ } };
export const isDrivePath = (p?: string | null) => !!p && p.startsWith('gd:');
export const driveUrl = (p: string) => `https://www.googleapis.com/drive/v3/files/${p.slice(3)}?alt=media&key=${GOOGLE_API_KEY}`;

let token: { v: string; exp: number } | null = null;

/* ── token: Android usa o AuthorizationClient do Google; no navegador, o Google Identity Services ── */
interface GisClient { requestAccessToken: (o?: { prompt?: string }) => void }
declare global { interface Window { google?: { accounts: { oauth2: { initTokenClient: (o: { client_id: string; scope: string; callback: (r: { access_token?: string; expires_in?: number; error?: string }) => void }) => GisClient } } } } }
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => res();
    s.onerror = () => rej(new Error('Não foi possível carregar o login do Google'));
    document.head.appendChild(s);
  });
}
async function getToken(interactive = true): Promise<string> {
  if (token && token.exp > Date.now() + 60_000) return token.v;
  if (isNative()) {
    const r = await AtlasNative.driveToken({ interactive });
    if (!r?.token) throw new Error('Sem permissão do Drive');
    token = { v: r.token, exp: Date.now() + 50 * 60_000 };
    return token.v;
  }
  await loadGis();
  return new Promise((res, rej) => {
    const c = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (!r.access_token) return rej(new Error(r.error || 'Sem permissão do Drive'));
        token = { v: r.access_token, exp: Date.now() + (r.expires_in ?? 3000) * 1000 };
        res(token.v);
      },
    });
    c.requestAccessToken({ prompt: '' });
  });
}

async function api(path: string, init: RequestInit = {}) {
  const t = await getToken();
  const r = await fetch(`https://www.googleapis.com${path}`, { ...init, headers: { Authorization: `Bearer ${t}`, ...(init.headers ?? {}) } });
  if (r.status === 401) { token = null; throw new Error('Drive: sessão expirada'); }
  if (!r.ok) throw new Error(`Drive ${r.status}`);
  return r.json();
}

async function folderId(): Promise<string> {
  const k = 'my-atlas:drive-folder';
  try { const c = localStorage.getItem(k); if (c) return c; } catch { /* noop */ }
  const q = encodeURIComponent("name='Vivalo' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const found = await api(`/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`);
  let id: string = found.files?.[0]?.id;
  if (!id) {
    const made = await api('/drive/v3/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Vivalo', mimeType: 'application/vnd.google-apps.folder', description: 'Fotos e vídeos do app Vivalo' }) });
    id = made.id;
  }
  try { localStorage.setItem(k, id); } catch { /* noop */ }
  return id;
}

/** Envia para o Drive e devolve "gd:<id>". O arquivo fica legível por link (para o par ver). */
export async function uploadToDrive(blob: Blob, name: string): Promise<string> {
  const parent = await folderId();
  const meta = { name, parents: [parent] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
  form.append('file', blob);
  const f = await api('/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: form });
  await api(`/drive/v3/files/${f.id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'anyone', role: 'reader', allowFileDiscovery: false }) });
  return `gd:${f.id}`;
}

/** Testa/autoriza o acesso (usado no botão dos Ajustes). */
export async function connectDrive() { await getToken(true); await folderId(); }
