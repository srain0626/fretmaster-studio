const DEFAULT_ADMIN_EMAILS = ['srain0626@gmail.com'] as const;

export function getAdminEmailAllowlist(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]));
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getAdminEmailAllowlist().includes(normalized);
}

export interface ValidatedTelemetryPayload {
  eventName: string;
  sessionId: string;
  pagePath: string;
  lessonId: string | null;
  locale: 'en' | 'ko' | 'unknown';
  theme: 'light' | 'dark' | 'unknown';
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  viewport: string | null;
  referrerHost: string | null;
  metadata: Record<string, string | number | boolean>;
}

const EVENT_NAME_RE = /^[a-z0-9_]{2,48}$/;
const SESSION_ID_RE = /^[a-zA-Z0-9._-]{4,80}$/;

export function validateTelemetryPayload(
  body: unknown
): { ok: true; data: ValidatedTelemetryPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'invalid_body' };
  }

  const raw = body as Record<string, unknown>;
  const eventRaw =
    typeof raw.eventName === 'string'
      ? raw.eventName.trim()
      : typeof raw.event === 'string'
        ? raw.event.trim()
        : '';

  if (!EVENT_NAME_RE.test(eventRaw)) {
    return { ok: false, error: 'invalid_event_name' };
  }

  const sessionId = typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
  if (!SESSION_ID_RE.test(sessionId)) {
    return { ok: false, error: 'invalid_session_id' };
  }

  let pagePath = '/';
  if (raw.pagePath !== undefined && raw.pagePath !== null) {
    if (typeof raw.pagePath !== 'string') {
      return { ok: false, error: 'invalid_page_path' };
    }
    const trimmedPath = raw.pagePath.trim();
    if (trimmedPath.length > 0) {
      if (!trimmedPath.startsWith('/') || trimmedPath.length > 160) {
        return { ok: false, error: 'invalid_page_path' };
      }
      pagePath = trimmedPath;
    }
  }

  let lessonId: string | null = null;
  if (typeof raw.lessonId === 'string' && raw.lessonId.trim().length > 0) {
    lessonId = raw.lessonId.trim().slice(0, 48);
  }

  const locale = raw.locale === 'en' || raw.locale === 'ko' ? raw.locale : 'unknown';
  const theme = raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'unknown';
  const deviceType =
    raw.deviceType === 'desktop' || raw.deviceType === 'tablet' || raw.deviceType === 'mobile'
      ? raw.deviceType
      : 'unknown';

  const viewport =
    typeof raw.viewport === 'string' && raw.viewport.trim().length > 0
      ? raw.viewport.trim().slice(0, 32)
      : null;

  const referrerHost =
    typeof raw.referrerHost === 'string' && raw.referrerHost.trim().length > 0
      ? raw.referrerHost.trim().slice(0, 120)
      : null;

  const cleanMeta: Record<string, string | number | boolean> = {};
  if (raw.metadata !== undefined && raw.metadata !== null) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      return { ok: false, error: 'invalid_metadata' };
    }
    const rawMeta = raw.metadata as Record<string, unknown>;
    for (const [k, v] of Object.entries(rawMeta)) {
      if (typeof k !== 'string' || k.length > 48) continue;
      if (typeof v === 'string') {
        cleanMeta[k] = v.slice(0, 240);
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        cleanMeta[k] = v;
      } else if (typeof v === 'boolean') {
        cleanMeta[k] = v;
      }
    }
    if (JSON.stringify(cleanMeta).length > 2048) {
      return { ok: false, error: 'metadata_too_large' };
    }
  }

  if (!lessonId && typeof cleanMeta.lesson_id === 'string' && cleanMeta.lesson_id.length > 0) {
    lessonId = cleanMeta.lesson_id.slice(0, 48);
  }

  return {
    ok: true,
    data: {
      eventName: eventRaw,
      sessionId,
      pagePath,
      lessonId,
      locale,
      theme,
      deviceType,
      viewport,
      referrerHost,
      metadata: cleanMeta,
    },
  };
}
