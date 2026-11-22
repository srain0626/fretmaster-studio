import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/loadTs.mjs';

describe('Admin Authorization & Telemetry Validation', () => {
  const { isAdminEmail, getAdminEmailAllowlist, validateTelemetryPayload } = loadTsModule(
    'src/lib/adminAuth.ts'
  );

  test('authorizes srain0626@gmail.com case-insensitively and honors ADMIN_EMAILS override', () => {
    const prevEnv = process.env.ADMIN_EMAILS;
    try {
      delete process.env.ADMIN_EMAILS;
      assert.equal(isAdminEmail('srain0626@gmail.com'), true);
      assert.equal(isAdminEmail('  SRAIN0626@GMAIL.COM  '), true);
      assert.equal(isAdminEmail('other.user@gmail.com'), false);
      assert.equal(isAdminEmail(null), false);
      assert.equal(isAdminEmail(''), false);

      process.env.ADMIN_EMAILS = 'team.lead@example.com, co-admin@example.org';
      const allowlist = getAdminEmailAllowlist();
      assert.ok(allowlist.includes('srain0626@gmail.com'));
      assert.ok(allowlist.includes('team.lead@example.com'));
      assert.ok(allowlist.includes('co-admin@example.org'));
      assert.equal(isAdminEmail('Team.Lead@Example.com'), true);
      assert.equal(isAdminEmail('stranger@example.com'), false);
    } finally {
      if (prevEnv === undefined) {
        delete process.env.ADMIN_EMAILS;
      } else {
        process.env.ADMIN_EMAILS = prevEnv;
      }
    }
  });

  test('validates telemetry payloads and rejects malformed events or oversized metadata', () => {
    const valid = validateTelemetryPayload({
      eventName: 'lesson_selected',
      sessionId: 'sess-1234-abcd',
      pagePath: '/studio',
      locale: 'ko',
      theme: 'dark',
      deviceType: 'desktop',
      viewport: '1440x900',
      referrerHost: 'google.com',
      metadata: {
        lesson_id: 'm1-1',
        score: 96,
        passed: true,
      },
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.data.eventName, 'lesson_selected');
      assert.equal(valid.data.lessonId, 'm1-1');
      assert.equal(valid.data.locale, 'ko');
      assert.equal(valid.data.theme, 'dark');
      assert.equal(valid.data.deviceType, 'desktop');
    }

    const badEvent = validateTelemetryPayload({
      eventName: 'BAD EVENT NAME!',
      sessionId: 'sess-1234',
    });
    assert.equal(badEvent.ok, false);

    const badSession = validateTelemetryPayload({
      eventName: 'page_view',
      sessionId: 'x',
    });
    assert.equal(badSession.ok, false);

    const badPath = validateTelemetryPayload({
      eventName: 'page_view',
      sessionId: 'sess-1234',
      pagePath: 'https://evil.example',
    });
    assert.equal(badPath.ok, false);

    const hugeMeta = validateTelemetryPayload({
      eventName: 'exam_completed',
      sessionId: 'sess-1234',
      metadata: {
        blob: 'a'.repeat(230),
        b2: 'b'.repeat(230),
        b3: 'c'.repeat(230),
        b4: 'd'.repeat(230),
        b5: 'e'.repeat(230),
        b6: 'f'.repeat(230),
        b7: 'g'.repeat(230),
        b8: 'h'.repeat(230),
        b9: 'i'.repeat(230),
        b10: 'j'.repeat(230),
      },
    });
    assert.equal(hugeMeta.ok, false);

    const unknownValues = validateTelemetryPayload({
      eventName: 'page_view',
      sessionId: 'sess-5678',
      locale: 'fr',
      theme: 'sepia',
      deviceType: 'watch',
    });
    assert.equal(unknownValues.ok, true);
    if (unknownValues.ok) {
      assert.equal(unknownValues.data.locale, 'unknown');
      assert.equal(unknownValues.data.theme, 'unknown');
      assert.equal(unknownValues.data.deviceType, 'unknown');
    }
  });
});
