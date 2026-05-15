import { Star, Gamepad2, Headphones, BookHeart, Heart } from 'lucide-react';
import Dashboard from '@/components/Dashboard';
import GiveStar from '@/components/GiveStar';
import OnThisDay from '@/components/OnThisDay';
import ThinkingOfYouButton from '@/components/ThinkingOfYouButton';
import StarBurst from '@/components/StarBurst';
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
  { id: 'games', label: 'Games', sub: 'Play together', emoji: '🎮', color: 'from-violet-200 via-fuchsia-100 to-pink-100' },
  { id: 'together', label: 'Listen', sub: 'Same song, same time', emoji: '🎧', color: 'from-sky-200 via-cyan-100 to-blue-100' },
  { id: 'memories', label: 'Memories', sub: 'Our moments', emoji: '💞', color: 'from-pink-200 via-rose-100 to-orange-100' },
  { id: 'letters', label: 'Letters', sub: 'Future love notes', emoji: '💌', color: 'from-rose-200 via-pink-100 to-red-100' },
  { id: 'calendar', label: 'Calendar', sub: 'Special dates', emoji: '🗓️', color: 'from-emerald-200 via-teal-100 to-cyan-100' },
  { id: 'history', label: 'History', sub: 'Star journey', emoji: '✨', color: 'from-amber-200 via-yellow-100 to-orange-100' },
];

const HomeScreen = ({ totals, stars, milestones, giveStar, onNavigate }: Props) => {
  const [showGiveStar, setShowGiveStar] = useState(false);
  const [anniversaryInfo, setAnniversaryInfo] = useState(getAnniversaryInfo());
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);

  // Detect new milestones for celebration overlay
  useEffect(() => {
    if (seenIds === null) {
      setSeenIds(new Set(milestones.map((m) => m.id)));
      return;
    }
    const fresh = milestones.find((m) => !seenIds.has(m.id));
    if (fresh) {
      setCelebrate(fresh.milestone_value);
      setSeenIds(new Set(milestones.map((m) => m.id)));
    }
  }, [milestones, seenIds]);

  useEffect(() => {
    const timer = setInterval(() => setAnniversaryInfo(getAnniversaryInfo()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-5">
      {celebrate !== null && (
        <StarBurst show milestone={celebrate} onDone={() => setCelebrate(null)} />
      )}
      {/* Anniversary Countdown */}
      <div className="relative overflow-hidden rounded-3xl p-5 border border-primary/20 shadow-romantic">
        <img src={anniversaryBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative z-10 flex items-center gap-2 mb-3">
          <Heart className="w-4 h-4 text-pink-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]" fill="currentColor" />
          <span className="text-xs font-semibold text-white uppercase tracking-wider" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.5)' }}>Since She Knew I Exist</span>
        </div>
        <p className="relative z-10 font-romantic text-2xl text-white mb-1" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 16px rgba(0,0,0,0.5)' }}>
          {anniversaryInfo.years > 0 && `${anniversaryInfo.years} year${anniversaryInfo.years > 1 ? 's' : ''} `}
          {anniversaryInfo.months > 0 && `${anniversaryInfo.months} month${anniversaryInfo.months > 1 ? 's' : ''}`}
        </p>
        <p className="relative z-10 text-sm text-white mb-3" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.5)' }}>{anniversaryInfo.totalDays} days of love 💗</p>
        <div className="relative z-10 bg-black/30 backdrop-blur-sm rounded-2xl px-4 py-2.5 inline-flex items-center gap-2">
          <span className="text-lg">🎂</span>
          <span className="text-sm font-medium text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            {anniversaryInfo.daysUntilNext === 0
              ? `Happy ${anniversaryInfo.nextYears}${anniversaryInfo.nextYears === 1 ? 'st' : anniversaryInfo.nextYears === 2 ? 'nd' : anniversaryInfo.nextYears === 3 ? 'rd' : 'th'} Anniversary! 🎉`
              : `${anniversaryInfo.daysUntilNext} days until ${anniversaryInfo.nextYears}${anniversaryInfo.nextYears === 1 ? 'st' : anniversaryInfo.nextYears === 2 ? 'nd' : anniversaryInfo.nextYears === 3 ? 'rd' : 'th'} anniversary`
            }
          </span>
        </div>
      </div>

      {/* Dashboard */}
      <Dashboard totals={totals} stars={stars} milestones={milestones} />

      {/* Thinking of You */}
      <ThinkingOfYouButton />

      {/* On This Day */}
      <OnThisDay onOpen={() => onNavigate('memories')} />

      {/* Give Star Button */}
      <button
        onClick={() => setShowGiveStar(true)}
        className="group relative w-full overflow-hidden rounded-3xl p-[2px] shadow-soft hover:shadow-rose transition-all duration-300 active:scale-[0.98]"
      >
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-amber-300 via-yellow-200 to-orange-300" />
        <span className="relative flex items-center justify-center gap-3 rounded-[calc(1.5rem-2px)] px-5 py-4 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50">
          <span className="text-2xl glow-star animate-float-soft">⭐</span>
          <span className="font-display font-semibold text-[17px] text-foreground tracking-tight">Give a Star</span>
          <span className="font-script text-2xl text-amber-500 -mb-1">✦</span>
        </span>
      </button>

      {/* Quick Nav Cards — bento boutique */}
      <div className="grid grid-cols-2 gap-3">
        {NAV_CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => onNavigate(card.id)}
            className={`group relative overflow-hidden bg-gradient-to-br ${card.color} rounded-3xl p-4 flex flex-col items-start gap-1
              border border-white/60 shadow-soft active:scale-[0.97] transition-all duration-300
              hover:shadow-rose hover:-translate-y-0.5`}
          >
            <span aria-hidden className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/40 blur-xl" />
            <span className="relative text-3xl drop-shadow-sm">{card.emoji}</span>
            <span className="relative mt-1 font-display font-semibold text-[15px] text-foreground tracking-tight leading-none">
              {card.label}
            </span>
            <span className="relative font-script text-[15px] text-foreground/65 leading-none">
              {card.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Give Star Modal */}
      {showGiveStar && (
        <div className="fixed inset-0 z-50 bg-plum/30 backdrop-blur-md flex items-end sm:items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass rounded-t-3xl sm:rounded-3xl p-5 shadow-rose border border-white/50 animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-xl text-foreground tracking-tight">Give a Star ⭐</h2>
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
