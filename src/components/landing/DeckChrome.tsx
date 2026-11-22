'use client';

import React, { useEffect } from 'react';
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
} from 'framer-motion';
import { SILK_EASE, STUDIO_SPRING } from '@/components/motion/StudioMotion';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  X,
} from 'lucide-react';

export interface SlideMeta {
  id: string;
  index: number;
  code: string;
  eyebrowEn: string;
  eyebrowKo: string;
  titleEn: string;
  titleKo: string;
  summaryEn: string;
  summaryKo: string;
}

export function TopSlideProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.001,
  });

  return (
    <div
      aria-hidden="true"
      className="fixed top-16 left-0 right-0 z-40 h-[2px] bg-border/40 pointer-events-none"
    >
      <motion.div
        className="h-full bg-primary origin-left"
        style={{ scaleX }}
      />
    </div>
  );
}

export function SlideFrame({
  id,
  slideNumber,
  totalSlides,
  eyebrow,
  variant = 'default',
  className = '',
  children,
}: {
  id: string;
  slideNumber: number;
  totalSlides: number;
  eyebrow: string;
  variant?: 'default' | 'tinted' | 'grid';
  className?: string;
  children: React.ReactNode;
}) {
  const bgClass =
    variant === 'tinted'
      ? 'bg-card/45'
      : variant === 'grid'
        ? 'bg-background landing-slide-grid'
        : 'bg-background';

  const padNum = String(slideNumber).padStart(2, '0');
  const padTotal = String(totalSlides).padStart(2, '0');

  return (
    <section
      id={id}
      data-slide-index={slideNumber - 1}
      className={`relative scroll-mt-16 overflow-x-clip min-h-[calc(100svh-4rem)] flex flex-col justify-center border-b border-border/70 ${bgClass} ${className}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: SILK_EASE }}
        className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-12 pb-20 sm:py-16"
      >
        <div className="flex items-center gap-3 mb-7 sm:mb-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 font-mono tabular-nums text-[11px] font-semibold text-primary shrink-0">
            {padNum} / {padTotal}
          </span>
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground shrink-0">
            {eyebrow}
          </span>
          <div className="landing-slide-divider flex-1 min-w-6" aria-hidden="true" />
        </div>

        {children}
      </motion.div>
    </section>
  );
}

export function SlideIndexRail({
  slides,
  activeIndex,
  locale,
  onJumpTo,
}: {
  slides: SlideMeta[];
  activeIndex: number;
  locale: 'en' | 'ko';
  onJumpTo: (index: number) => void;
}) {
  return (
    <nav
      aria-label={locale === 'en' ? 'Slide navigation' : '슬라이드 목차'}
      className="hidden min-[1360px]:flex fixed right-4 top-1/2 -translate-y-1/2 z-30 flex-col items-end gap-2 pointer-events-none"
    >
      {slides.map((slide) => {
        const isActive = slide.index === activeIndex;
        const title = locale === 'en' ? slide.titleEn : slide.titleKo;
        return (
          <button
            key={slide.id}
            type="button"
            onClick={() => onJumpTo(slide.index)}
            aria-label={`${slide.code} ${title}`}
            aria-current={isActive ? 'step' : undefined}
            className="pointer-events-auto group relative flex items-center justify-end gap-1.5 py-1 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <span
              className={`pointer-events-none absolute right-full mr-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card/95 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150 whitespace-nowrap ${
                isActive ? 'border-primary/40' : ''
              }`}
            >
              {title}
            </span>
            <span
              className={`font-mono tabular-nums text-[11px] transition-colors ${
                isActive
                  ? 'font-bold text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              }`}
            >
              {slide.code}
            </span>
            <span className="relative w-1.5 h-5 rounded-full bg-border/80 overflow-hidden">
              {isActive && (
                <motion.span
                  layoutId="active-slide-rail-pill"
                  transition={STUDIO_SPRING}
                  className="absolute inset-0 rounded-full bg-primary"
                />
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export function DeckControlHud({
  slides,
  activeIndex,
  locale,
  onJumpTo,
  onOpenOverview,
}: {
  slides: SlideMeta[];
  activeIndex: number;
  locale: 'en' | 'ko';
  onJumpTo: (index: number) => void;
  onOpenOverview: () => void;
}) {
  const current = slides[activeIndex] ?? slides[0];
  const title = locale === 'en' ? current.titleEn : current.titleKo;
  const padCurr = String(activeIndex + 1).padStart(2, '0');
  const padTotal = String(slides.length).padStart(2, '0');

  return (
    <div
      role="region"
      aria-label={locale === 'en' ? 'Presentation controls' : '프레젠테이션 컨트롤'}
      className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-2rem)]"
    >
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/90 backdrop-blur-md px-2 py-1.5 shadow-md">
        <button
          type="button"
          onClick={() => onJumpTo(Math.max(0, activeIndex - 1))}
          disabled={activeIndex <= 0}
          aria-label={locale === 'en' ? 'Previous slide' : '이전 슬라이드'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-secondary disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpenOverview}
          aria-label={locale === 'en' ? 'Open slide overview (G)' : '슬라이드 전체 보기 (G)'}
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs hover:bg-secondary/80 transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-mono tabular-nums font-bold text-foreground">
            {padCurr} / {padTotal}
          </span>
          <span className="hidden sm:inline text-muted-foreground font-medium truncate max-w-[160px]">
            {title}
          </span>
          <kbd className="hidden md:inline-flex items-center justify-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
            G
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => onJumpTo(Math.min(slides.length - 1, activeIndex + 1))}
          disabled={activeIndex >= slides.length - 1}
          aria-label={locale === 'en' ? 'Next slide' : '다음 슬라이드'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-foreground hover:bg-secondary disabled:opacity-35 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function SlideOverviewModal({
  open,
  slides,
  activeIndex,
  locale,
  onClose,
  onJumpTo,
}: {
  open: boolean;
  slides: SlideMeta[];
  activeIndex: number;
  locale: 'en' | 'ko';
  onClose: () => void;
  onJumpTo: (index: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'en' ? 'Slide Deck Overview' : '전체 슬라이드 보기'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: SILK_EASE }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4 sm:p-6 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={STUDIO_SPRING}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xl space-y-5 my-auto"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border/80 pb-4">
              <div className="space-y-0.5">
                <div className="font-mono text-[11px] font-semibold text-primary tracking-wider uppercase">
                  {locale === 'en' ? 'Slide Sorter · 6 Slides' : '슬라이드 모아보기 · 6장'}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  {locale === 'en'
                    ? 'FretMaster Studio Presentation Deck'
                    : 'FretMaster Studio 프레젠테이션 목차'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={locale === 'en' ? 'Close slide overview' : '닫기'}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slides.map((slide) => {
                const isActive = slide.index === activeIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      onJumpTo(slide.index);
                    }}
                    className={`group text-left rounded-xl border p-4 transition-all space-y-2 ${
                      isActive
                        ? 'border-primary bg-accent-soft/60'
                        : 'border-border bg-background hover:border-foreground/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono tabular-nums text-xs font-bold ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {slide.code}
                      </span>
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                        {locale === 'en' ? slide.eyebrowEn : slide.eyebrowKo}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {locale === 'en' ? slide.titleEn : slide.titleKo}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {locale === 'en' ? slide.summaryEn : slide.summaryKo}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
              <span>
                {locale === 'en'
                  ? 'Shortcuts: Arrow keys or 1–6 to jump, G to toggle grid, Esc to close.'
                  : '단축키: 방향키 또는 숫자 1–6 이동 · G 전체 보기 · Esc 닫기'}
              </span>
              <span className="font-mono">v0.3.0</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
