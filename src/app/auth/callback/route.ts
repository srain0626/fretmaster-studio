import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function sanitizeNextPath(rawNext: string | null): string {
  if (!rawNext) return '/studio';
  if (!rawNext.startsWith('/') || rawNext.startsWith('//')) {
    return '/studio';
  }
  return rawNext;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'));
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/studio?authError=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/studio?authError=supabase_not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/studio?authError=oauth_exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${nextPath}`);
}
