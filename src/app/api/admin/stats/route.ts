import { NextResponse, type NextRequest } from 'next/server';
import { isAdminEmail } from '@/lib/adminAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (!isAdminEmail(authData.user.email)) {
    return NextResponse.json(
      { error: 'forbidden' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? '30');
  const days = Number.isFinite(daysParam)
    ? Math.min(90, Math.max(7, Math.round(daysParam)))
    : 30;

  const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
    days_back: days,
  });

  if (error) {
    if (
      error.code === '42883' ||
      error.code === 'PGRST202' ||
      error.code === '42P01'
    ) {
      return NextResponse.json(
        {
          setupRequired: true,
          reason: 'schema_migration_needed',
          adminEmail: authData.user.email,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { error: 'stats_query_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    {
      setupRequired: false,
      adminEmail: authData.user.email,
      data,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
