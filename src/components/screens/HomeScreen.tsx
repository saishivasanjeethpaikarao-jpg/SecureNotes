import { Star, Gamepad2, Headphones, BookHeart } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import GiveStar from '@/components/GiveStar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GiftTracker from '@/components/GiftTracker';
import StarHistory from '@/components/StarHistory';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';
import { useState } from 'react';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
  giveStar: (giver: string, receiver: string, value: number, reason: string, message?: string) => Promise<number>;
  onNavigate: (screen: string) => void;
}

const NAV_CARDS = [
  { id: 'games', label: 'Games', emoji: '🎮', color: 'from-purple-400/20 to-pink-400/20' },
  { id: 'together', label: 'Listen', emoji: '🎵', color: 'from-blue-400/20 to-cyan-400/20' },
  { id: 'memories', label: 'Memories', emoji: '💕', color: 'from-pink-400/20 to-rose-400/20' },
];

const HomeScreen = ({ totals, stars, milestones, giveStar, onNavigate }: Props) => {
  const [showGiveStar, setShowGiveStar] = useState(false);

  return (
    <div className="space-y-5">
      {/* Dashboard */}
      <Dashboard totals={totals} stars={stars} milestones={milestones} />

      {/* Give Star Button — standalone section */}
      <button
        onClick={() => setShowGiveStar(true)}
        className="w-full bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-2xl p-4 flex items-center justify-center gap-3
          border border-border/50 shadow-sm active:scale-95 transition-all duration-200 hover:shadow-md hover:border-primary/30"
      >
        <span className="text-2xl">⭐</span>
        <span className="text-base font-bold text-foreground">Give a Star</span>
      </button>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-3 gap-3">
        {NAV_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-3 flex flex-col items-center gap-1.5
              border border-border/50 shadow-sm active:scale-95 transition-all duration-200
              hover:shadow-md hover:border-primary/30`}
          >
            <span className="text-xl">{card.emoji}</span>
            <span className="text-xs font-semibold text-foreground">{card.label}</span>
          </button>
        ))}
      </div>

      {/* Gift Milestones — separate section */}
      <section className="space-y-3">
        <GiftTracker totals={totals} milestones={milestones} />
      </section>

      {/* Star History — separate section */}
      <section className="space-y-3">
        <StarHistory stars={stars} />
      </section>

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
