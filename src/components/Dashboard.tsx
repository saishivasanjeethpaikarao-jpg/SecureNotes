import { Star, Gift, TrendingUp, Heart } from 'lucide-react';
import ProgressRing from './ProgressRing';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
}

const Dashboard = ({ totals, stars, milestones }: Props) => {
  const getNextMilestone = (total: number) => Math.ceil((total + 1) / 50) * 50;
  const getProgress = (total: number) => {
    const next = getNextMilestone(total);
    const prev = next - 50;
    return Math.max(0, ((total - prev) / 50) * 100);
  };

  const naniNext = getNextMilestone(totals.nani_total);
  const ammuNext = getNextMilestone(totals.ammu_total);

  return (
    <div className="space-y-6">
      {/* Star Counts */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: 'Nani', total: totals.nani_total, emoji: '💜', next: naniNext, progress: getProgress(totals.nani_total) },
          { name: 'Ammu', total: totals.ammu_total, emoji: '💖', next: ammuNext, progress: getProgress(totals.ammu_total) },
        ].map((user) => (
          <div key={user.name} className="bg-card rounded-2xl p-5 shadow-card text-center">
            <p className="text-lg font-semibold text-foreground mb-3">{user.emoji} {user.name}</p>
            <ProgressRing progress={user.progress} size={100} strokeWidth={6}>
              <div className="text-center">
                <Star className="w-5 h-5 text-star glow-star mx-auto mb-1" fill="currentColor" />
                <span className="text-2xl font-bold text-foreground">{user.total}</span>
              </div>
            </ProgressRing>
            <p className="text-xs text-muted-foreground mt-2">Next gift at {user.next} ⭐</p>
          </div>
        ))}
      </div>

      {/* Star Difference */}
      <div className="bg-card rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Star Difference</h3>
        </div>
        <p className="text-3xl font-bold text-gradient-romantic">
          {Math.abs(totals.nani_total - totals.ammu_total)} ⭐
        </p>
        <p className="text-sm text-muted-foreground">
          {totals.nani_total > totals.ammu_total
            ? 'Nani is leading! 💜'
            : totals.ammu_total > totals.nani_total
            ? 'Ammu is leading! 💖'
            : 'Both are equal! 💕'}
        </p>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-3">
          {stars.slice(0, 5).map((star) => (
            <div key={star.id} className="flex items-center gap-3 text-sm">
              <span className={`text-lg ${star.value > 0 ? 'text-star' : 'text-destructive'}`}>
                {star.value > 0 ? '⭐' : '💔'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">
                  <span className="font-medium">{star.giver}</span> → <span className="font-medium">{star.receiver}</span>
                </p>
                <p className="text-muted-foreground truncate">{star.reason}</p>
              </div>
              <span className={`font-bold ${star.value > 0 ? 'text-star' : 'text-destructive'}`}>
                {star.value > 0 ? `+${star.value}` : star.value}
              </span>
            </div>
          ))}
          {stars.length === 0 && (
            <p className="text-muted-foreground text-center py-4">No stars yet! Start rewarding 💕</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
