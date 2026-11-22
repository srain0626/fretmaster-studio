import { NextResponse } from 'next/server';
import { validateTelemetryPayload } from '@/lib/adminAuth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const parsed = validateTelemetryPayload(body);
  if (!parsed.ok) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return new NextResponse(null, { status: 204 });
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    await supabase.from('analytics_events').insert({
      user_id: userId,
      session_id: parsed.data.sessionId,
      event_name: parsed.data.eventName,
      page_path: parsed.data.pagePath,
      lesson_id: parsed.data.lessonId,
      locale: parsed.data.locale,
      theme: parsed.data.theme,
      device_type: parsed.data.deviceType,
      viewport: parsed.data.viewport,
      referrer_host: parsed.data.referrerHost,
      metadata: parsed.data.metadata,
    });
  } catch {
    // Telemetry ingestion must never disrupt user flows
  }

  return new NextResponse(null, { status: 204 });
}
