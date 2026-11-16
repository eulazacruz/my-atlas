import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isNative } from './native';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sem as chaves no .env → o app roda em Modo Demo (localStorage). */
export const isSupabaseConfigured = Boolean(url && anon && !url.includes('xxxx'));

/** Deep link usado pelo app Android para voltar do login do Google. */
export const NATIVE_REDIRECT = 'app.myatlas://auth';
/** O Google volta para o site, que devolve o código ao app (não depende da lista de URLs do Supabase). */
export const SITE_URL = 'https://my-atlas-zeta.vercel.app';
export const NATIVE_RETURN_URL = `${SITE_URL}/app-return.html?app=1`;

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        // no app nativo o código chega por deep link e é trocado manualmente
        detectSessionInUrl: typeof window !== 'undefined' && !isNative(),
        storageKey: 'my-atlas-auth',
      },
    });
  }
  return client;
}
