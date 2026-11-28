import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizeBugText,
  validateBugReportPayload,
  validateBugReportStatusUpdate,
} from '../src/lib/bugReport.ts';

test('validateBugReportPayload accepts valid bug reports with defaults', () => {
  const result = validateBugReportPayload({
    category: 'audio_pitch',
    title: 'Open E string pitch jumps an octave',
    description: 'When plucking softly on Lesson 1-1,\nmeter briefly shows E3 instead of E2.',
    reporterEmail: 'Player@Example.COM ',
    sessionId: 'sess_123456',
    pagePath: '/studio',
    lessonId: 'm1-1',
    locale: 'en',
    theme: 'dark',
    deviceType: 'desktop',
    viewport: '1440x900',
    diagnostics: [
      {
        timestamp: '12:00:01',
        category: 'audio',
        code: 'MIC_WARN',
        title: 'Input quiet',
        summary: 'RMS stayed below -55 dB',
        details: ['sampleRate=48000', 'token=eyJhbGciOiJIUzI1NiJ9.abcdefghijkl.signature'],
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.data.category, 'audio_pitch');
  assert.equal(result.data.reporterEmail, 'player@example.com');
  assert.equal(result.data.lessonId, 'm1-1');
  assert.equal(
    result.data.description,
    'When plucking softly on Lesson 1-1,\nmeter briefly shows E3 instead of E2.'
  );
  assert.equal(result.data.diagnostics.length, 1);
  assert.equal(
    result.data.diagnostics[0].details[1].includes('[REDACTED_JWT]'),
    true
  );
});

test('validateBugReportPayload rejects invalid category, short fields, or bad email', () => {
  assert.deepEqual(
    validateBugReportPayload({
      category: 'unknown_cat',
      title: 'Valid title',
      description: 'Valid description text',
    }),
    { ok: false, reason: 'invalid_category' }
  );

  assert.deepEqual(
    validateBugReportPayload({
      category: 'ui_layout',
      title: 'A',
      description: 'Valid description text',
    }),
    { ok: false, reason: 'invalid_title' }
  );

  assert.deepEqual(
    validateBugReportPayload({
      category: 'ui_layout',
      title: 'Button overlaps header',
      description: '1234',
    }),
    { ok: false, reason: 'invalid_description' }
  );

  assert.deepEqual(
    validateBugReportPayload({
      category: 'other',
      title: 'Button overlaps header',
      description: 'Details about the spacing issue',
      reporterEmail: 'not-an-email',
    }),
    { ok: false, reason: 'invalid_email' }
  );
});

test('sanitizeBugText redacts secrets and caps diagnostics to 15 items', () => {
  const cleaned = sanitizeBugText(
    'Failed at C:\\Users\\dev\\secret.ts with sb_secret_abc123456 and Bearer mytoken123',
    200
  );
  assert.equal(cleaned.includes('C:\\Users'), false);
  assert.equal(cleaned.includes('[LOCAL_PATH]'), true);
  assert.equal(cleaned.includes('[REDACTED_KEY]'), true);
  assert.equal(cleaned.includes('Bearer [REDACTED]'), true);

  const manyDiagnostics = Array.from({ length: 22 }, (_, i) => ({
    timestamp: `00:00:${String(i).padStart(2, '0')}`,
    category: 'runtime',
    code: 'ERR',
    title: `Entry ${i}`,
    summary: `Summary ${i}`,
    details: [],
  }));

  const res = validateBugReportPayload({
    category: 'other',
    title: 'Long diagnostic batch',
    description: 'Testing diagnostic array length limit',
    diagnostics: manyDiagnostics,
  });
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.diagnostics.length, 15);
  }
});

test('validateBugReportStatusUpdate validates UUID and status', () => {
  assert.deepEqual(
    validateBugReportStatusUpdate({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'resolved',
    }),
    {
      ok: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'resolved',
      },
    }
  );

  assert.deepEqual(
    validateBugReportStatusUpdate({
      id: 'bad-id',
      status: 'resolved',
    }),
    { ok: false, reason: 'invalid_id' }
  );

  assert.deepEqual(
    validateBugReportStatusUpdate({
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'closed',
    }),
    { ok: false, reason: 'invalid_status' }
  );
});
