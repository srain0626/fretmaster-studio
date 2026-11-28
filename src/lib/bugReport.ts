export const BUG_REPORT_CATEGORIES = [
  'audio_pitch',
  'lesson_content',
  'ui_layout',
  'auth_sync',
  'other',
] as const;

export type BugReportCategory = (typeof BUG_REPORT_CATEGORIES)[number];

export const BUG_REPORT_STATUSES = [
  'open',
  'in_progress',
  'resolved',
  'dismissed',
] as const;

export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];

export const BUG_REPORT_NOTICE_STORAGE_KEY =
  'fretmaster_bug_report_notice_v1_dismissed';

export const GITHUB_BUG_REPORT_URL =
  'https://github.com/srain0626/fretmaster-studio/issues/new';

export interface BugReportDiagnosticItem {
  timestamp: string;
  category: string;
  code: string;
  title: string;
  summary: string;
  details: string[];
}

export interface BugReportPayload {
  sessionId: string;
  category: BugReportCategory;
  title: string;
  description: string;
  reporterEmail: string | null;
  pagePath: string;
  lessonId: string | null;
  locale: 'en' | 'ko' | 'unknown';
  theme: 'light' | 'dark' | 'unknown';
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  viewport: string | null;
  userAgent: string | null;
  diagnostics: BugReportDiagnosticItem[];
}

export interface BugReportRecord {
  id: string;
  user_id: string | null;
  reporter_email: string | null;
  session_id: string;
  category: BugReportCategory;
  title: string;
  description: string;
  page_path: string;
  lesson_id: string | null;
  locale: string;
  theme: string;
  device_type: string;
  viewport: string | null;
  user_agent: string | null;
  diagnostics: BugReportDiagnosticItem[];
  status: BugReportStatus;
  created_at: string;
  updated_at: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LESSON_ID_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;
const VIEWPORT_REGEX = /^\d{2,5}x\d{2,5}$/;

export function sanitizeBugText(
  raw: string,
  maxLength: number,
  options?: { preserveNewlines?: boolean }
): string {
  let text = String(raw ?? '').replace(/\r\n?/g, '\n');

  // Redact JWTs, Bearer tokens, Supabase keys, query credentials, and local paths
  text = text.replace(
    /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?/g,
    '[REDACTED_JWT]'
  );
  text = text.replace(
    /\b(sb_(?:publishable|secret)_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9_-]+)\b/g,
    '[REDACTED_KEY]'
  );
  text = text.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  text = text.replace(
    /([?&](?:code|token|access_token|refresh_token|apikey|key|secret|password)=)[^&\s]+/gi,
    '$1[REDACTED]'
  );
  text = text.replace(/(?:webpack-internal|file):\/\/\/?[^\s)]+/gi, '[INTERNAL_URI]');
  text = text.replace(/[A-Za-z]:\\[^\s"']+/g, '[LOCAL_PATH]');
  text = text.replace(
    /(?:\/(?:Users|home|var|etc|app|opt|srv|tmp)\/[^\s"']+)/g,
    '[SYSTEM_PATH]'
  );

  if (options?.preserveNewlines) {
    text = text
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } else {
    text = text.replace(/\s+/g, ' ').trim();
  }

  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim();
  }
  return text;
}

function sanitizeDiagnosticsList(raw: unknown): BugReportDiagnosticItem[] {
  if (!Array.isArray(raw)) return [];
  const out: BugReportDiagnosticItem[] = [];
  for (const entry of raw.slice(0, 15)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    const title = sanitizeBugText(String(item.title ?? ''), 140);
    const summary = sanitizeBugText(String(item.summary ?? ''), 240);
    if (!title && !summary) continue;

    const details = Array.isArray(item.details)
      ? item.details
          .slice(0, 8)
          .map((d) => sanitizeBugText(String(d ?? ''), 220))
          .filter(Boolean)
      : [];

    out.push({
      timestamp: sanitizeBugText(String(item.timestamp ?? ''), 32) || '-',
      category: sanitizeBugText(String(item.category ?? ''), 32) || 'runtime',
      code: sanitizeBugText(String(item.code ?? ''), 48) || 'NOTICE',
      title: title || 'Diagnostic Notice',
      summary: summary || '-',
      details,
    });
  }
  return out;
}

export function validateBugReportPayload(
  body: unknown
): { ok: true; data: BugReportPayload } | { ok: false; reason: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'invalid_object' };
  }

  const raw = body as Record<string, unknown>;

  const category = raw.category;
  if (
    typeof category !== 'string' ||
    !(BUG_REPORT_CATEGORIES as readonly string[]).includes(category)
  ) {
    return { ok: false, reason: 'invalid_category' };
  }

  const title = sanitizeBugText(
    typeof raw.title === 'string' ? raw.title : '',
    140
  );
  if (title.length < 2 || title.length > 140) {
    return { ok: false, reason: 'invalid_title' };
  }

  const description = sanitizeBugText(
    typeof raw.description === 'string' ? raw.description : '',
    3000,
    { preserveNewlines: true }
  );
  if (description.length < 5 || description.length > 3000) {
    return { ok: false, reason: 'invalid_description' };
  }

  let reporterEmail: string | null = null;
  if (typeof raw.reporterEmail === 'string') {
    const trimmed = raw.reporterEmail.trim().toLowerCase();
    if (trimmed.length > 0) {
      if (trimmed.length > 160 || !EMAIL_REGEX.test(trimmed)) {
        return { ok: false, reason: 'invalid_email' };
      }
      reporterEmail = trimmed;
    }
  }

  const rawSession =
    typeof raw.sessionId === 'string' ? raw.sessionId.trim() : '';
  const sessionId =
    rawSession.length >= 4 && rawSession.length <= 80
      ? sanitizeBugText(rawSession, 80)
      : 'anonymous';

  const rawPath =
    typeof raw.pagePath === 'string' ? raw.pagePath.trim() : '/';
  const pagePath = rawPath.startsWith('/') ? rawPath.slice(0, 160) : '/';

  const lessonId =
    typeof raw.lessonId === 'string' &&
    LESSON_ID_REGEX.test(raw.lessonId.trim())
      ? raw.lessonId.trim()
      : null;

  const locale =
    raw.locale === 'en' || raw.locale === 'ko' ? raw.locale : 'unknown';

  const theme =
    raw.theme === 'light' || raw.theme === 'dark' ? raw.theme : 'unknown';

  const deviceType =
    raw.deviceType === 'desktop' ||
    raw.deviceType === 'tablet' ||
    raw.deviceType === 'mobile'
      ? raw.deviceType
      : 'unknown';

  const viewport =
    typeof raw.viewport === 'string' &&
    VIEWPORT_REGEX.test(raw.viewport.trim())
      ? raw.viewport.trim()
      : null;

  const userAgent =
    typeof raw.userAgent === 'string' && raw.userAgent.trim().length > 0
      ? sanitizeBugText(raw.userAgent, 240)
      : null;

  const diagnostics = sanitizeDiagnosticsList(raw.diagnostics);

  return {
    ok: true,
    data: {
      sessionId,
      category: category as BugReportCategory,
      title,
      description,
      reporterEmail,
      pagePath,
      lessonId,
      locale,
      theme,
      deviceType,
      viewport,
      userAgent,
      diagnostics,
    },
  };
}

export function validateBugReportStatusUpdate(
  body: unknown
):
  | { ok: true; data: { id: string; status: BugReportStatus } }
  | { ok: false; reason: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'invalid_object' };
  }

  const raw = body as Record<string, unknown>;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  if (!UUID_REGEX.test(id)) {
    return { ok: false, reason: 'invalid_id' };
  }

  const status = raw.status;
  if (
    typeof status !== 'string' ||
    !(BUG_REPORT_STATUSES as readonly string[]).includes(status)
  ) {
    return { ok: false, reason: 'invalid_status' };
  }

  return {
    ok: true,
    data: {
      id,
      status: status as BugReportStatus,
    },
  };
}
