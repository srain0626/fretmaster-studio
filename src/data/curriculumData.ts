import type { Lesson, LessonCategory } from '@/types/guitar';
import type { Locale } from '@/lib/i18n';
import { MODULES } from './modulesMeta';
import { PHASE_1_LESSONS } from './lessonsPhase1';
import { PHASE_2_LESSONS } from './lessonsPhase2';
import { PHASE_3_LESSONS } from './lessonsPhase3';
import { PHASE_4_LESSONS } from './lessonsPhase4';
import {
  CATEGORY_LABELS_EN,
  localizeLesson,
  localizeModule,
} from './curriculumEn';

export { MODULES, CATEGORY_LABELS_EN, localizeLesson, localizeModule };

export const ALL_LESSONS: Lesson[] = [
  ...PHASE_1_LESSONS,
  ...PHASE_2_LESSONS,
  ...PHASE_3_LESSONS,
  ...PHASE_4_LESSONS,
];

export const CATEGORY_LABELS: Record<'all' | LessonCategory, string> = {
  all: '전체 커리큘럼',
  mechanics: '운지·피킹 기초',
  chords: '코드·리듬 반주',
  scales: '스케일·화성',
  techniques: '표현 테크닉',
  genres: '장르 아카데미',
  solos: '유명 솔로',
  expression: '귀카피·즉흥 랩',
};

export function getCategoryLabel(cat: 'all' | LessonCategory, locale: Locale): string {
  return locale === 'en' ? CATEGORY_LABELS_EN[cat] : CATEGORY_LABELS[cat];
}

export function getLessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find((l) => l.id === id);
}

export function getNextLesson(currentLessonId: string): Lesson | undefined {
  const idx = ALL_LESSONS.findIndex((l) => l.id === currentLessonId);
  if (idx === -1 || idx + 1 >= ALL_LESSONS.length) return undefined;
  return ALL_LESSONS[idx + 1];
}

export function getModuleById(moduleId: string) {
  return MODULES.find((m) => m.id === moduleId);
}
