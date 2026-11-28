import { NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/adminAuth';
import { validateBugReportStatusUpdate } from '@/lib/bugReport';
import { createSupabaseServerClient } from '@/lib/supabase/server';

async function requireAdminClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: 'supabase_not_configured' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return {
      error: NextResponse.json(
        { error: 'unauthorized' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  if (!isAdminEmail(authData.user.email)) {
    return {
      error: NextResponse.json(
        { error: 'forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      ),
    };
  }

  return { supabase };
}

export async function GET() {
  const guard = await requireAdminClient();
  if ('error' in guard) return guard.error;

  const { data, error } = await guard.supabase
    .from('bug_reports')
    .select(
      'id, user_id, reporter_email, session_id, category, title, description, page_path, lesson_id, locale, theme, device_type, viewport, user_agent, diagnostics, status, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return NextResponse.json(
        { setupRequired: true, reports: [], openCount: 0 },
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
      { error: 'bug_reports_query_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const reports = data ?? [];
  const openCount = reports.filter(
    (r) => r.status === 'open' || r.status === 'in_progress'
  ).length;

  return NextResponse.json(
    { setupRequired: false, reports, openCount },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function PATCH(request: Request) {
  const guard = await requireAdminClient();
  if ('error' in guard) return guard.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = validateBugReportStatusUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.reason },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const { error } = await guard.supabase
    .from('bug_reports')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id);

  if (error) {
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'forbidden' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      { error: 'bug_report_update_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { ok: true, id: parsed.data.id, status: parsed.data.status },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
