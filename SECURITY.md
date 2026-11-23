# Security Policy

## Supported Versions

Security fixes are applied to the latest release on `main`.

| Version | Supported |
| :--- | :--- |
| `0.3.x` (`main`) | Yes |
| `< 0.3.0` | No |

## Scope

Areas of primary security relevance in FretMaster Studio include:

- **Authentication & Session Handling**: Supabase PKCE OAuth callback validation (`src/app/auth/callback/route.ts`, open-redirect sanitization on `next`) and SSR cookie refresh (`src/proxy.ts`).
- **Database Row-Level Security**: PostgreSQL policies in `supabase/schema.sql` isolating `profiles`, `user_progress`, `practice_sessions`, and admin-gated reads on `analytics_events`.
- **Admin Authorization**: Server-side verification in `src/lib/adminAuth.ts` and `/api/admin/*` routes.
- **Local WebSocket Bridge**: Client-side parsing and error boundaries around optional `ws://127.0.0.1:9420` telemetry packets in `src/lib/lowLatencyAudioEngine.ts`.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for undisclosed security vulnerabilities.

Instead, report vulnerabilities privately through [GitHub Private Vulnerability Reporting](https://github.com/srain0626/fretmaster-studio/security/advisories/new) on this repository (or contact the maintainer directly at `srain0626@gmail.com` if advisories are unavailable).

Include:

1. Affected route, file path, or SQL policy.
2. Step-by-step reproduction or proof of concept.
3. Potential impact (for example, cross-user data read, open redirect, or privilege escalation).

We aim to acknowledge reports within 72 hours and publish a fix before public disclosure.
