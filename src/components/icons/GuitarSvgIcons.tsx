import React from 'react';
import type { SkillRadarStats } from '@/types/guitar';

interface IconProps {
  className?: string;
  size?: number;
}

export function BrandFretLogo({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="2.5"
        width="23"
        height="23"
        rx="6"
        fill="#1E2026"
        stroke="var(--border)"
        strokeWidth="1"
      />
      <line x1="9" y1="7" x2="9" y2="21" stroke="#4B5563" strokeWidth="1.2" />
      <line x1="14" y1="7" x2="14" y2="21" stroke="#4B5563" strokeWidth="1.2" />
      <line x1="19" y1="7" x2="19" y2="21" stroke="#4B5563" strokeWidth="1.2" />
      <line x1="6.5" y1="10.5" x2="21.5" y2="10.5" stroke="#6B7280" strokeWidth="1.1" />
      <line x1="6.5" y1="14" x2="21.5" y2="14" stroke="#6B7280" strokeWidth="1.1" />
      <line x1="6.5" y1="17.5" x2="21.5" y2="17.5" stroke="#6B7280" strokeWidth="1.1" />
      <circle cx="9" cy="17.5" r="2.1" fill="#FFFFFF" />
      <circle cx="14" cy="14" r="2.1" fill="#E85D3F" />
      <circle cx="19" cy="10.5" r="2.1" fill="#FFFFFF" />
    </svg>
  );
}

export function DownPickIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-label="Down Pick">
      <path
        d="M3 13V4.5H13V13"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="3" y1="4.5" x2="13" y2="4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function UpPickIcon({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-label="Up Pick">
      <path
        d="M3 3.5L8 12.5L13 3.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BendCurveIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Bend">
      <path
        d="M3 14C7.5 14 10.5 11.5 11.5 4.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M8.5 7L11.5 4L14.5 7"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LegatoArcIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Legato">
      <circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 9C6.8 4.8 11.2 4.8 13 9"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SlideGlyphIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Slide">
      <line
        x1="3.5"
        y1="13.5"
        x2="14.5"
        y2="4.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <circle cx="3.5" cy="13.5" r="1.8" fill="currentColor" />
      <circle cx="14.5" cy="4.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function VibratoWaveIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 14" fill="none" className={className} aria-label="Vibrato">
      <path
        d="M1.5 7C3.2 3.2 4.8 3.2 6.5 7C8.2 10.8 9.8 10.8 11.5 7C13.2 3.2 14.8 3.2 16.5 7C17.3 8.8 18.1 9.5 18.8 8.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TunerGaugeIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Tuner">
      <path
        d="M2.5 12.5A6.8 6.8 0 0 1 15.5 12.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <line x1="9" y1="12.5" x2="11.5" y2="6.2" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
      <circle cx="9" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function LatencyPulseIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Low Latency">
      <path
        d="M1.5 9H4.5L6.5 4L9.2 14L11.5 6.5L13.2 9H16.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TriadVoicingIcon({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-label="Triad Voicing">
      <line x1="4" y1="3" x2="4" y2="15" stroke="currentColor" strokeWidth="1.3" className="opacity-50" />
      <line x1="9" y1="3" x2="9" y2="15" stroke="currentColor" strokeWidth="1.3" className="opacity-50" />
      <line x1="14" y1="3" x2="14" y2="15" stroke="currentColor" strokeWidth="1.3" className="opacity-50" />
      <circle cx="4" cy="11.5" r="2" fill="currentColor" />
      <circle cx="9" cy="7.5" r="2" fill="currentColor" />
      <circle cx="14" cy="11.5" r="2" fill="currentColor" />
    </svg>
  );
}

export function MasteryRingSvg({
  progress,
  size = 40,
  strokeWidth = 3.5,
  label,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (clamped / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      {label !== undefined && (
        <span className="absolute text-[11px] font-mono font-semibold tabular-nums text-foreground">
          {label}
        </span>
      )}
    </div>
  );
}

export function RadarChartSvg({
  skills,
  size = 240,
}: {
  skills: SkillRadarStats;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.34;
  const axes: { key: keyof SkillRadarStats; label: string }[] = [
    { key: 'mechanics', label: '운지 메카닉' },
    { key: 'fretboardVision', label: '지판·화성 시야' },
    { key: 'rhythmTiming', label: '리듬 정밀도' },
    { key: 'earCopy', label: '청음·귀카피' },
    { key: 'creativePhrasing', label: '반주·즉흥 표현' },
  ];

  const angleStep = (2 * Math.PI) / axes.length;
  const rings = [0.25, 0.5, 0.75, 1];

  const getPoint = (idx: number, valNorm: number) => {
    const angle = -Math.PI / 2 + idx * angleStep;
    return {
      x: cx + Math.cos(angle) * maxR * valNorm,
      y: cy + Math.sin(angle) * maxR * valNorm,
    };
  };

  const dataPoints = axes.map((ax, i) => getPoint(i, Math.max(0.12, skills[ax.key] / 100)));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible mx-auto">
      {rings.map((ring) => {
        const pts = axes.map((_, i) => getPoint(i, ring));
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';
        return <path key={ring} d={d} fill="none" stroke="var(--border)" strokeWidth="1" />;
      })}
      {axes.map((ax, i) => {
        const end = getPoint(i, 1);
        const labelPt = getPoint(i, 1.24);
        return (
          <g key={ax.key}>
            <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="var(--border)" strokeWidth="1" />
            <text
              x={labelPt.x}
              y={labelPt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] font-medium"
            >
              {ax.label}
            </text>
          </g>
        );
      })}
      <path d={dataPath} fill="rgba(232, 93, 63, 0.16)" stroke="var(--primary)" strokeWidth="1.8" />
      {dataPoints.map((pt, i) => (
        <circle key={axes[i].key} cx={pt.x} cy={pt.y} r="3.2" fill="var(--primary)" stroke="var(--card)" strokeWidth="1.2" />
      ))}
    </svg>
  );
}
