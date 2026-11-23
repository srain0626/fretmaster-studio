import type {
  HarmonyConcept,
  Lesson,
  LessonCategory,
  ModuleInfo,
  PostureGuide,
} from '@/types/guitar';
import type { Locale } from '@/lib/i18n';
import { COACHING_NOTES_EN } from './coachingNotesEn';

export const CATEGORY_LABELS_EN: Record<'all' | LessonCategory, string> = {
  all: 'All Curriculum',
  mechanics: 'Fingering & Picking',
  chords: 'Chords & Rhythm',
  scales: 'Scales & Harmony',
  techniques: 'Techniques',
  genres: 'Genre Academy',
  solos: 'Famous Solos',
  expression: 'Ear Copy & Improv',
};

export const MODULES_EN: Record<string, Partial<ModuleInfo>> = {
  'mod-1': {
    phaseTitle: 'Phase I · Foundations & Mechanics',
    title: 'First Notes & Fretboard Physics',
    pedagogyBasis: 'Jamie Andreas Tension-Free Mechanics + Edwin Gordon Audiation',
    summary:
      'Vertical fingertip placement on open strings and fingers 1-3, anchor finger stability, and physical half/whole-step distance.',
  },
  'mod-2': {
    phaseTitle: 'Phase I · Foundations & Mechanics',
    title: 'Chromatic Mechanics & Independence',
    pedagogyBasis: 'Berklee Position Playing (1 Fret = 1 Finger) + Troy Grady Picking',
    summary:
      'Pinky independence, 1-3-2-4 permutations, clean string crossing, and octave geometry across the neck.',
  },
  'mod-3': {
    phaseTitle: 'Phase II · Core Chords & Scale Harmony',
    title: 'Power Chords, Triads & Rhythm Pocket',
    pedagogyBasis: 'Berklee Rhythm Control + Harmonic Acoustics (1+5 vs 3rd)',
    summary:
      'Power chord 1+5 consonance, index touch-muting, palm-mute dynamics, and Major vs Minor triad contrast.',
  },
  'mod-4': {
    phaseTitle: 'Phase II · Core Chords & Scale Harmony',
    title: 'Pentatonic Mastery & Relative Keys',
    pedagogyBasis: 'CAGED Vertical Box + Kodaly Movable Scale Degrees (R, b3, 4, 5, b7)',
    summary:
      'Standard Am Pentatonic Box 1 fingering, A Minor / C Major relative root shifting, slide shifts, and index rolling.',
  },
  'mod-5': {
    phaseTitle: 'Phase II · Core Chords & Scale Harmony',
    title: 'Full Scales, 3NPS & Chord-Tone Targeting',
    pedagogyBasis: 'Layered Harmony Expansion (5 Notes + 2 Color Tones) + 3NPS Symmetry',
    summary:
      'Turning pentatonic shapes into 7-note diatonic scales, blues b5 resolution, 3NPS patterns, and landing on chord tones.',
  },
  'mod-6': {
    phaseTitle: 'Phase III · Expressive Tech, Genres & Solos',
    title: 'Expressive Articulation & Harmonic Bends',
    pedagogyBasis: '3-Finger Stacked Biomechanics + Target-Pitch Harmonic Bending',
    summary:
      'Hammer-on & pull-off legato, eye-lead shifting slides, pitch-accurate +100c/+200c bends, vibrato, and double stops.',
  },
  'mod-7': {
    phaseTitle: 'Phase III · Expressive Tech, Genres & Solos',
    title: 'Genre Harmony, Comping & Riffs',
    pedagogyBasis: 'Triad Voice Leading + Shell Voicings (R-3-7) + Genre Rhythm Pockets',
    summary:
      'Blues 12-bar call & response, Classic Rock Mixolydian riffs, Pop/Funk high triad inversions, Metal pedal points, and Neo-Soul/Jazz shells.',
  },
  'mod-8': {
    phaseTitle: 'Phase III · Expressive Tech, Genres & Solos',
    title: 'Famous Solos Breakdown (Lv.1-6)',
    pedagogyBasis: 'Cognitive Micro-Chunking + Harmonic Degree Mapping Over Chords',
    summary:
      'Step-by-step mastery from slow melodic ballad solos up to B.B. King, David Gilmour, Slash, Jimmy Page, and Eric Johnson phrasing.',
  },
  'mod-9': {
    phaseTitle: 'Phase IV · Ear Copy, Comping & Improv Lab',
    title: 'Ear Copy, Comping & Improvisation Lab',
    pedagogyBasis: 'Gordon Ear-to-Hand Loop + Bruner Spiral Integration',
    summary:
      'Blind TAB transcription in Box 1, bass-root progression ear copy, drum/bass comping jam, and live solo phrasing with hum mapping.',
  },
};

export interface LessonTranslation {
  title: string;
  jamPrompt?: string;
  harmonyConcept: Partial<HarmonyConcept>;
  postureGuide: PostureGuide;
}

export const LESSONS_EN: Record<string, LessonTranslation> = {
  'm1-1': {
    title: 'The 6 Open Strings & Down/Up Picking Pendulum',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Physics of Strings & Tuning Intervals',
      formula: '6(E2) - 5(A2) - 4(D3) - 3(G3) - 2(B3) - 1(E4)',
      explanation:
        'Strings 6 down to 2 are tuned in Perfect 4ths (5 frets apart), except between the 3rd string (G) and 2nd string (B), which is a Major 3rd (4 frets). Low E2 and High E4 frame the guitar two octaves apart.',
      earTip:
        'Listen as the resonance of the open 6th string (Low E) and 1st string (High E) locks together like one unified pitch.',
    },
    postureGuide: {
      thumbPosition:
        'Drape left fingers lightly across strings to mute; rest right palm edge gently near the bridge saddles.',
      leftHandTip:
        'Open strings ring out for a long time. Lightly touch the previously played string with your left fingers or right palm edge as you move to the next string for cleaner tone and pitch tracking.',
      rightHandTip:
        'Tilt the pick edge ~45 degrees to the string so Down (D) and Up (U) strokes glide cleanly like a pendulum.',
      commonMistake:
        'Leaving the previous open string (especially thick 6th/5th bass strings) ringing while picking the next string, or digging the pick too deep',
      fixAction:
        'Always damp the previous string with your left fingers or right palm edge before crossing strings, and slice only 2-3mm deep from the wrist.',
    },
  },
  'm1-2': {
    title: 'Buzz-Free First Frets: Index, Middle, Ring & Half/Whole Steps',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Half-Steps (1 Fret) & Whole-Steps (2 Frets)',
      formula: '1 Fret = Half-Step · 2 Frets = Whole-Step',
      explanation:
        'Just like E-F and B-C have no black key between them on a piano, open 1st string (E) to Fret 1 (F) is a 1-fret Half-Step, while Fret 1 (F) to Fret 3 (G) is a 2-fret Whole-Step.',
      earTip:
        'Notice the tight pull of the 0F→1F half-step versus the open, spacious lift of the 1F→3F whole-step.',
    },
    postureGuide: {
      thumbPosition: 'Place your thumb pad lightly behind the center of the neck opposite Fret 2.',
      leftHandTip:
        'Press just 2mm behind the right-side fretwire crown with an upright fingertip, not in the center of the fret slot.',
      rightHandTip: 'Alternate down and up strokes evenly without pulling the 1st string off the neck edge.',
      commonMistake: 'Pressing the far left side of a fret space, causing fret buzz or collapsed finger joints',
      fixAction:
        'Drop your wrist slightly forward so your first knuckle arches clearly, landing just behind the fretwire.',
    },
  },
  'm1-3': {
    title: 'Anchor Finger Law & 1-2-3 Chromatic Walking',
    harmonyConcept: {
      layerTitle: 'Layer 1 · 1 Fret = 1 Chromatic Half-Step Ladder',
      formula: '5F(A) → 6F(A#) → 7F(B) : Chromatic Half-Step Climb',
      explanation:
        'Moving one fret at a time (Index 5F -> Middle 6F -> Ring 7F) maps directly to chromatic half-steps, training your fingers to feel equal pitch spacing.',
      earTip:
        'Listen for seamless sustain from one half-step to the next with zero silent gaps between notes.',
    },
    postureGuide: {
      thumbPosition: 'Anchor your thumb behind Fret 6 center so fingers 1, 2, and 3 stretch evenly.',
      leftHandTip:
        'Keep Index pinned on 5F when Middle lands on 6F, and keep both pinned when Ring presses 7F (Anchor Finger).',
      rightHandTip: 'Synchronize alternate Down-Up picks cleanly with each left-hand finger change.',
      commonMistake: 'Popping earlier fingers up off the board on every ascent, causing clumsy descents',
      fixAction:
        'Keep fingers 1-2-3 planted while ascending; only lift Ring then Middle one at a time on the way down.',
    },
  },
  'm1-4': {
    title: '[Module 1 Test] First 3-Finger Single-Note Rock Riff',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Core Rock Riff Intervals (R - b3 - 4)',
      formula: 'E(R) → G(b3, +3F) → A(4, +5F) → G(b3) → E(R)',
      explanation:
        'Iconic rock riffs do not need 7-note scales; they build heavy groove from three fundamental intervals: Root (E), Minor 3rd (G), and Perfect 4th (A).',
      earTip:
        'Feel how Minor 3rd (G) creates dark rock tension before locking solidly back onto Root (E).',
    },
    postureGuide: {
      thumbPosition: 'Keep your thumb steady behind Fret 4 rather than sliding back and forth on 3-5F leaps.',
      leftHandTip:
        'Release pressure slightly right after each note ends to keep sustain clean without muddy overlap (staccato mute).',
      rightHandTip: 'Accent beat 1 Root E with a decisive downstroke to lock in the riff pocket.',
      commonMistake: 'Leaving open strings 4 or 3 ringing after moving to the next note',
      fixAction: 'Lightly relax and drape your fretting finger over the string before lifting to kill stray ring.',
    },
  },
  'm2-1': {
    title: 'Waking Up the Pinky: 1-2-3-4 Chromatic Spider Walk',
    harmonyConcept: {
      layerTitle: 'Layer 1 · 12-Tone Chromatic Span & Finger Distance',
      formula: '1(5F: R) - 2(6F: b2) - 3(7F: 2) - 4(8F: b3)',
      explanation:
        'Framing 4 fingers across Frets 5-8 sets Index-to-Pinky distance to an exact Minor 3rd (3 frets)—the exact outer frame of Pentatonic Box 1.',
      earTip: 'Aim for identical tone volume across every finger, especially your weaker Pinky (4).',
    },
    postureGuide: {
      thumbPosition: 'Center your thumb behind Frets 6-7 so Index (5F) and Pinky (8F) reach equally.',
      leftHandTip:
        'Hover unused fingers within 1cm of the strings rather than letting your Pinky fly away into the air.',
      rightHandTip: 'Keep strict D-U-D-U alternate picking: odd notes down, even notes up.',
      commonMistake: 'Clamping the palm against the underside of the neck when the Pinky feels weak',
      fixAction: 'Maintain an open egg-sized gap between palm and lower neck edge at all times.',
    },
  },
  'm2-2': {
    title: 'Ring & Pinky Neural Split: 1-3-2-4 & 1-4-2-3 Permutations',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Whole-Step Twin Intervals (1-3 & 2-4)',
      formula: '1→3 (Whole Step) · 2→4 (Whole Step) · 1→4 (Minor 3rd)',
      explanation:
        'Permutations train finger independence while encoding real scale leaps: 1-3 and 2-4 both equal one Whole Step (Major 2nd).',
      earTip:
        'Contrast the zigzagging melodic contour against the straight chromatic climb of Lesson 2-1.',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb and wrist rock-steady while fingers cross in permutations.',
      leftHandTip:
        'When Ring (3) presses down, consciously keep Pinky (4) relaxed and hovering close to Fret 8.',
      rightHandTip: 'Maintain steady Down-Up picking even across string shifts.',
      commonMistake: 'Pinky straightening stiffly outward every time Ring finger engages',
      fixAction: 'Practice slowly keeping Pinky within 1.5cm of the fretboard throughout every leap.',
    },
  },
  'm2-3': {
    title: 'String Crossing & Inside / Outside Alternate Picking',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Ascending Perfect 4ths Across the Neck',
      formula: '6(5F:A) → 5(5F:D) → 4(5F:G) → 3(5F:C) : Straight Fret = P4 Steps',
      explanation:
        'Moving across adjacent strings at the same 5th fret climbs in Perfect 4ths (A → D → G → C). Remember only string 3→2 narrows to a Major 3rd.',
      earTip: 'Listen for crisp separation on string switches without hitting neighboring open strings.',
    },
    postureGuide: {
      thumbPosition: 'Keep your thumb centered on the neck back so all 6 strings stay comfortably reachable.',
      leftHandTip: 'Gently damp the previous string with fingertip edge or picking palm as you move.',
      rightHandTip: 'Use subtle pick slanting so the pick escapes cleanly between adjacent strings.',
      commonMistake: 'Right hand picking the next string milliseconds before the left finger arrives',
      fixAction: 'Slow down and ensure left fingertip seats on the fret a fraction before the pick strikes.',
    },
  },
  'm2-4': {
    title: '[Module 2 Test] String Skipping & Fretboard Octave Geometry',
    harmonyConcept: {
      layerTitle: 'Layer 1 · Universal Fretboard Octave L-Shape',
      formula: 'From Strings 6/5: [2 Strings Down + 2 Frets Right] = 1 Octave!',
      explanation:
        'Skipping one string and shifting 2 frets right from strings 6 or 5 always yields an exact Octave. From strings 4 or 3, shift +3 frets right to compensate for the B string.',
      earTip: 'Hear how both skipped notes ring with the exact same pitch name in two registers.',
    },
    postureGuide: {
      thumbPosition: 'Hold thumb steady behind the center of the octave box position.',
      leftHandTip:
        'Let the underside of your Index lightly mute the skipped middle string while playing octaves.',
      rightHandTip: 'Pivot from a compact wrist angle to skip strings cleanly without large arm swings.',
      commonMistake: 'Using only +2 frets when crossing onto string 2 or 1, landing a dissonant minor 7th',
      fixAction: 'Lock in the rule: +2 frets from strings 6/5, +3 frets whenever crossing string 2.',
    },
  },
  'm3-1': {
    title: 'Power Chords (1-3-4 Grip) & Index String Muting',
    harmonyConcept: {
      layerTitle: 'Layer 2 · Distortion-Friendly Power Chord (1 + 5 + 8)',
      formula: 'Power Chord (5) = Root(1) + Perfect 5th(5) + Octave(8)',
      explanation:
        'With heavy gain, 3rd intervals create intermodulation mud. Omitting the 3rd leaves pure 1+5+8 overtones that punch cleanly through a mix.',
      earTip:
        'Notice the neutral, muscular power of A5—neither happy Major nor sad Minor—against backing drums.',
    },
    postureGuide: {
      thumbPosition: 'Drop thumb below center rear neck so fingers 1, 3, and 4 apply balanced pressure.',
      leftHandTip:
        'Fret the root with your Index tip while lightly draping its flat underside over strings 1-3 to mute stray noise.',
      rightHandTip: 'Compactly strum only the lowest 3 target strings rather than all 6 strings.',
      commonMistake: 'Unmuted open treble strings ringing into messy dissonance under distortion',
      fixAction: 'Flatten your Index slightly past string 5 so its belly dampens strings 1, 2, and 3.',
    },
  },
  'm3-2': {
    title: 'Right-Hand Palm Mute & 8th-Note Dynamic Accents',
    harmonyConcept: {
      layerTitle: 'Layer 2 · Rhythm Texture & Open Accent Contrast',
      formula: 'PM (Damped Low 8ths) → Open Accent (Explosive Release)',
      explanation:
        'Controlling sustain with your palm heel turns one E5 chord into two instruments: tight kick-drum bass chugs vs wide-open chorus hits.',
      earTip: 'Ensure sharp dynamic contrast between chugged "chug-chug" eighths and full open accents.',
    },
    postureGuide: {
      thumbPosition: 'Maintain a relaxed E5 grip on 5th string Fret 2.',
      leftHandTip: 'Keep the Index fingertip lightly touching string 6 to block unwanted rumble.',
      rightHandTip: 'Rest the pinky side of your palm right over the bridge saddle termination (2mm ahead).',
      commonMistake: 'Sliding the palm too far toward the neck pickup, killing all musical pitch',
      fixAction: 'Slide your palm back toward the bridge saddle until low punch and clear pitch balance.',
    },
  },
  'm3-3': {
    title: 'Adding Emotion to Chords: Major vs Minor Triads',
    harmonyConcept: {
      layerTitle: 'Layer 2 · One Fret on the 3rd Flips Major to Minor',
      formula: 'Major Triad = R - M3 - P5 | Minor Triad = R - m3(b3) - P5',
      explanation:
        'In an A Major triad (7-6-5), Fret 6 on the 3rd string is Major 3rd (C#). Lowering just that finger 1 fret to 5F (C) transforms it instantly into Minor.',
      earTip: 'Feel the emotional shift as the 3rd string drops one half-step from C# to C.',
    },
    postureGuide: {
      thumbPosition: 'Place thumb comfortably opposite Fret 6 for narrow 3-string triad voicings.',
      leftHandTip:
        'Arpeggiate A Major cleanly (1-2-3 staircase), then flatten Index across 3rd & 2nd strings 5F for A Minor.',
      rightHandTip: 'Pick one string at a time on Clean preset so all three harmony voices ring separately.',
      commonMistake: '3rd string finger leaning into the 2nd string and choking the 5th (E)',
      fixAction: 'Arch fingertips vertically like bridges so every lower string vibrates freely.',
    },
  },
  'm3-4': {
    title: '[Module 3 Test] I - V - vi - IV Pop & Rock Rhythm Progression',
    harmonyConcept: {
      layerTitle: 'Layer 2 · Functional Harmony Axes (Tonic · Dominant · Subdominant)',
      formula: 'C(I: Home) → G(V: Tension) → Am(vi: Lyrical) → F(IV: Lift)',
      explanation:
        'I-V-vi-IV drives countless classics: Home stability (C), forward pull (G), emotional shade (Am), and warm lift (F) leading back home.',
      earTip: 'Feel the sense of arrival when Bar 4 (F) loops smoothly back into Bar 1 (C).',
    },
    postureGuide: {
      thumbPosition: 'Let your thumb glide lightly with power-chord shifts without squeezing.',
      leftHandTip: 'Keep unwanted open strings muted when hopping between 5th-string and 6th-string roots.',
      rightHandTip: 'Drive beats 1-2 with solid strums and subdivide beats 3-4 cleanly.',
      commonMistake: 'Holding the old chord until the very last millisecond, arriving late on beat 1',
      fixAction: 'Release slightly on the final "&" of beat 4 so your grip lands early on beat 1.',
    },
  },
  'm4-1': {
    title: 'Golden Key of the Fretboard: A Minor Pentatonic Box 1',
    harmonyConcept: {
      layerTitle: 'Layer 3 · Am7 Chord Tones + Safe Passing Note (4th)',
      formula: 'A(R) - C(b3) - D(4) - E(5) - G(b7) : Am7 + 4th',
      explanation:
        'Pentatonic removes both clashing half-step tensions (2nd and b6th), leaving 5 foolproof notes around Am7 that fit any rock or blues groove.',
      earTip: 'Memorize how all three Root A nodes (6str 5F, 4str 7F, 1str 5F) feel like "home."',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb centered behind Frets 6-7 aligned with your 5F Index anchor.',
      leftHandTip:
        'Strictly use [1-4] on strings 6, 2, 1 and [1-3] on strings 5, 4, 3 — never substitute Ring for Pinky on 8F.',
      rightHandTip: 'Maintain uniform D-U alternate picking across every two-notes-per-string step.',
      commonMistake: 'Stretching Ring finger to play Fret 8 instead of training Pinky (4)',
      fixAction: 'Commit to Pinky on every 8th-fret note now; future bends and sequences depend on it.',
    },
  },
  'm4-2': {
    title: 'One Box, Two Moods: A Minor vs C Major Relative Keys',
    harmonyConcept: {
      layerTitle: 'Layer 3 · Relative Major & Minor Root Shift',
      formula: 'Am (A-C-D-E-G) === C Major (C-D-E-G-A) · 100% Same Fret Dots!',
      explanation:
        'A Minor and C Major Pentatonic share the exact same 5-8F dots. Landing phrases on A sounds bluesy/minor; landing on C turns the exact shape bright and upbeat.',
      earTip: 'Contrast Bars 1-2 resolving on Root A with Bars 3-4 resolving brightly on Root C.',
    },
    postureGuide: {
      thumbPosition: 'Stay anchored in the 5-8F Box 1 hand position throughout both keys.',
      leftHandTip: 'Track Index (5F = A) and Pinky / 3rd string 5F (= C) visually as shifting home targets.',
      rightHandTip: 'Sustain target root endings slightly longer to hear the tonal shift clearly.',
      commonMistake: 'Habitually resting on A when the backing track changes to C Major',
      fixAction: 'Follow chord bars visually and aim directly for 8F or 3rd string 5F (C) over C chords.',
    },
  },
  'm4-3': {
    title: 'Breaking Out of the Box: Pos 1 to Pos 2 Diagonal Slide',
    harmonyConcept: {
      layerTitle: 'Layer 3 · Diagonal Pentatonic Highway Across Positions',
      formula: 'Pos 1 (5-8F) ──(3rd str 7F→9F Slide)──▶ Pos 2 (8-10F)',
      explanation:
        'Sliding your Ring finger from 3rd string 7F (D) to 9F (E) unlocks the singing upper sweet spot of Box 2 (8-10F) seamlessly.',
      earTip: 'Hear the bright register expansion as you climb onto 2nd string 10F high Root A.',
    },
    postureGuide: {
      thumbPosition: 'Slide your thumb smoothly +2 frets alongside your Ring finger into 8-10F center.',
      leftHandTip:
        'Immediately shift your frame after the slide so Index covers 8F and Ring covers 10F naturally.',
      rightHandTip: 'Do not re-pick on arrival; let one pick stroke fuel the entire slide.',
      commonMistake: 'Keeping Index back at 5F and over-stretching Ring/Pinky for 10F notes',
      fixAction: 'Treat a slide as relocating your entire hand and thumb into the new position.',
    },
  },
  'm4-4': {
    title: '[Module 4 Test] 4-Note Staircase Sequence & Index Rolling',
    harmonyConcept: {
      layerTitle: 'Layer 3 · Melodic Sequences Turning Scales into Phrases',
      formula: '4-Note Descending Sequence (Step 1-2-3-4 → Drop One Degree & Repeat)',
      explanation:
        'Pro solos rarely run straight up and down scales; overlapping 4-note rhythmic cells creates momentum and musical phrasing.',
      earTip: 'Listen for rhythmic drive AND crisp separation between adjacent 5th-fret strings.',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb steady behind neck center so your Index knuckle flexes smoothly.',
      leftHandTip:
        'Roll your Index fingertip pad smoothly between 2nd & 3rd strings on Fret 5 instead of lifting or letting both ring.',
      rightHandTip: 'Play each 4-note cell cleanly with steady D-U-D-U wrist motion.',
      commonMistake: 'Flat bar across Fret 5 causing two strings to bleed together like a chord',
      fixAction: 'Tilt onto your fingertip for string 2, then stand/drop your joint slightly to shift cleanly to string 3.',
    },
  },
  'm5-1': {
    title: 'Just Add 2 Notes: Full 7-Note A Natural Minor Scale',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Pentatonic Skeleton + 2 Color Tones (2nd & b6th)',
      formula: 'Am Penta (R, b3, 4, 5, b7) + [2nd B] + [b6th F] = Natural Minor',
      explanation:
        'Keep your 5-8F Pentatonic map intact and drop in just two color tones—2nd (B) and b6th (F)—to unlock sweeping 7-note minor harmony.',
      earTip:
        'Hear how the half-step pull from b6 (F on 2nd str 6F) down to 5th (E on 5F) creates aching ballad emotion.',
    },
    postureGuide: {
      thumbPosition: 'Place thumb behind 6-7F center for easy 4-finger coverage across 5-9F.',
      leftHandTip: 'Use Middle (2) specifically for the new color tone F at 2nd string Fret 6.',
      rightHandTip: 'Give passing color tones expressive touch and let half-step resolutions sing.',
      commonMistake: 'Re-memorizing Natural Minor from scratch as an unrelated box shape',
      fixAction: 'Always anchor on the 5 Pentatonic skeleton notes first and layer the 2 extra colors onto them.',
    },
  },
  'm5-2': {
    title: 'Soul of the Blues: Blue Note (b5) & Chromatic Resolution',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Turning Tritone Tension (b5) into Blues Gold',
      formula: '5(E) → b5(Eb: Tension!) → 4(D: Release) → b3(C) → R(A)',
      explanation:
        'Sitting dead center between the 4th and 5th, the flat-5th Blue Note adds unmistakable grit—as long as it slides or resolves into a safe neighboring note.',
      earTip: 'Feel the spicy tension at 3rd string 8F (Eb) melt cleanly as you step back to 7F (D).',
    },
    postureGuide: {
      thumbPosition: 'Hold steady 5-8F Box 1 posture.',
      leftHandTip: 'Fret 5th str 6F (b5) with Middle (2) and 3rd str 8F (b5) with Pinky (4) per 1-fret-1-finger rule.',
      rightHandTip: 'Treat b5 as a light passing stroke; place stronger pick weight on the resolved 4th or 5th.',
      commonMistake: 'Stopping and sustaining long on the unstable b5 tritone',
      fixAction: 'Always push or step immediately one fret up (5th) or down (4th) after touching b5.',
    },
  },
  'm5-3': {
    title: 'Highway to Speed: 3-Notes-Per-String (3NPS)',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Symmetrical 3NPS Picking & Neck-Wide Reach',
      formula: '1-3-4 (5-7-8F: W+H) · 1-2-4 (5-6-8F / 5-7-9F)',
      explanation:
        'Placing exactly three notes on every string makes alternate-picking crossings completely predictable, letting your hands glide across octaves effortlessly.',
      earTip: 'Listen for smooth, continuous triplet/sixteenth flow across string transitions.',
    },
    postureGuide: {
      thumbPosition: 'Lower your thumb farther down the neck back to open hand span for wide stretches.',
      leftHandTip: 'Use [1-3-4] on 5-7-8F and [1-2-4] for wider 5-7-9F stretches cleanly.',
      rightHandTip: 'Keep picking strictly alternating D-U-D on string A followed by U-D-U on string D.',
      commonMistake: 'Pinching Index and Middle tightly so Pinky falls short of Fret 9',
      fixAction: 'Rotate your wrist slightly outward and lean Index gently left to open finger spacing.',
    },
  },
  'm5-4': {
    title: '[Module 5 Test] Landing on Chord Tones Across Changes',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Moving from Scale Running to Chord-Tone Soloing',
      formula: 'Am(C:b3) → Dm(F:b3) → E7(G#:M3!) → Am(A:Root)',
      explanation:
        'True soloing outlines the chords underneath: strike F (Dm 3rd) over Dm, and shift up to G# (Harmonic Minor leading tone / E7 Major 3rd) over E7 before resolving to A.',
      earTip: 'Hear the thrilling magnetic pull from Bar 3 G# (4th str 6F) into Bar 4 A (7F).',
    },
    postureGuide: {
      thumbPosition: 'Stay centered at Fret 5 so 6F (F / G#) color targets fall directly under Middle (2).',
      leftHandTip: 'Use Middle (2) on 4th str 6F (G#) over E7, gliding up one fret to Ring (3) on 7F (A).',
      rightHandTip: 'Give beat 1 chord-tone arrivals clean, confident pick articulation.',
      commonMistake: 'Holding G natural (5F) over E7, clashing sharply with the chord G#',
      fixAction: 'Watch the chord banner for V7 (E7) and raise G half a step to G# (6F).',
    },
  },
  'm6-1': {
    title: 'Singing Without Picks: Hammer-On (H) & Pull-Off (P) Legato',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Vocal Phrase Connection Through Legato',
      formula: '5F(R) ──H──▶ 7F(4) ──P──▶ 5F(b3) : Seamless Interval Flow',
      explanation:
        'Pickless Hammer-Ons and Pull-Offs turn mechanical alternate-picked steps into fluid, voice-like slurs with smooth harmonic decay.',
      earTip: 'Match the acoustic volume of hammered/pulled notes to at least 90% of your picked note.',
    },
    postureGuide: {
      thumbPosition: 'Brace thumb firmly behind Fret 6 center to counter left-hand hammering force.',
      leftHandTip:
        'Strike Hammer-Ons vertically like tiny hammers; execute Pull-Offs with a subtle downward snap-flick so the string sings.',
      rightHandTip: 'Rest right palm lightly over unused bass strings to keep legato noise-free.',
      commonMistake: 'Lifting straight up on Pull-Offs, causing faint dead notes',
      fixAction: 'Pluck the string slightly toward the floor with your fingertip as you release.',
    },
  },
  'm6-2': {
    title: 'Slides (/ \\) & Eye-Lead Position Shifting',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Bridging Low Positions to High Register Sweet Spots',
      formula: '3rd str 7F(4: D) ──/──▶ 9F(5: E) → 2nd str 10F(R) → 12F(2: B)',
      explanation:
        'Slides act as expressive bridges linking Box 1 directly to high-register melody zones (10-12F) with vocal continuity.',
      earTip: 'Verify the pitch locks dead center on your destination fret with zero wobble.',
    },
    postureGuide: {
      thumbPosition: 'Relax thumb clamping slightly so thumb and finger glide smoothly together.',
      leftHandTip: 'Lock your eyes onto the target fret (9F or 12F) half a beat BEFORE sliding.',
      rightHandTip: 'Pick only the starting note; keep steady fretting pressure until arrival.',
      commonMistake: 'Overshooting the target fret or losing pressure mid-slide',
      fixAction: 'Keep steady pressure against the fretwire and stare at your landing fret first.',
    },
  },
  'm6-3': {
    title: 'Bending Mastery: 3-Finger Support & Target Pitch (+200c)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Pitch-Targeted Bending to Harmonic Chord Tones',
      formula: '3rd str 7F(D) ──(+200c Full Bend)──▶ 9F(E: 5th) Target Lock!',
      explanation:
        'Bending is never random pulling—it is sailing from tension (D) to a harmonic chord tone target (E = +200 cents). Practice audiating 9F first, then matching it from 7F.',
      earTip: 'Play Fret 9 (E) first as a reference, then bend Fret 7 (D) upward until both match identically.',
    },
    postureGuide: {
      thumbPosition: 'Hook your left thumb slightly over the top neck edge to create a strong rotary pivot.',
      leftHandTip:
        'Stack Index (5F) and Middle (6F) directly behind Ring (7F) on the SAME string—all three push together.',
      rightHandTip: 'Muffle upper strings cleanly with right palm and Index tip to stop bend noise.',
      commonMistake: 'Pushing with one isolated Ring finger, resulting in sore tips and flat bends',
      fixAction: 'Lock fingers 1-2-3 together and rotate your forearm/wrist like turning a doorknob.',
    },
  },
  'm6-4': {
    title: '[Module 6 Test] Vibrato, Unison Bends & Hendrix Double Stops',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Two-String Harmony & Vocal Vibrato Centers',
      formula: 'Double Stop (3rd & 2nd str 5F: b3+5) → 4th str 7F(R) Hammer Groove',
      explanation:
        'Mini-barre Double Stops fuse rhythm chords with lead embellishments, while controlled vibrato and screaming unison bends define classic electric lead voice.',
      earTip: 'Confirm every vibrato oscillation returns cleanly back down to the true pitch center.',
    },
    postureGuide: {
      thumbPosition: 'Hook thumb lightly over neck top edge for smooth pendulum wrist vibrato.',
      leftHandTip: 'Flatten Index pad cleanly across strings 3 & 2 at Fret 5 for mini-barre double stops.',
      rightHandTip: 'Strike both double-stop strings evenly in one crisp downstroke.',
      commonMistake: 'Fast, narrow nervous vibrato that sounds jittery or sharp',
      fixAction: 'Sync wide, relaxed vibrato pulses smoothly to 8th notes or triplets against the click.',
    },
  },
  'm7-1': {
    title: '[Blues] 12-Bar Blues (I7-IV7-V7) Shuffle & Call-Response',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Minor Pentatonic + Dominant Major 3rd Touch',
      formula: 'A7 (b3→M3 C→C#) · D7 (b7 C Target) · E7 (Turnaround)',
      explanation:
        'Blues tension comes from Dominant 7th chords everywhere—hammering C (b3) briefly up to C# (M3) over A7 captures that sweet major/minor grit.',
      earTip: 'Hear the conversational Call (Bars 1-2 riff) answered by Response lead phrases (Bars 3-4).',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb centered behind Fret 5 so shuffle chords and lead phrases share one grip.',
      leftHandTip: 'Anchor Index at 5F on A7 shuffles while alternating Ring (7F) and Pinky (9F).',
      rightHandTip: 'Ride a relaxed triplet swing pocket (Long Down - Short Up).',
      commonMistake: 'Picking straight even 8th notes, flattening out the blues swing bounce',
      fixAction: 'Subdivide "ONE-two-THREE, ONE-two-THREE" internally while picking beats 1 and 3.',
    },
  },
  'm7-2': {
    title: '[Classic Rock] Open Power Chords & I - bVII - IV Mixolydian',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Classic Arena Rock Mixolydian Mode (bVII)',
      formula: 'A(I) → G(bVII: Flattened 7th) → D(IV) → A(I)',
      explanation:
        'Pairing a bright A chord with G (built on the lowered bVII degree rather than G#) yields unmistakable classic hard-rock Mixolydian attitude.',
      earTip: 'Feel the triumphant open stride moving from A down a whole step to G, D, and home.',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb comfortably behind Frets 1-2 ready to lightly mute the open 6th string over A.',
      leftHandTip: 'Barre 4th & 3rd strings 2F with Index for A5, then pivot smoothly to Ring/Pinky for G.',
      rightHandTip: 'Chop rests cleanly with your palm edge between hits to carve punchy rock space.',
      commonMistake: 'Open 6th E string ringing muddily underneath open A5 chords',
      fixAction: 'Let thumb tip lightly graze string 6 to silence it while strumming strings 5-4-3.',
    },
  },
  'm7-3': {
    title: '[Pop & Funk] High-Register Triad Inversions (Voice Leading)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Minimal-Movement Voice Leading on Strings 1-3',
      formula: 'Am(5-5-5) → F(5-6-5: Middle Only!) → C(5-5-8) → G(7-8-7)',
      explanation:
        'Staying on treble strings 1-3 avoids fighting the bass player, while triad inversions let Am morph into F simply by dropping Middle onto 2nd str 6F.',
      earTip: 'Trace the smooth singing melody on top string 1: E(5F) → E(5F) → C(8F) → B(7F).',
    },
    postureGuide: {
      thumbPosition: 'Center thumb opposite Fret 5 barre for agile treble-string muting.',
      leftHandTip: 'Hold Am (5-5-5), drop only Middle on 6F for F, then add only Pinky on 8F for C.',
      rightHandTip: 'Snap crisp staccato strokes strictly across strings 1, 2, and 3 on Clean tone.',
      commonMistake: 'Accidentally strumming open bass strings 6-4, clouding the tight triad sparkle',
      fixAction: 'Focus compact wrist flicks on the top three strings and shield string 4 with thumb/Index tip.',
    },
  },
  'm7-4': {
    title: '[Metal & Neoclassical] Pedal Point & Harmonic Minor (#7)',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Raised Leading Tone (#7) Creating Baroque Drama',
      formula: 'Pedal (E/A) Alternates Between #7 (G#) and b6 (F) Tension',
      explanation:
        'Raising natural minor b7 (G) to Major 7 (G#) creates a dramatic 3-fret Augmented 2nd leap (F ↔ G#) that explodes over V7 (E7).',
      earTip: 'Feel the intense magnetic pull of 4th string 6F (G#) snapping up into 7F (A).',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb low on the neck back to navigate 4-9F stretches smoothly.',
      leftHandTip: 'Anchor your pedal finger cleanly while walking scale steps underneath.',
      rightHandTip: 'Keep tight alternate-picking precision across adjacent string pedals.',
      commonMistake: 'Fumbling the 3-fret Augmented 2nd jump between F and G#',
      fixAction: 'Visualize Frets 4-5 on string 3 (B-C) paired cleanly with Frets 6-7 on string 4 (G#-A).',
    },
  },
  'm7-5': {
    title: '[Module 7 Test · Neo-Soul & Jazz] 3-Note Shell Voicings (R-3-7)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Stripping the 5th Down to Essential Guide Tones',
      formula: 'Shell Voicing = Root + 3rd & 7th Guide Tones (ii7 - V7 - Imaj7)',
      explanation:
        'Just 3 notes—Root, 3rd, and 7th—define Maj7, m7, and Dom7 quality completely while letting chords glide smoothly via half-step voice leading.',
      earTip: 'Hear Dm7 7th (C) step down one half-step into G7 3rd (B), then G7 7th (F) drop to Cmaj7 3rd (E).',
    },
    postureGuide: {
      thumbPosition: 'Keep thumb relaxed behind center neck; shell voicings need minimal grip force.',
      leftHandTip: 'Use flat finger undersides to naturally damp skipped inner strings cleanly.',
      rightHandTip: 'Pluck with warm hybrid fingerstyle/thumb strokes or soft upstrokes.',
      commonMistake: 'Forcing full 6-string jazz barres that tire the hand and break smooth voice leading',
      fixAction: 'Embrace the clarity and open breathing room of crisp 3-note shells.',
    },
  },
  'm8-1': {
    title: '[Solo Lv.1] Melodic Rock Ballad (Knockin Style)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Why Slow Solos Sing: Tracking 3rds Through Changes',
      formula: 'Over G → M3(B) | Over D → M3(F#)/5th(A) | Over Am → m3(C)',
      explanation:
        'Zero shred needed—melodic magic happens when every phrase landing aligns directly with the 3rd or 5th of the moving chord underneath.',
      earTip: 'Leave space between every phrase as if singing real song lyrics.',
    },
    postureGuide: {
      thumbPosition: 'Rest thumb near top edge of 12-15F upper register ready for clean support bends.',
      leftHandTip: 'Always pair fingers 1 and 2 behind Ring on 3rd string 14F bends.',
      rightHandTip: 'Shape note dynamics between delicate touch and warm crunch sustain.',
      commonMistake: 'Dropping long 2-beat notes early with zero vibrato',
      fixAction: 'Carry gentle wrist vibrato all the way until the next bar arrives.',
    },
  },
  'm8-2': {
    title: '[Solo Lv.2] Grunge Vocal Melody (Teen Spirit Style)',
    harmonyConcept: {
      layerTitle: 'Layer 4 · Greatest Solo Secret: Play the Vocal Hook on Guitar',
      formula: 'Vocal Intervals (5th - 4th - b3rd - 2nd) Along Neighboring Strings',
      explanation:
        'Turning an unforgettable vocal chorus into single-string slides and crying pre-bends builds your ear-to-fretboard bond faster than scale drills.',
      earTip: 'Hum the next note pitch silently in your head before your fingers play it.',
    },
    postureGuide: {
      thumbPosition: 'Rest thumb comfortably around 5-9F for slides and pre-bend control.',
      leftHandTip: 'Bend 3rd string 7F silently BEFORE picking, then release slowly downward for vocal cry.',
      rightHandTip: 'Strike simple phrases with bold, unhurried picking weight.',
      commonMistake: 'Rushing simple melodies with loose pitch or abrupt mute cutoffs',
      fixAction: 'Sustain every melody note to its full duration before moving.',
    },
  },
  'm8-3': {
    title: '[Solo Lv.3] B.B. King Sweet Box Blues (Thrill Is Gone Style)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Less Is More: The 10-12F B.B. Box Harmony',
      formula: 'Pivot on 2nd str 10F (Root A) Inside 10-12F Sweet Spot Box',
      explanation:
        'Staying inside one tiny 4-5 note box around 10-12F lets micro-bends, butterfly vibrato, and silent rests speak louder than fast licks.',
      earTip: 'Notice how leaving half a bar of silence after each phrase creates conversational drama.',
    },
    postureGuide: {
      thumbPosition: 'Hook thumb opposite Fret 10 for crisp Index vibrato and 12F bends.',
      leftHandTip: 'Pivot fast, narrow butterfly vibrato off Index on 2nd str 10F (Root A).',
      rightHandTip: 'Contrast punchy pick attacks on openers with whisper-soft endings.',
      commonMistake: 'Filling every rest nervously with extra filler notes',
      fixAction: 'Treat half-bar rests as deliberate punctuation at the end of every sentence.',
    },
  },
  'm8-4': {
    title: '[Solo Lv.4] David Gilmour Soaring Bends (Comfortably Numb Style)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Monumental Sustain from One Pentatonic Box',
      formula: 'Bm Penta (7-10F): 2nd str 10F(A) +200c → B(Root) & 10F(D) → E/F#',
      explanation:
        'Holding pitch-perfect +200c and +300c bends directly into moving chord roots over Bm-A-G-Em creates massive stadium sustain from Box 1 alone.',
      earTip: 'Focus on locking the bent peak steady with zero pitch sag during long sustains.',
    },
    postureGuide: {
      thumbPosition: 'Lock thumb over top neck at 7-10F for heavy 3-finger leverage.',
      leftHandTip: 'Stack fingers 1-2 behind Ring on 2nd str 10F and keep equal tension on controlled releases.',
      rightHandTip: 'Use firm, thick pick strokes tailored for singing Lead sustain.',
      commonMistake: 'Relaxing abruptly on bend releases so the string snaps noisily',
      fixAction: 'Lower bent strings slowly under steady fingertip resistance.',
    },
  },
  'm8-5': {
    title: '[Solo Lv.5] Slash Arpeggios & Harmonic Minor Turn (Sweet Child Style)',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Chord Arpeggios + V7 Leading Tone Spark (D#)',
      formula: 'Em(12-15F) → C(13-15F) → B7(1st str 11F D# Leading Tone → E)',
      explanation:
        'Outline Em and C with string-skipping arpeggios, then step onto Harmonic Minor D# (11F) right over B7 to trigger a dramatic classical pull back to E.',
      earTip: 'Catch the spine-tingling lift as Bar 3 11F (D#) climbs one fret into Bar 4 12F (E).',
    },
    postureGuide: {
      thumbPosition: 'Align 1-2-3-4 cleanly across 12-15F center behind neck.',
      leftHandTip: 'Lift previous arpeggio fingers lightly as each new string sounds to prevent muddy howl.',
      rightHandTip: 'Pick 4 → 2 → 3 → 1 string-skipping intervals with even wrist discipline.',
      commonMistake: 'Letting distorted arpeggio notes bleed into one blurred chord cluster',
      fixAction: 'Practice deliberate single-note separation on Lead preset.',
    },
  },
  'm8-6': {
    title: '[Module 8 Test · Lv.6] Page Climax Loop & Johnson 5-Note Cascade',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Building Climax Tension & Descending Cascades',
      formula: 'Page 3-Note Loop (8F→5F→2str 8F) + Johnson 5-Note Cascade',
      explanation:
        'Rotating a crisp 3-note triplet loop builds explosive rhythmic pressure before pouring smoothly down Eric Johnson 5-note groupings onto Root A.',
      earTip: 'Feel the hypnotic spin of the 3-note loop releasing cleanly onto final Root A.',
    },
    postureGuide: {
      thumbPosition: 'Anchor thumb firmly behind rear center to stabilize high-speed loops.',
      leftHandTip: 'Keep Index planted at 5F during Pull-Offs while blocking unwanted ring from string 2.',
      rightHandTip: 'Use compact Down (1str) - Pull-Off - Up (2str) economy motion.',
      commonMistake: 'Rushing pull-offs faster than picked beats as tempo rises',
      fixAction: 'Lock even triplet spacing at 60% speed before bumping BPM up.',
    },
  },
  'm9-1': {
    title: '[Ear Copy Deck 1] Transcribing Melodies Inside Box 1',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Ear Copy Method: Hear Distance from Home Root',
      formula: 'Contour (Up/Down) + Home Root A Resolution Inside 5-8F Box 1',
      explanation:
        'Ear copy feels overwhelming across 132 frets, yet narrows to 12 familiar notes inside Box 1. Judge whether phrases climb or drop relative to Root A.',
      earTip: 'Play Demo twice, hum the contour aloud, then test matching notes on your guitar.',
    },
    postureGuide: {
      thumbPosition: 'Rest lightly in standard 5-8F Pentatonic Box 1 stance.',
      leftHandTip: 'Try finding notes by ear first; reveal Scale/First-Note hints only when stuck.',
      rightHandTip: 'Pick single exploration notes slowly and cleanly so DSP registers exact pitch.',
      commonMistake: 'Guessing random frets before actually listening to pitch contour',
      fixAction: 'Always sing the phrase direction aloud ("up-down-home") before touching a string.',
    },
  },
  'm9-2': {
    title: '[Ear Copy Deck 2] Finding Chord Progressions via Bass Roots',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Pro Ear-Copy Secret: Isolate the Lowest Bass Root',
      formula: 'Strings 6/5 Roots: A(6str 5F) → F(6str 1F) → C(5str 3F) → G(6str 3F)',
      explanation:
        'Instead of guessing full chords blindly, trace the lowest bass movement on strings 6 and 5—the key diatonic progression reveals itself automatically.',
      earTip: 'Focus strictly on beat 1 low bass hits and match them unison across 1-8F on strings 6 and 5.',
    },
    postureGuide: {
      thumbPosition: 'Glide thumb lightly to track smooth 1-5F bass shifts.',
      leftHandTip: 'Compare 6th and 5th string roots until your bass note disappears cleanly into the backing bass.',
      rightHandTip: 'Strike clean single bass notes without strumming upper strings during matching.',
      commonMistake: 'Latching onto high melody notes and mistaking 3rds or 5ths for the chord root',
      fixAction: 'Walk 6th string frets 1-8 until the fundamental low thump locks seamlessly.',
    },
  },
  'm9-3': {
    title: '[Comping Studio] Triad Comping & Double-Stop Fills Over Groove',
    jamPrompt:
      'Mute Guide Guitar in the mixer and groove strictly with drums & bass—comp displayed triads on beats 1-2, then answer with Am Pentatonic double-stop fills on beats 3-4.',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Mayer & Hendrix Style: Chord Comp (1-2) + Fill (3-4)',
      formula: 'Beats 1-2: Chord Triad Stroke → Beats 3-4: 5-7F Double-Stop Fill',
      explanation:
        'One guitar sounds like a full rhythm section when beat 1 announces the chord triad and beats 3-4 slip short pentatonic hammer-on fills into the pocket.',
      earTip: 'Check that your 3-4 beat fill resolves sweetly into the active bar chord.',
    },
    postureGuide: {
      thumbPosition: 'Hover near 5F ready for instant switches between triads and lead licks.',
      leftHandTip: 'Follow highlighted chord tones (R, 3, 5) on the neck inside Frets 5-8.',
      rightHandTip: 'Lock tight with drum snare hits on beats 2 & 4 without guide guitar.',
      commonMistake: 'Strumming constantly on every beat with zero space left for melodic fills',
      fixAction: 'Strike beat 1 crisp, breathe on beat 2, and answer on beats 3-4.',
    },
  },
  'm9-4': {
    title: '[Graduation Master Lab] Free Improv, Comp↔Solo Switch & Hum Mapper',
    jamPrompt:
      'Comp tight rhythm grooves on Bars 1-2 (Am7-Dm7), switch into singing chord-tone solo phrases on Bars 3-4 (G7-Cmaj7), or hum melodies straight into the Hum Mapper!',
    harmonyConcept: {
      layerTitle: 'Layer 5 · Full Musical Autonomy: Speaking Your Own Lines',
      formula: 'COMP (Groove Voicings) ↔ SOLO (Breathing + Chord-Tone Bends/Vibrato)',
      explanation:
        'Everything merges here: read live chord-tone signposts over Am7-Dm7-G7-Cmaj7, leave space between short phrases, and turn vocalized ideas into instant fingerings.',
      earTip: 'Imagine your next 2-note motif before touching the fretboard (audiation first).',
    },
    postureGuide: {
      thumbPosition: 'Maintain a loose, responsive grip ready for instant rhythm/lead switching.',
      leftHandTip: 'Aim phrases cleanly onto highlighted R, 3, 5, and 7 chord tones at chord changes.',
      rightHandTip: 'Contrast tight percussive comping in Bars 1-2 with soaring vibrato leads in Bars 3-4.',
      commonMistake: 'Playing nonstop runs out of nerves with no rests or phrasing arcs',
      fixAction: 'End every 3-5 note phrase clearly and pause a full beat before your next answer.',
    },
  },
};

export function localizeModule(mod: ModuleInfo, locale: Locale): ModuleInfo {
  if (locale === 'ko') return mod;
  const ov = MODULES_EN[mod.id];
  if (!ov) return mod;
  return {
    ...mod,
    ...ov,
  };
}

export function localizeLesson(lesson: Lesson, locale: Locale): Lesson {
  if (locale === 'ko') return lesson;
  const ov = LESSONS_EN[lesson.id];
  if (!ov) return lesson;
  return {
    ...lesson,
    title: ov.title,
    jamPrompt: ov.jamPrompt ?? lesson.jamPrompt,
    harmonyConcept: {
      ...lesson.harmonyConcept,
      ...ov.harmonyConcept,
    },
    postureGuide: ov.postureGuide,
    notes: lesson.notes.map((n) =>
      n.coachingNote && COACHING_NOTES_EN[n.coachingNote]
        ? { ...n, coachingNote: COACHING_NOTES_EN[n.coachingNote] }
        : n
    ),
  };
}
