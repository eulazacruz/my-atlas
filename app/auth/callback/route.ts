import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Retorno do Google OAuth: troca o code pela sessão e aplica a allowlist. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!code || !url || !anon) {
    // Trigger da allowlist rejeitou o cadastro → Supabase devolve error_description
    const desc = searchParams.get('error_description') ?? '';
    const blocked = /acesso|database error/i.test(desc);
    return NextResponse.redirect(`${origin}/login?error=${blocked ? 'not_allowed' : 'auth'}`);
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const blocked = /acesso|database error/i.test(error.message);
    return NextResponse.redirect(`${origin}/login?error=${blocked ? 'not_allowed' : 'auth'}`);
  }

  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = data.user?.email?.toLowerCase();
  if (allowed.length && (!email || !allowed.includes(email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=not_allowed`);
  }

  return NextResponse.redirect(`${origin}/`);
}
