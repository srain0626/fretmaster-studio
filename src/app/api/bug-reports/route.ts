import { NextResponse } from 'next/server';
import { validateBugReportPayload } from '@/lib/bugReport';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const parsed = validateBugReportPayload(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.reason },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'supabase_not_configured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const { data: authData } = await supabase.auth.getUser();
    userId = authData.user?.id ?? null;
    userEmail = authData.user?.email ?? null;
  } catch {
    userId = null;
    userEmail = null;
  }

  const reportId = crypto.randomUUID();
  const { error } = await supabase.from('bug_reports').insert({
    id: reportId,
    user_id: userId,
    reporter_email: parsed.data.reporterEmail ?? userEmail,
    session_id: parsed.data.sessionId,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    page_path: parsed.data.pagePath,
    lesson_id: parsed.data.lessonId,
    locale: parsed.data.locale,
    theme: parsed.data.theme,
    device_type: parsed.data.deviceType,
    viewport: parsed.data.viewport,
    user_agent: parsed.data.userAgent,
    diagnostics: parsed.data.diagnostics,
  });

  if (error) {
    return NextResponse.json(
      { error: 'insert_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  return NextResponse.json(
    { ok: true, id: reportId },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
}
