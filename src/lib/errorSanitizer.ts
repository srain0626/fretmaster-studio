export type ErrorCategory = 'audio' | 'sync' | 'auth' | 'runtime';

export interface SafeErrorLogEntry {
  id: string;
  timestamp: string;
  category: ErrorCategory;
  code: string;
  title: string;
  summary: string;
  details: string[];
}

export function sanitizeLogLine(raw: string): string {
  let line = String(raw || '').trim();
  if (!line) return '';

  // Drop JS stack trace frames completely
  if (/^\s*at\s+/i.test(line)) {
    return '';
  }

  // Redact JWT tokens, Bearer secrets, Supabase API keys, and query credentials
  line = line.replace(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]*)?/g, '[REDACTED_JWT]');
  line = line.replace(/\b(sb_(?:publishable|secret)_[A-Za-z0-9_-]+|sbp_[A-Za-z0-9_-]+)\b/g, '[REDACTED_KEY]');
  line = line.replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
  line = line.replace(/([?&](?:code|token|access_token|refresh_token|apikey|key|secret|password)=)[^&\s]+/gi, '$1[REDACTED]');
  line = line.replace(/\bNEXT_PUBLIC_[A-Z0-9_]+\b/g, '[ENV_VAR]');

  // Redact file paths, webpack internals, and database schema internals
  line = line.replace(/(?:webpack-internal|file):\/\/\/?[^\s)]+/gi, '[INTERNAL_URI]');
  line = line.replace(/[A-Za-z]:\\[^\s"']+/g, '[LOCAL_PATH]');
  line = line.replace(/(?:\/(?:Users|home|var|etc|app|opt|srv|tmp)\/[^\s"']+)/g, '[SYSTEM_PATH]');
  line = line.replace(/\b(?:relation|policy|column|table|schema)\s+"[^"]+"/gi, '[DB_OBJECT]');
  line = line.replace(/\bSQLSTATE\s+[A-Z0-9]+/gi, '[DB_CODE]');

  // Collapse excess whitespace and enforce safe length ceiling
  line = line.replace(/\s+/g, ' ').trim();
  if (line.length > 220) {
    line = `${line.slice(0, 217)}...`;
  }
  return line;
}

export function buildSafeErrorEntry(params: {
  category: ErrorCategory;
  code?: string;
  title: string;
  summary: string;
  error?: unknown;
  context?: Record<string, string | number | boolean | undefined>;
}): SafeErrorLogEntry {
  const details: string[] = [];

  if (params.error instanceof Error) {
    const safeName = sanitizeLogLine(params.error.name);
    const safeMsg = sanitizeLogLine(params.error.message);
    if (safeName && safeName !== 'Error') {
      details.push(`type=${safeName}`);
    }
    if (safeMsg) {
      details.push(`message=${safeMsg}`);
    }
  } else if (typeof params.error === 'string') {
    const safeMsg = sanitizeLogLine(params.error);
    if (safeMsg) {
      details.push(`message=${safeMsg}`);
    }
  } else if (params.error && typeof params.error === 'object' && 'message' in params.error) {
    const rawMsg = String((params.error as { message?: unknown }).message ?? '');
    const safeMsg = sanitizeLogLine(rawMsg);
    if (safeMsg) {
      details.push(`message=${safeMsg}`);
    }
  }

  if (params.context) {
    for (const [k, v] of Object.entries(params.context)) {
      if (v === undefined) continue;
      const safeVal = sanitizeLogLine(String(v));
      if (safeVal) {
        details.push(`${k}=${safeVal}`);
      }
    }
  }

  if (typeof navigator !== 'undefined') {
    details.push(`network=${navigator.onLine ? 'online' : 'offline'}`);
  }

  const now = new Date();
  const timestamp = now.toTimeString().slice(0, 8);

  return {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp,
    category: params.category,
    code: sanitizeLogLine(params.code || `${params.category.toUpperCase()}_NOTICE`) || 'NOTICE',
    title: sanitizeLogLine(params.title) || 'Diagnostic Notice',
    summary: sanitizeLogLine(params.summary) || 'An operation could not complete.',
    details,
  };
}
