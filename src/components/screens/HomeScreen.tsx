import { Star, Gamepad2, Headphones, BookHeart, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Dashboard from '@/components/Dashboard';
import GiveStar from '@/components/GiveStar';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';
import { useState } from 'react';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
  giveStar: (giver: string, receiver: string, value: number, reason: string, message?: string) => Promise<number>;
  onNavigate: (screen: string) => void;
}

const FEATURE_CARDS = [
  { id: 'give', icon: Star, label: 'Give Star', emoji: '⭐', color: 'from-yellow-400/20 to-amber-400/20', iconColor: 'text-yellow-500' },
  { id: 'games', icon: Gamepad2, label: 'Games', emoji: '🎮', color: 'from-purple-400/20 to-pink-400/20', iconColor: 'text-purple-500' },
  { id: 'together', icon: Headphones, label: 'Listen', emoji: '🎵', color: 'from-blue-400/20 to-cyan-400/20', iconColor: 'text-blue-500' },
  { id: 'memories', icon: BookHeart, label: 'Memories', emoji: '💕', color: 'from-pink-400/20 to-rose-400/20', iconColor: 'text-pink-500' },
];

const HomeScreen = ({ totals, stars, milestones, giveStar, onNavigate }: Props) => {
  const [showGiveStar, setShowGiveStar] = useState(false);

  return (
    <div className="space-y-5">
      {/* Compact Dashboard */}
      <Dashboard totals={totals} stars={stars} milestones={milestones} />

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {FEATURE_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => {
              if (card.id === 'give') {
                setShowGiveStar(true);
              } else {
                onNavigate(card.id);
              }
            }}
            className={`relative bg-gradient-to-br ${card.color} rounded-2xl p-4 flex flex-col items-center gap-2 
              border border-border/50 shadow-sm active:scale-95 transition-all duration-200
              hover:shadow-md hover:border-primary/30`}
          >
            <span className="text-2xl">{card.emoji}</span>
            <span className="text-sm font-semibold text-foreground">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Give Star Modal */}
      {showGiveStar && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl p-5 shadow-xl border border-border/50 animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-romantic text-foreground">Give a Star ⭐</h2>
              <button
                onClick={() => setShowGiveStar(false)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>
            <GiveStar onGiveStar={async (...args) => {
              const result = await giveStar(...args);
              setShowGiveStar(false);
              return result;
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
