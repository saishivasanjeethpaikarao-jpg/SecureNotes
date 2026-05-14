import { useEffect, useState } from 'react';
import { Star, Heart, Sparkles } from 'lucide-react';

interface Props {
  show: boolean;
  onDone: () => void;
  milestone?: number; // if provided, show big celebration
}

type Particle = {
  id: number;
  x: number;
  y: number;
  delay: number;
  kind: 'star' | 'heart' | 'sparkle';
  size: number;
  hue: number;
};

const StarBurst = ({ show, onDone, milestone }: Props) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const big = !!milestone;

  useEffect(() => {
    if (!show) return;
    const count = big ? 36 : 18;
    const radius = big ? 180 : 110;
    const kinds: Particle['kind'][] = ['star', 'heart', 'sparkle'];
    const p: Particle[] = Array.from({ length: count }, (_, i) => {
      const angle = (i * (360 / count) * Math.PI) / 180;
      const dist = radius * (0.65 + Math.random() * 0.55);
      return {
        id: i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        delay: (i % 8) * 0.04,
        kind: kinds[i % 3],
        size: 14 + Math.random() * (big ? 22 : 14),
        hue: [340, 350, 20, 45, 280][i % 5],
      };
    });
    setParticles(p);
    const t = setTimeout(onDone, big ? 2600 : 1100);
    return () => clearTimeout(t);
  }, [show, onDone, big]);

  if (!show) return null;

  const Icon = ({ kind, ...rest }: { kind: Particle['kind'] } & React.SVGProps<SVGSVGElement>) => {
    if (kind === 'heart') return <Heart {...rest} />;
    if (kind === 'sparkle') return <Sparkles {...rest} />;
    return <Star {...rest} />;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      {big && (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-amber-300/20 backdrop-blur-[2px] animate-in fade-in duration-300" />
      )}
      <div className="relative">
        {big && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center whitespace-nowrap">
            <div
              className="font-romantic text-5xl bg-gradient-to-r from-pink-500 via-rose-400 to-amber-400 bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(236,72,153,0.4)]"
              style={{ animation: 'star-burst 0.6s ease-out forwards' }}
            >
              {milestone} ⭐
            </div>
            <div
              className="mt-2 text-sm font-bold text-foreground/80"
              style={{ animation: 'star-burst 0.8s ease-out 0.2s forwards', opacity: 0 }}
            >
              Milestone unlocked! 🎉
            </div>
          </div>
        )}
        {!big && (
          <Star className="w-16 h-16 text-star glow-star animate-star-burst" fill="currentColor" />
        )}
        {particles.map((p) => (
          <Icon
            key={p.id}
            kind={p.kind}
            className="absolute glow-star"
            fill="currentColor"
            style={{
              top: '50%',
              left: '50%',
              width: `${p.size}px`,
              height: `${p.size}px`,
              color: `hsl(${p.hue} 90% 60%)`,
              animation: `star-burst ${big ? 1.4 : 0.9}s ease-out ${p.delay}s forwards`,
              transform: `translate(${p.x}px, ${p.y}px) rotate(${p.id * 23}deg)`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default StarBurst;
