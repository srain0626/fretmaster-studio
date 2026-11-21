# 06. Maintenance Runbook & Verification

## Standard CLI Commands (Windows PowerShell)

All commands run from the project root directory. Always use `;` instead of `&&` in Windows PowerShell 5.1.

```powershell
# 1. Production compile & TypeScript check (authoritative verification gate)
npm run build

# 2. Zero-emoji & zero-dingbat scan across src/ (must print 0)
node -e "const fs=require('fs'),path=require('path'); let hits=0; function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory())walk(p);else if(/\.(ts|tsx|css)$/.test(f)){const t=fs.readFileSync(p,'utf8'); const m=t.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g); if(m){hits+=m.length;console.log(p,m);}}}} walk('src'); console.log('Total emoji/dingbat hits:',hits);"

# 3. ESLint check
npm run lint

# 4. Development server (default port 3000)
npm run dev
```

*Note: `turbopack.root` is pinned in `next.config.ts` to prevent Next.js workspace-root lockfile warnings when a parent directory contains another `package-lock.json`.*

## Known Gotchas & Fast Diagnostics

| Symptom | Root Cause | Fix Location / Rule |
| :--- | :--- | :--- |
| Inactive HeroUI tabs appear white/invisible | HeroUI `@heroui/styles` reads `--muted` as text color while shadcn sets `--muted` to surface gray | Keep `.tabs__tab:not([data-selected="true"]) { color: var(--muted-foreground); }` in `src/app/globals.css` |
| Clicking Sound resets Remotion animation to `0:00` | Unstable `inputProps` identity triggered `<Player>` reset effect | Reset only on `resetKey` in `ExplainerVideoShell.tsx`; memoize `inputProps` in parent |
| TypeScript error on `playSingleGuitarNote(..., 'bend')` or `getIntervalLabel(semis)` | Wrong articulation union or missing `rootPitchClass` arg | Use `ArticulationType` (`'bend-full'`, `'hammer'`, `'pull'`, `'slide-up'`) and `getIntervalLabel(midi, rootPc)` |
| Unicode emoji/dingbat scan flags checkmarks (`✔`, `✘`, `✕`) | Dingbats U+2600–U+27BF are blocked by project clean-UI rule | Replace with Lucide icons or inline SVG `<path>` (`VectorStatusIcon`) |
| `AudioWorklet` fails to load microphone input | Unsecure origin (non-localhost HTTP) or missing permission | Serve on `http://localhost:3000` or HTTPS; fallback `AnalyserNode` auto-activates if worklet fails |
| PowerShell `node -e` fails with parser error on `&&` or single quotes | PowerShell treats `'` as string delimiter and lacks `&&` in v5.1 | Separate commands with `;` and double-quote outer JS scripts |

## Common Extension Playbooks

1. **Add or Edit a Lesson:** Read `docs/03-CURRICULUM.md` -> edit `src/data/lessonsPhase*.ts` -> keep unique `id` & valid `ArticulationType` -> run `npm run build`.
2. **Add an Explanation Video Variant:** Read `docs/05-ANIMATIONS.md` -> extend `HarmonyVariant` or `PostureVariant` union + `resolve*Variant` + `get*AudioCues` + SVG scene subcomponent using `var(--*)` colors -> verify Light/Dark modes & paused overlay spacing.
3. **Modify Styling or Components:** Read `docs/02-UI-SYSTEM.md` -> edit `src/app/globals.css` tokens or component classes -> verify both `:root` (Light) and `.dark` (Dark) palettes.
4. **Tune Pitch Detection / Scoring:** Read `docs/04-AUDIO-DSP.md` -> tune YIN thresholds in `public/worklets/guitarPitchWorklet.js` or `JUDGMENT_TIERS` in `src/lib/lowLatencyAudioEngine.ts`.

## Live Browser QA Checklist (After UI / Animation Changes)
1. Start `npm run dev` on `http://localhost:3000` (viewport `1440x900`).
2. Confirm `LessonGuideDialog` opens on first load with `전체 보기`, playing both Remotion explainers cleanly; verify Pause puts `▶ 재생` badge in clear top-right space with zero overlap.
3. Toggle Light / Dark / System theme in `CurriculumSidebar` -> check SVG contrast, fretboard, tabs, and dialogs in both themes.
4. Open Curriculum modal -> enable `자유 탐색` -> switch across Phase I (`1-1`, `1-2`), Phase II (`3-3`, `4-2`), Phase III (`6-3`), Phase IV (`9-1`..`9-4`) and verify context-aware controls update cleanly.
5. Confirm `0` browser console/page errors and `0` HTTP `>= 400` asset failures, then stop dev daemon and run final `npm run build`.
