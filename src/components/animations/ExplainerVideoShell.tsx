'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Player, type CallbackListener, type PlayerRef } from '@remotion/player';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoAudioCue {
  frame: number;
  label?: string;
  trigger: () => void;
}

interface ExplainerVideoShellProps<T extends Record<string, unknown>> {
  component: React.ComponentType<T>;
  inputProps: T;
  resetKey?: string;
  durationInFrames?: number;
  fps?: number;
  compositionWidth?: number;
  compositionHeight?: number;
  badgeText: string;
  cueEvents?: VideoAudioCue[];
  soundEnabled: boolean;
  onSoundToggle: () => void;
  autoPlay?: boolean;
  className?: string;
}

function formatVideoTime(frame: number, fps: number): string {
  const sec = Math.max(0, Math.floor(frame / fps));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export function ExplainerVideoShell<T extends Record<string, unknown>>({
  component,
  inputProps,
  resetKey,
  durationInFrames = 240,
  fps = 30,
  compositionWidth = 720,
  compositionHeight = 320,
  badgeText,
  cueEvents = [],
  soundEnabled,
  onSoundToggle,
  autoPlay = true,
  className,
}: ExplainerVideoShellProps<T>) {
  const playerRef = useRef<PlayerRef>(null);
  const lastFrameRef = useRef<number>(-1);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const cuesRef = useRef<VideoAudioCue[]>(cueEvents);

  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlay);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1>(1);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    cuesRef.current = cueEvents;
  }, [cueEvents]);

  // Reset frame counter cleanly when lesson/resetKey changes
  useEffect(() => {
    lastFrameRef.current = -1;
    setCurrentFrame(0);
    if (playerRef.current) {
      playerRef.current.seekTo(0);
      if (autoPlay) {
        playerRef.current.play();
      }
    }
  }, [resetKey, autoPlay]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate: CallbackListener<'frameupdate'> = (e) => {
      const frame = Math.floor(e.detail.frame);
      setCurrentFrame(frame);

      const prev = lastFrameRef.current;
      if (soundEnabledRef.current && cuesRef.current.length > 0 && prev !== frame) {
        for (const cue of cuesRef.current) {
          const crossedForward =
            prev >= 0 && frame > prev
              ? cue.frame > prev && cue.frame <= frame
              : frame < prev
                ? cue.frame <= frame || cue.frame > prev
                : cue.frame === frame;

          if (crossedForward) {
            try {
              cue.trigger();
            } catch {
              // AudioContext may wait for user gesture; fail gracefully
            }
          }
        }
      }
      lastFrameRef.current = frame;
    };

    const onPlay: CallbackListener<'play'> = () => setIsPlaying(true);
    const onPause: CallbackListener<'pause'> = () => setIsPlaying(false);
    const onSeeked: CallbackListener<'seeked'> = (e) => {
      const frame = Math.floor(e.detail.frame);
      lastFrameRef.current = frame;
      setCurrentFrame(frame);
    };

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('seeked', onSeeked);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('seeked', onSeeked);
    };
  }, []);

  const handleTogglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.toggle();
  }, []);

  const handleRestart = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    lastFrameRef.current = -1;
    player.seekTo(0);
    player.play();
  }, []);

  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const targetFrame = Number(e.target.value);
      const player = playerRef.current;
      if (!player || Number.isNaN(targetFrame)) return;
      lastFrameRef.current = targetFrame;
      player.seekTo(targetFrame);
      setCurrentFrame(targetFrame);
    },
    []
  );

  const handleSoundButtonClick = useCallback(() => {
    if (!soundEnabled) {
      // Trigger first matching/closest cue immediately on unmute so audio context unlocks cleanly
      const activeCue =
        [...cuesRef.current]
          .reverse()
          .find((c) => c.frame <= currentFrame) ?? cuesRef.current[0];
      if (activeCue) {
        try {
          activeCue.trigger();
        } catch {
          // Ignore if browser rejects
        }
      }
    }
    onSoundToggle();
  }, [soundEnabled, currentFrame, onSoundToggle]);

  const progressPct = Math.min(
    100,
    Math.max(0, (currentFrame / Math.max(1, durationInFrames - 1)) * 100)
  );

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card overflow-hidden select-none',
        className
      )}
    >
      {/* Video Stage */}
      <div
        className="relative w-full bg-background/60 cursor-pointer group"
        onClick={handleTogglePlay}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? '설명 애니메이션 일시정지' : '설명 애니메이션 재생'}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleTogglePlay();
          }
        }}
      >
        <div className="w-full aspect-[9/4]">
          <Player
            ref={playerRef}
            component={component as unknown as React.ComponentType<Record<string, unknown>>}
            inputProps={inputProps}
            durationInFrames={durationInFrames}
            fps={fps}
            compositionWidth={compositionWidth}
            compositionHeight={compositionHeight}
            playbackRate={playbackRate}
            autoPlay={autoPlay}
            loop
            controls={false}
            clickToPlay={false}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>

        {/* Minimal Floating Header Tag (zero heavy gradient) */}
        <div className="pointer-events-none absolute top-2.5 left-3 right-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-semibold tracking-tight text-foreground">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isPlaying ? 'bg-primary' : 'bg-muted-foreground'
              )}
            />
            {badgeText}
          </span>

          {!isPlaying && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/95 px-2.5 py-0.5 text-[10px] font-medium text-foreground shadow-sm">
              <Play className="w-2.5 h-2.5 fill-current" />
              재생
            </span>
          )}
        </div>
      </div>

      {/* Creatica-Inspired Clean Control Bar */}
      <div className="flex items-center gap-2.5 px-3 py-2 border-t border-border bg-card">
        <button
          type="button"
          onClick={handleTogglePlay}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-foreground hover:bg-secondary transition-colors cursor-pointer"
          title={isPlaying ? '일시정지' : '재생'}
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={handleRestart}
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          title="처음부터 다시 보기"
          aria-label="처음부터 다시 보기"
        >
          <RotateCcw className="w-3 h-3" />
        </button>

        {/* Timeline Scrubber with Cue Ticks */}
        <div className="relative flex-1 h-5 flex items-center">
          <div className="relative w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {cueEvents.map((cue, idx) => {
            const cuePct = (cue.frame / Math.max(1, durationInFrames - 1)) * 100;
            return (
              <span
                key={`${cue.frame}-${idx}`}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-foreground/30"
                style={{ left: `${cuePct}%` }}
              />
            );
          })}

          <input
            type="range"
            min={0}
            max={durationInFrames - 1}
            value={currentFrame}
            onChange={handleScrub}
            aria-label="애니메이션 타임라인"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <span className="text-[11px] font-mono tabular-nums text-muted-foreground min-w-[66px] text-right">
          {formatVideoTime(currentFrame, fps)} / {formatVideoTime(durationInFrames, fps)}
        </span>

        <button
          type="button"
          onClick={() => setPlaybackRate((r) => (r === 1 ? 0.75 : 1))}
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-colors cursor-pointer',
            playbackRate === 0.75
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
          )}
          title="슬로우 모션 배속 전환"
        >
          {playbackRate === 0.75 ? '0.75x' : '1.0x'}
        </button>

        <button
          type="button"
          onClick={handleSoundButtonClick}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors cursor-pointer',
            soundEnabled
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
          )}
          title={soundEnabled ? '데모 사운드 끄기' : '애니메이션에 맞춰 소리 듣기'}
        >
          {soundEnabled ? (
            <Volume2 className="w-3 h-3" />
          ) : (
            <VolumeX className="w-3 h-3" />
          )}
          <span>사운드</span>
        </button>
      </div>
    </div>
  );
}
