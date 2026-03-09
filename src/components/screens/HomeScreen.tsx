import { Star, Gamepad2, Headphones, BookHeart, Heart } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import GiveStar from '@/components/GiveStar';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';
import { useState, useEffect } from 'react';
import anniversaryBg from '@/assets/anniversary-bg.jpg';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
  giveStar: (giver: string, receiver: string, value: number, reason: string, message?: string) => Promise<number>;
  onNavigate: (screen: string) => void;
}

const ANNIVERSARY_DATE = new Date('2024-04-03'); // April 3, 2024

const getAnniversaryInfo = () => {
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - ANNIVERSARY_DATE.getTime()) / (1000 * 60 * 60 * 24));
  const totalMonths = (now.getFullYear() - ANNIVERSARY_DATE.getFullYear()) * 12 + (now.getMonth() - ANNIVERSARY_DATE.getMonth());
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  // Next anniversary
  let nextAnniversary = new Date(ANNIVERSARY_DATE);
  nextAnniversary.setFullYear(now.getFullYear());
  if (nextAnniversary <= now) {
    nextAnniversary.setFullYear(now.getFullYear() + 1);
  }
  const daysUntilNext = Math.ceil((nextAnniversary.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const nextYears = nextAnniversary.getFullYear() - ANNIVERSARY_DATE.getFullYear();

  return { totalDays, years, months, daysUntilNext, nextYears };
};

const NAV_CARDS = [
  { id: 'games', label: 'Games', emoji: '🎮', color: 'from-purple-400/20 to-pink-400/20' },
  { id: 'together', label: 'Listen', emoji: '🎵', color: 'from-blue-400/20 to-cyan-400/20' },
  { id: 'memories', label: 'Memories', emoji: '💕', color: 'from-pink-400/20 to-rose-400/20' },
  { id: 'letters', label: 'Letters', emoji: '💌', color: 'from-red-400/20 to-pink-400/20' },
  { id: 'calendar', label: 'Calendar', emoji: '📅', color: 'from-green-400/20 to-teal-400/20' },
  { id: 'history', label: 'History', emoji: '📜', color: 'from-amber-400/20 to-orange-400/20' },
];

const HomeScreen = ({ totals, stars, milestones, giveStar, onNavigate }: Props) => {
  const [showGiveStar, setShowGiveStar] = useState(false);
  const [anniversaryInfo, setAnniversaryInfo] = useState(getAnniversaryInfo());

  useEffect(() => {
    const timer = setInterval(() => setAnniversaryInfo(getAnniversaryInfo()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5">
      {/* Anniversary Countdown */}
      <div className="relative overflow-hidden rounded-3xl p-5 border border-primary/20 shadow-romantic">
        <img src={anniversaryBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" />
        <div className="relative z-10 flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-primary" fill="currentColor" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Since She Knew I Exist</span>
        </div>
        <p className="font-romantic text-2xl text-foreground mb-1">
          {anniversaryInfo.years > 0 && `${anniversaryInfo.years} year${anniversaryInfo.years > 1 ? 's' : ''} `}
          {anniversaryInfo.months > 0 && `${anniversaryInfo.months} month${anniversaryInfo.months > 1 ? 's' : ''}`}
        </p>
        <p className="text-sm text-muted-foreground mb-3">{anniversaryInfo.totalDays} days of love 💗</p>
        <div className="bg-card/60 backdrop-blur-sm rounded-2xl px-4 py-2.5 inline-flex items-center gap-2">
          <span className="text-lg">🎂</span>
          <span className="text-sm font-medium text-foreground">
            {anniversaryInfo.daysUntilNext === 0
              ? `Happy ${anniversaryInfo.nextYears}${anniversaryInfo.nextYears === 1 ? 'st' : anniversaryInfo.nextYears === 2 ? 'nd' : anniversaryInfo.nextYears === 3 ? 'rd' : 'th'} Anniversary! 🎉`
              : `${anniversaryInfo.daysUntilNext} days until ${anniversaryInfo.nextYears}${anniversaryInfo.nextYears === 1 ? 'st' : anniversaryInfo.nextYears === 2 ? 'nd' : anniversaryInfo.nextYears === 3 ? 'rd' : 'th'} anniversary`
            }
          </span>
        </div>
      </div>

      {/* Dashboard */}
      <Dashboard totals={totals} stars={stars} milestones={milestones} />

      {/* Give Star Button */}
      <button
        onClick={() => setShowGiveStar(true)}
        className="w-full bg-gradient-to-r from-yellow-400/20 to-amber-400/20 rounded-2xl p-4 flex items-center justify-center gap-3
          border border-border/50 shadow-sm active:scale-95 transition-all duration-200 hover:shadow-md hover:border-primary/30"
      >
        <span className="text-2xl">⭐</span>
        <span className="text-base font-bold text-foreground">Give a Star</span>
      </button>

      {/* Quick Nav Cards */}
      <div className="grid grid-cols-2 gap-3">
        {NAV_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className={`bg-gradient-to-br ${card.color} rounded-2xl p-4 flex flex-col items-center gap-2
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
