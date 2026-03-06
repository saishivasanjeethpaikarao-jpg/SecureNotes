import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

interface Props {
  show: boolean;
  onDone: () => void;
}

const StarBurst = ({ show, onDone }: Props) => {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    if (show) {
      const p = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.cos((i * 30 * Math.PI) / 180) * 80,
        y: Math.sin((i * 30 * Math.PI) / 180) * 80,
        delay: i * 0.05,
      }));
      setParticles(p);
      setTimeout(onDone, 1000);
    }
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="relative">
        <Star className="w-16 h-16 text-star glow-star animate-star-burst" fill="currentColor" />
        {particles.map((p) => (
          <Star
            key={p.id}
            className="absolute w-6 h-6 text-star glow-star"
            fill="currentColor"
            style={{
              top: '50%',
              left: '50%',
              animation: `star-burst 0.8s ease-out ${p.delay}s forwards`,
              transform: `translate(${p.x}px, ${p.y}px)`,
              opacity: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default StarBurst;
