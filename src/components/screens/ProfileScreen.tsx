import { useAuth } from '@/contexts/AuthContext';
import { Star, Gift, Crown, Heart, TrendingUp, Settings } from 'lucide-react';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';
import StarHistory from '@/components/StarHistory';
import GiftTracker from '@/components/GiftTracker';
import ProgressRing from '@/components/ProgressRing';
import avatarNani from '@/assets/avatar-nani.png';
import avatarAmmu from '@/assets/avatar-ammu.png';
import { useState } from 'react';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
}

type ProfileTab = 'stats' | 'history' | 'gifts';

const ProfileScreen = ({ totals, stars, milestones }: Props) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('stats');

  const isNani = currentUser === 'Nani';
  const avatar = isNani ? avatarNani : avatarAmmu;
  const myTotal = isNani ? totals.nani_total : totals.ammu_total;
  const partnerTotal = isNani ? totals.ammu_total : totals.nani_total;
  const partnerName = isNani ? 'Ammu' : 'Nani';

  const myStarsGiven = stars.filter(s => s.giver === currentUser).length;
  const myStarsReceived = stars.filter(s => s.receiver === currentUser).length;

  const getNextMilestone = (total: number) => Math.ceil((total + 1) / 50) * 50;
  const getProgress = (total: number) => {
    const next = getNextMilestone(total);
    const prev = next - 50;
    return Math.max(0, ((total - prev) / 50) * 100);
  };

  const TABS: { id: ProfileTab; label: string; icon: typeof Star }[] = [
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'history', label: 'History', icon: Star },
    { id: 'gifts', label: 'Gifts', icon: Gift },
  ];

  return (
    <div className="space-y-5">
      {/* Profile Card */}
      <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm text-center">
        <div className="relative inline-block mb-3">
          <img
            src={avatar}
            alt={currentUser || ''}
            className="w-20 h-20 rounded-full border-4 border-primary/30 shadow-lg object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow">
            {isNani ? '💙' : '💗'}
          </div>
        </div>
        <h2 className="text-xl font-bold font-romantic text-foreground">{currentUser}</h2>
        <p className="text-sm text-muted-foreground">In love with {partnerName} 💕</p>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-lg font-bold text-foreground">{myTotal}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">My Stars</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-lg font-bold text-foreground">{myStarsGiven}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Given</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-lg font-bold text-foreground">{myStarsReceived}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</p>
          </div>
        </div>

        {/* Progress to next milestone */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <ProgressRing progress={getProgress(myTotal)} size={48} strokeWidth={4}>
            <Star className="w-4 h-4 text-star" fill="currentColor" />
          </ProgressRing>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Next gift at {getNextMilestone(myTotal)} ⭐</p>
            <p className="text-xs text-muted-foreground">{getNextMilestone(myTotal) - myTotal} stars to go!</p>
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex bg-muted/50 rounded-2xl p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'stats' && (
        <div className="space-y-3">
          {/* Both users' stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Nani', total: totals.nani_total, emoji: '💜' },
              { name: 'Ammu', total: totals.ammu_total, emoji: '💖' },
            ].map((user) => (
              <div key={user.name} className="bg-card rounded-2xl p-4 border border-border/50 text-center">
                <p className="text-sm font-semibold text-foreground mb-2">{user.emoji} {user.name}</p>
                <ProgressRing progress={getProgress(user.total)} size={80} strokeWidth={5}>
                  <div className="text-center">
                    <Star className="w-4 h-4 text-star mx-auto mb-0.5" fill="currentColor" />
                    <span className="text-xl font-bold text-foreground">{user.total}</span>
                  </div>
                </ProgressRing>
                <p className="text-xs text-muted-foreground mt-2">Next at {getNextMilestone(user.total)} ⭐</p>
              </div>
            ))}
          </div>

          {/* Star Difference */}
          <div className="bg-card rounded-2xl p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Star Difference</span>
            </div>
            <p className="text-2xl font-bold text-gradient-romantic">
              {Math.abs(totals.nani_total - totals.ammu_total)} ⭐
            </p>
            <p className="text-xs text-muted-foreground">
              {totals.nani_total === totals.ammu_total
                ? 'Perfectly balanced! 💫'
                : `${totals.nani_total > totals.ammu_total ? 'Nani' : 'Ammu'} is ahead`}
            </p>
          </div>
        </div>
      )}
      {activeTab === 'history' && <StarHistory stars={stars} />}
      {activeTab === 'gifts' && <GiftTracker totals={totals} milestones={milestones} />}
    </div>
  );
};

export default ProfileScreen;
