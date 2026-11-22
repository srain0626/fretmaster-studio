import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/adminAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { isAdmin: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const { data } = await supabase.auth.getUser();
    const isAdmin = isAdminEmail(data.user?.email);
    return NextResponse.json(
      { isAdmin },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { isAdmin: false },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
