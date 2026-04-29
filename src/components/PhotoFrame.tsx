import { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FrameId =
  | 'none'
  | 'soft-love'
  | 'kawaii'
  | 'vintage'
  | 'luxury'
  | 'neon'
  | 'nature'
  | 'dark-mood'
  | 'festival'
  | 'polaroid'
  | 'film-strip'
  | 'dreamy-glow';

export interface FrameMeta {
  id: FrameId;
  label: string;
  emoji: string;
  category: string;
}

export const FRAMES: FrameMeta[] = [
  { id: 'none', label: 'None', emoji: '🚫', category: 'Basic' },
  { id: 'soft-love', label: 'Soft Love', emoji: '💕', category: 'Romantic' },
  { id: 'dreamy-glow', label: 'Dreamy', emoji: '✨', category: 'Romantic' },
  { id: 'kawaii', label: 'Kawaii', emoji: '🌸', category: 'Cute' },
  { id: 'festival', label: 'Festival', emoji: '🎉', category: 'Cute' },
  { id: 'vintage', label: 'Vintage', emoji: '📷', category: 'Retro' },
  { id: 'polaroid', label: 'Polaroid', emoji: '🖼️', category: 'Retro' },
  { id: 'film-strip', label: 'Film', emoji: '🎞️', category: 'Retro' },
  { id: 'luxury', label: 'Luxury', emoji: '👑', category: 'Premium' },
  { id: 'neon', label: 'Neon', emoji: '💜', category: 'Glow' },
  { id: 'nature', label: 'Nature', emoji: '🌿', category: 'Soft' },
  { id: 'dark-mood', label: 'Mood', emoji: '🖤', category: 'Cinematic' },
];

interface PhotoFrameProps {
  frame?: string | null;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  rounded?: string; // tailwind rounded class for inner photo
}

/**
 * Aesthetic photo frame overlay.
 * - Transparent center: photo (children) is rendered as-is.
 * - Decorative borders + corner/edge accents wrap the photo.
 * - Pure CSS + inline SVG, no external assets required.
 */
const PhotoFrame = ({ frame, children, className, style, rounded = 'rounded-lg' }: PhotoFrameProps) => {
  const f = (frame || 'none') as FrameId;
  if (f === 'none') {
    return <div className={cn('relative', className)} style={style}>{children}</div>;
  }

  // Per-frame outer decoration via wrapper styles
  const wrapperByFrame: Record<FrameId, string> = {
    none: '',
    'soft-love':
      'p-2 rounded-2xl bg-gradient-to-br from-pink-200/80 via-rose-100/70 to-purple-200/80 shadow-[0_8px_24px_-8px_rgba(244,114,182,0.45)]',
    'dreamy-glow':
      'p-2 rounded-2xl bg-gradient-to-br from-pink-300/70 via-fuchsia-200/60 to-amber-200/70 shadow-[0_0_30px_rgba(236,72,153,0.35)]',
    kawaii:
      'p-2 rounded-[1.5rem] bg-gradient-to-br from-pink-200 via-yellow-100 to-sky-200 shadow-[0_6px_18px_-6px_rgba(251,191,36,0.5)]',
    festival:
      'p-2 rounded-2xl bg-gradient-to-br from-fuchsia-300 via-amber-200 to-cyan-300 shadow-md',
    vintage:
      'p-3 rounded-md bg-[#efe6d2] shadow-[inset_0_0_12px_rgba(120,80,40,0.35)]',
    polaroid:
      'p-2 pb-10 rounded-sm bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.35)] rotate-[-1deg]',
    'film-strip':
      'py-1 px-3 bg-black rounded-sm shadow-md',
    luxury:
      'p-1.5 rounded-md bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400 shadow-[0_4px_18px_-4px_rgba(202,138,4,0.5)]',
    neon:
      'p-1.5 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_22px_rgba(217,70,239,0.65),0_0_40px_rgba(34,211,238,0.45)]',
    nature:
      'p-2 rounded-3xl bg-gradient-to-br from-emerald-200 via-lime-100 to-amber-100 shadow-[0_6px_16px_-6px_rgba(34,197,94,0.4)]',
    'dark-mood':
      'p-1.5 rounded-md bg-gradient-to-br from-zinc-900 via-red-950 to-black shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)]',
  };

  // Inner photo container — keeps photo intact, transparent center
  const innerByFrame: Partial<Record<FrameId, string>> = {
    'soft-love': 'rounded-xl ring-1 ring-white/70',
    'dreamy-glow': 'rounded-xl ring-1 ring-white/70',
    kawaii: 'rounded-[1.25rem] ring-2 ring-white',
    festival: 'rounded-xl ring-2 ring-white',
    vintage: 'rounded-sm ring-1 ring-amber-900/30 sepia-[.15] contrast-[1.05]',
    polaroid: 'rounded-none',
    'film-strip': 'rounded-none',
    luxury: 'rounded-sm ring-1 ring-amber-900/40',
    neon: 'rounded-xl ring-2 ring-black/40',
    nature: 'rounded-[1.5rem] ring-1 ring-emerald-700/20',
    'dark-mood': 'rounded-sm ring-1 ring-red-900/40 contrast-[1.08] saturate-[.85]',
  };

  return (
    <div className={cn('relative inline-block w-full', wrapperByFrame[f], className)} style={style}>
      <div className={cn('relative overflow-hidden', innerByFrame[f] || rounded)}>
        {children}

        {/* Soft Love / Dreamy: floating hearts */}
        {(f === 'soft-love' || f === 'dreamy-glow') && (
          <>
            <span className="pointer-events-none absolute top-1.5 left-2 text-pink-400/90 text-sm drop-shadow-sm">💕</span>
            <span className="pointer-events-none absolute top-2 right-2 text-rose-300/90 text-xs drop-shadow-sm">✨</span>
            <span className="pointer-events-none absolute bottom-2 left-3 text-fuchsia-300/90 text-xs drop-shadow-sm">✨</span>
            <span className="pointer-events-none absolute bottom-1.5 right-2 text-pink-400/90 text-sm drop-shadow-sm">💖</span>
          </>
        )}

        {/* Kawaii corners */}
        {f === 'kawaii' && (
          <>
            <span className="pointer-events-none absolute -top-1 -left-1 text-lg">🌸</span>
            <span className="pointer-events-none absolute -top-1 -right-1 text-lg">⭐</span>
            <span className="pointer-events-none absolute -bottom-1 -left-1 text-lg">☁️</span>
            <span className="pointer-events-none absolute -bottom-1 -right-1 text-lg">🌷</span>
          </>
        )}

        {/* Festival */}
        {f === 'festival' && (
          <>
            <span className="pointer-events-none absolute top-1 left-1 text-base">🎉</span>
            <span className="pointer-events-none absolute top-1 right-1 text-base">🎊</span>
            <span className="pointer-events-none absolute bottom-1 left-1 text-base">🥳</span>
            <span className="pointer-events-none absolute bottom-1 right-1 text-base">💫</span>
          </>
        )}

        {/* Vintage grain + dust */}
        {f === 'vintage' && (
          <div
            className="pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.4) 0.5px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.3) 0.5px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(0,0,0,0.35) 0.5px, transparent 1px)",
              backgroundSize: '6px 6px, 9px 9px, 5px 5px',
            }}
          />
        )}

        {/* Luxury inner border */}
        {f === 'luxury' && (
          <div className="pointer-events-none absolute inset-1 rounded-sm border border-amber-100/70" />
        )}

        {/* Neon glow inner ring */}
        {f === 'neon' && (
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/40 [box-shadow:inset_0_0_18px_rgba(255,255,255,0.35)]" />
        )}

        {/* Nature: leaves */}
        {f === 'nature' && (
          <>
            <span className="pointer-events-none absolute -top-1.5 -left-1 text-base rotate-[-25deg]">🌿</span>
            <span className="pointer-events-none absolute -top-1 -right-1 text-base rotate-[20deg]">🌸</span>
            <span className="pointer-events-none absolute -bottom-1 -left-1 text-base rotate-[15deg]">🦋</span>
            <span className="pointer-events-none absolute -bottom-1.5 -right-1 text-base rotate-[-10deg]">🍃</span>
          </>
        )}

        {/* Dark mood vignette */}
        {f === 'dark-mood' && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
          />
        )}
      </div>

      {/* Film strip perforations */}
      {f === 'film-strip' && (
        <>
          <div className="absolute top-0 left-0 right-0 h-1 flex justify-around items-center px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 bg-white/85 rounded-[1px]" />
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 flex justify-around items-center px-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 bg-white/85 rounded-[1px]" />
            ))}
          </div>
        </>
      )}

      {/* Polaroid caption space already included via pb-10 */}
    </div>
  );
};

export default PhotoFrame;

interface FramePickerProps {
  value?: string | null;
  onChange: (id: FrameId) => void;
  className?: string;
}

export const FramePicker = ({ value, onChange, className }: FramePickerProps) => {
  const current = (value || 'none') as FrameId;
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        🖼️ Photo Frame
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FRAMES.map((fr) => (
          <button
            key={fr.id}
            type="button"
            onClick={() => onChange(fr.id)}
            className={cn(
              'shrink-0 flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl border text-[10px] font-medium transition-all min-w-[64px]',
              current === fr.id
                ? 'border-primary bg-primary/10 ring-2 ring-primary/30 scale-105'
                : 'border-border bg-muted/40 hover:bg-muted'
            )}
          >
            <PhotoFrame frame={fr.id} className="w-10 h-10 !p-1">
              <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200" />
            </PhotoFrame>
            <span className="truncate max-w-[60px]">{fr.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};