# 03. Curriculum Architecture (39 Lessons / 4 Phases)

## Pedagogical Framework

Integrates **Jamie Andreas** (zero-tension mechanics), **Berklee** (1-fret-per-finger & chord tones), **Edwin Gordon** (audiation / sound-before-fret), **Zoltan Kodaly** (movable intervals `R, b3, 4, 5, b7`), **Bruner Spiral Curriculum** (layered harmony concepts woven from Lesson `1-1` through `9-4`), and **Sweller Micro-Chunking** (1-2 bar focus loops).

### 5-Layer Spiral Harmony Progression (`HarmonyConcept.layerNumber`)
- **Layer 1 (Physiology & Distance):** Open string 4th intervals (`3G→2B` M3 exception), `+1F` half-step vs `+2F` whole-step, L-shaped octave geometry.
- **Layer 2 (Vertical Triads & Power Chords):** `1+5+8` consonance (3rd omitted), `M3 vs m3` 1-fret mood shift, `I - V - vi - IV` harmonic tension.
- **Layer 3 (Pentatonic & Relative Keys):** Am Pentatonic Pos 1 skeleton (`R-b3-4-5-b7`), Am vs C relative root flip, Pos 1→Pos 2 diagonal shifts.
- **Layer 4 (Color Notes & Full Scales):** Layering `2nd` + `b6th` onto Pentatonic, Blue Note `b5 → 4` tension resolution, 3NPS symmetry, Harmonic Minor `#7`.
- **Layer 5 (Voice Leading, Chord Tones & Expression):** Targeting 3rd/7th on chord transitions, pitch-exact bends (`+100c / +200c`), Call & Response, Ear Copy, `COMP ↔ SOLO` breathing.

## Module & Lesson Inventory (Exact IDs)

| Phase | Module | File | Lesson IDs (`code`) | Special Flags |
| :--- | :--- | :--- | :--- | :--- |
| `phase-1` | `mod-1` First Notes & Physics | `lessonsPhase1.ts` | `m1-1` (`1-1`) .. `m1-4` (`1-4` Checkpoint) | Beginner zoom, no backing |
| `phase-1` | `mod-2` Chromatic & 4-Finger Indep. | `lessonsPhase1.ts` | `m2-1` (`2-1`) .. `m2-4` (`2-4` Checkpoint) | Octave L-shape |
| `phase-2` | `mod-3` Power Chords, Triads, PM | `lessonsPhase2.ts` | `m3-1` (`3-1`) .. `m3-4` (`3-4` Checkpoint) | Chord dyads/triads |
| `phase-2` | `mod-4` Pentatonic & Relative Keys | `lessonsPhase2.ts` | `m4-1` (`4-1`) .. `m4-4` (`4-4` Checkpoint) | Relative Am/C box |
| `phase-2` | `mod-5` 7-Note Scales & Chord Tones | `lessonsPhase2.ts` | `m5-1` (`5-1`) .. `m5-4` (`5-4` Checkpoint) | Blue note, 3NPS |
| `phase-3` | `mod-6` Expressive Techniques | `lessonsPhase3.ts` | `m6-1` (`6-1`) .. `m6-4` (`6-4` Checkpoint) | H/P, Slide, Bend, Vib |
| `phase-3` | `mod-7` 5 Genres Harmony & Riffs | `lessonsPhase3.ts` | `m7-1` (`7-1`) .. `m7-5` (`7-5` Checkpoint) | Blues/Rock/Funk/Metal/Jazz |
| `phase-3` | `mod-8` Famous Solos Breakdown | `lessonsPhase3.ts` | `m8-1` (`8-1`) .. `m8-6` (`8-6` Checkpoint) | Full 0-22F zoom toggle |
| `phase-4` | `mod-9` Ear Copy, Comp & Improv | `lessonsPhase4.ts` | `m9-1` (`9-1`), `m9-2` (`9-2`) | `supportsEarCopy: true` |
| `phase-4` | `mod-9` Ear Copy, Comp & Improv | `lessonsPhase4.ts` | `m9-3` (`9-3`), `m9-4` (`9-4`) | `supportsJam: true` |

Export aggregator: `src/data/curriculumData.ts` (`ALL_LESSONS`, `MODULES`, `CATEGORY_LABELS`, `getLessonById`, `getNextLesson`, `getModuleById`).

## Unlock & Mastery Rules

- **Sequential Unlock (`CurriculumSidebar.tsx`):** `m1-1` (`globalIdx === 0`) is always unlocked. Lesson `N` unlocks when `progress.lessonRecords[ALL_LESSONS[N-1].id]?.completed === true` OR `progress.freeExploreMode === true`.
- **Exam Passing (`page.tsx` `finalizeExamSession`):** Passes when `score >= JUDGMENT_TIERS[judgmentTier].minPassScore` (`70/80/85/90`). Passing sets `completed = true`, bumps skills `+4` (retry bumps `+1`), updates `bestBpm`, and unlocks `getNextLesson(lesson.id)`.

## Core Authoring Schema & Helpers

Key types in `src/types/guitar.ts`:
- `Lesson`: `{ id, moduleId, phaseId, orderInModule, code, title, subtitle, category, difficulty, isCheckpoint, defaultBpm, minBpm, maxBpm, recommendedAmp, beatsPerBar, totalBars, focusFretRange, pedagogyTags, harmonyConcept, postureGuide, scaleOverlay, chordProgression, notes, supportsEarCopy?, supportsJam?, jamPrompt? }`
- `NoteEvent`: `{ id, string: 1..6, fret, finger: 0..4, pick: 'D'|'U'|'H'|'P'|'S'|'T', technique: ArticulationType, bendCents?, slideToFret?, beatStart, durationBeats, intervalLabel, chordContext?, chordDegree?, anchorFinger?, chordNotes?, coachingNote? }`

Factories in `src/data/curriculumHelpers.ts`:
- `buildNotes(prefix, rootPitchClass, items: NoteInput[])`: Auto-generates sequential `id`, alternating `D`/`U` pick defaults, and MIDI-derived `intervalLabel`.
- `makeChordBar(...)` + `CHORD_TEMPLATES`: Standard chord voicings & pitch-class sets.
- Built-in overlays: `AM_PENTA_BOX1`, `C_MAJOR_PENTA_BOX`, `AM_FULL_SCALE_OVERLAY`, `A_BLUES_BOX1`.

### Recipe: Adding a New Lesson
1. Add object to appropriate `src/data/lessonsPhase*.ts` (using `buildNotes` & `CHORD_TEMPLATES`).
2. Keep `id` unique and `orderInModule` contiguous (`ALL_LESSONS` preserves array order for unlock chain).
3. Update `LessonGuideDialog` animation resolvers in `docs/05-ANIMATIONS.md` target files if the lesson introduces a brand-new posture/harmony mechanic (otherwise layer defaults apply automatically).
4. Run `npm run build` to verify TypeScript exhaustiveness.
