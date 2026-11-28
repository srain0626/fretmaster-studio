'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BrandFretLogo } from '@/components/icons/GuitarSvgIcons';
import { useLocale } from '@/lib/i18n';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  Check,
  Cloud,
  Compass,
  Headphones,
  Layers,
  Mic,
  MousePointerClick,
  SlidersHorizontal,
} from 'lucide-react';

interface StudioOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  initialFreeExplore: boolean;
  initialDailyGoalSeconds: number;
  isAudioRunning: boolean;
  onConnectAudio: () => Promise<void> | void;
  onOpenAudioSetup: () => void;
  onComplete: (prefs: { freeExploreMode: boolean; dailyGoalSeconds: number }) => void;
  onSkip: () => void;
}

const GOAL_MINUTES = [10, 15, 20, 30] as const;

export function StudioOnboardingDialog({
  open,
  onOpenChange,
  userName,
  initialFreeExplore,
  initialDailyGoalSeconds,
  isAudioRunning,
  onConnectAudio,
  onOpenAudioSetup,
  onComplete,
  onSkip,
}: StudioOnboardingDialogProps) {
  const { tr } = useLocale();
  const [step, setStep] = useState(0);
  const [freeExploreMode, setFreeExploreMode] = useState(initialFreeExplore);
  const [goalMinutes, setGoalMinutes] = useState(() =>
    Math.max(10, Math.round(initialDailyGoalSeconds / 60) || 15)
  );
  const [connectingAudio, setConnectingAudio] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(0);
      setFreeExploreMode(initialFreeExplore);
      setGoalMinutes(Math.max(10, Math.round(initialDailyGoalSeconds / 60) || 15));
    }
  }, [initialDailyGoalSeconds, initialFreeExplore, open]);

  const totalSteps = 4;
  const displayName = userName?.trim();

  const handleConnectClick = async () => {
    setConnectingAudio(true);
    try {
      await onConnectAudio();
    } finally {
      setConnectingAudio(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onSkip();
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between pr-8 gap-3">
            <div className="flex items-center gap-2.5">
              <BrandFretLogo size={24} />
              <div>
                <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                  {displayName
                    ? tr(
                        `Welcome to FretMaster, ${displayName}`,
                        `환영합니다, ${displayName}님`
                      )
                    : tr('Welcome to FretMaster Studio', 'FretMaster Studio에 오신 것을 환영합니다')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {tr(
                    `Quick Setup Tour · Step ${step + 1} of ${totalSteps}`,
                    `스튜디오 1분 튜토리얼 · ${step + 1} / ${totalSteps}단계`
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Step Indicator Dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === step
                      ? 'w-5 bg-primary'
                      : idx < step
                      ? 'w-2.5 bg-primary/45'
                      : 'w-2.5 bg-border'
                  }`}
                  aria-label={`Step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 min-h-[280px] flex flex-col justify-between space-y-5">
          {/* STEP 1: Workspace Overview */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {tr(
                    '1. Your 3-Column Guitar Workspace',
                    '1. 한눈에 들어오는 3단 기타 스튜디오 구조'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tr(
                    'Everything is separated cleanly so your eyes stay on the fretboard while you play.',
                    '연주 중 시선이 분산되지 않도록 커리큘럼·지판 실습·진도 가이드가 3개 영역으로 나뉘어 있습니다.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
                    <span>LEFT</span>
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {tr('39 Lessons & Sync', '커리큘럼 & 계정 저장')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tr(
                      'Switch modules, check radar analytics, toggle EN/KO, and verify cloud sync.',
                      '9개 모듈·39강 이동, 역량 레이더, 언어·테마 및 클라우드 저장 상태를 확인합니다.'
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-primary/40 bg-accent-soft/50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
                    <span>CENTER</span>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {tr('Fretboard & TAB', '실시간 지판 & 타브 악보')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tr(
                      'Color-coded 4-finger guides, synced backing audio, tempo slider, and bar looping.',
                      '4손가락 색상 운지 가이드, 앰프 톤 백킹 트랙, 템포 및 구간 반복 플레이어가 있습니다.'
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-primary font-semibold">
                    <span>RIGHT</span>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {tr('Tasks & Motion Guide', '단계 체크 & 모션 가이드')}
                  </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tr(
                      'See single-line fingering tips and open Harmony / Posture animations anytime.',
                      '지금 짚을 손가락 안내와 화성·자세 애니메이션 모달을 언제든 열 수 있습니다.'
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-accent-soft/50 px-3.5 py-2.5 flex items-center gap-2.5 text-[11.5px] text-foreground">
                <Bug className="w-4 h-4 text-primary shrink-0" />
                <span>
                  {tr(
                    'Notice an issue while practicing? Use the new Report a Bug button in the left sidebar anytime.',
                    '연습 중 오작동이나 불편을 느끼시면 왼쪽 사이드바의 버그 제보 버튼으로 바로 알려주세요.'
                  )}
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Audio Connection & Fallback Control */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {tr(
                    '2. Connect Guitar Audio (or Click Fretboard Directly)',
                    '2. 기타 입력 연결하기 (없어도 바로 연습 가능)'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tr(
                    'Plug in an audio interface, USB guitar cable, or use your built-in mic for real-time pitch recognition.',
                    '오디오 인터페이스, USB 케이블 또는 기본 마이크로 실제 기타 소리를 실시간 판정합니다.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Mic className="w-4 h-4 text-primary" />
                      {tr('Real Guitar DSP Input', '실시간 기타 DSP 입력')}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        isAudioRunning
                          ? 'bg-accent-soft text-primary font-semibold'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {isAudioRunning ? tr('CONNECTED', '연결됨') : tr('STANDBY', '대기 중')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tr(
                      'Runs a 128-sample AudioWorklet YIN pitch tracker plus Chromatic Tuner & latency offset.',
                      '128-sample AudioWorklet YIN 엔진으로 음정과 피킹 타이밍을 정밀하게 인식합니다.'
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={isAudioRunning ? 'outline' : 'default'}
                      disabled={connectingAudio}
                      onClick={handleConnectClick}
                      className="text-xs gap-1.5"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {isAudioRunning
                        ? tr('Connected (Click to Mute)', '연결 완료 (끄기)')
                        : connectingAudio
                        ? tr('Connecting...', '연결 중...')
                        : tr('Connect Mic / Guitar', '마이크 · 기타 연결')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={onOpenAudioSetup}
                      className="text-xs gap-1 text-muted-foreground"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {tr('ASIO / Setup', '오디오 설정')}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/35 p-4 space-y-2.5">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold text-foreground">
                    <MousePointerClick className="w-4 h-4 text-primary" />
                    {tr('No Guitar Nearby Right Now?', '지금 당장 기타가 없다면?')}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {tr(
                      'Click any fret on the SVG neck—or press keyboard keys 1, 2, 3, 4 (matching fingers)—to audition notes and finish Wait Mode drills.',
                      '지판 위의 프렛을 마우스로 클릭하거나 키보드 숫자 1~4(손가락 번호)를 누르면 실제 기타 소리가 나며 대기 연습을 통과할 수 있습니다.'
                    )}
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-muted-foreground">
                    <span className="rounded border border-border bg-background px-1.5 py-0.5">
                      Space
                    </span>
                    <span>{tr('Play / Stop', '재생 · 정지')}</span>
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 ml-1">
                      1-4
                    </span>
                    <span>{tr('Finger Input', '손가락 입력')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 4-Stage Practice Flow */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {tr(
                    '3. How Every Lesson Builds Mastery',
                    '3. 모든 레슨의 4단계 정복 루프'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tr(
                    'Use the right-hand Lesson Tasks panel to step cleanly from ear training to exam unlock.',
                    '우측 LESSON TASKS 체크리스트를 따라 청음 → 대기 연습 → 템포 완주 → 승급 테스트 순서로 진행하세요.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    badge: 'STEP 01',
                    icon: Headphones,
                    title: tr('Listen to Demo', '소리 먼저 들어보기'),
                    desc: tr(
                      'Hear the target melody and rhythm with synchronized backing before touching a fret.',
                      '악보를 따라치기 전, 가이드 기타 사운드로 리듬과 높낮이를 먼저 귀에 익힙니다.'
                    ),
                  },
                  {
                    badge: 'STEP 02',
                    icon: Check,
                    title: tr('Step-by-Step Wait Mode', '한 음씩 따라치기 (대기)'),
                    desc: tr(
                      'Zero pressure: the cursor waits silently until you hit the exact note and fret.',
                      '내가 정확한 음을 칠 때까지 기다려 주므로 초보자도 박자 압박 없이 운지를 익힙니다.'
                    ),
                  },
                  {
                    badge: 'STEP 03',
                    icon: Activity,
                    title: tr('Loop in Tempo (+5 BPM)', '템포 맞춰 완주 · 가속'),
                    desc: tr(
                      'Drag bar headers to loop tough phrases and toggle automatic +5 BPM speed-up.',
                      '어려운 마디만 드래그해 반복하면서 완주 시 자동으로 +5 BPM씩 속도를 끌어올립니다.'
                    ),
                  },
                  {
                    badge: 'STEP 04',
                    icon: Cloud,
                    title: tr('Passing Exam & Cloud Sync', '승급 테스트 & 자동 저장'),
                    desc: tr(
                      'Score 75+ on Standard tier to unlock the next lesson and store grades in your account.',
                      '표준 기준 75점 이상 달성 시 다음 레슨이 해금되며 성적이 계정에 영구 저장됩니다.'
                    ),
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.badge}
                      className="rounded-xl border border-border bg-secondary/35 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10.5px] font-mono text-primary font-semibold">
                        <span>{card.badge}</span>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs font-semibold text-foreground">{card.title}</div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Personalize Learning Path & Daily Goal */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  {tr(
                    '4. Customize Your Learning Mode & Daily Goal',
                    '4. 학습 경로와 하루 목표를 선택해 주세요'
                  )}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tr(
                    'Both preferences sync to your account and can be changed anytime.',
                    '선택한 설정은 계정에 저장되며, 스튜디오 내에서 언제든 변경할 수 있습니다.'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tr('Curriculum Progression', '커리큘럼 진행 방식')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFreeExploreMode(false)}
                    className={`rounded-xl border p-3.5 text-left transition-colors space-y-1 ${
                      !freeExploreMode
                        ? 'border-primary bg-accent-soft/60'
                        : 'border-border bg-card hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {tr('Guided Path (Start 1-1)', '입문 추천 · 단계별 해금')}
                      </span>
                      {!freeExploreMode && <Check className="w-3.5 h-3.5 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {tr(
                        'Start comfortably with the 1-1 warm-up, then unlock each stage step by step to build solid fundamentals.',
                        '1-1 워밍업으로 가볍게 시작한 뒤 단계별로 해금하며 기초와 화성 감각을 탄탄히 쌓습니다.'
                      )}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFreeExploreMode(true)}
                    className={`rounded-xl border p-3.5 text-left transition-colors space-y-1 ${
                      freeExploreMode
                        ? 'border-primary bg-accent-soft/60'
                        : 'border-border bg-card hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {tr('Free Explore (All 39 Open)', '자유 탐색 · 39강 전체 오픈')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        {freeExploreMode ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {tr(
                        'Experienced player? Unlock every scale, genre groove, and solo immediately.',
                        '이미 기초가 있다면 펜타토닉·장르·유명 솔로·즉흥 랩까지 바로 골라 연습하세요.'
                      )}
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {tr('Daily Practice Target', '하루 목표 연습 시간')}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {GOAL_MINUTES.map((mins) => {
                    const active = goalMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setGoalMinutes(mins)}
                        className={`rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {tr(`${mins} min`, `${mins}분`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onSkip();
                onOpenChange(false);
              }}
              className="text-xs text-muted-foreground"
            >
              {tr('Skip Tour', '건너뛰기')}
            </Button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="text-xs gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {tr('Back', '이전')}
                </Button>
              )}

              {step < totalSteps - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                  className="text-xs gap-1"
                >
                  <span>{tr('Next', '다음')}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    onComplete({
                      freeExploreMode,
                      dailyGoalSeconds: goalMinutes * 60,
                    })
                  }
                  className="text-xs gap-1.5 font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{tr('Start Practicing', '연습 시작하기')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
