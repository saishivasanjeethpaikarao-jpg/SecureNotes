import { Gift, Star, Check } from 'lucide-react';
import { Totals, Milestone } from '@/hooks/useStarData';

interface Props {
  totals: Totals;
  milestones: Milestone[];
}

const GiftTracker = ({ totals, milestones }: Props) => {
  const getMilestonesForUser = (username: string, total: number) => {
    const maxMilestone = Math.max(Math.ceil((total + 1) / 50) * 50, 50);
    const items = [];
    for (let m = 50; m <= maxMilestone + 50; m += 50) {
      const reached = milestones.find(ms => ms.username === username && ms.milestone_value === m);
      const isReached = total >= m;
      items.push({
        value: m,
        status: isReached ? (reached?.gift_given ? 'completed' : 'required') : 'upcoming',
      });
    }
    return items;
  };

  const users = [
    { name: 'Nani', emoji: '💜', total: totals.nani_total },
    { name: 'Ammu', emoji: '💖', total: totals.ammu_total },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Gift className="w-5 h-5 text-primary" /> Gift Milestones
      </h2>

      {users.map((user) => (
        <div key={user.name} className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="font-semibold text-lg text-foreground mb-4">{user.emoji} {user.name}</h3>
          <div className="space-y-3">
            {getMilestonesForUser(user.name, user.total).map((ms) => (
              <div
                key={ms.value}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  ms.status === 'required'
                    ? 'gradient-romantic shadow-romantic'
                    : ms.status === 'completed'
                    ? 'bg-secondary'
                    : 'bg-muted'
                }`}
              >
                {ms.status === 'required' ? (
                  <Gift className="w-5 h-5 text-primary-foreground animate-pulse-glow" />
                ) : ms.status === 'completed' ? (
                  <Check className="w-5 h-5 text-accent" />
                ) : (
                  <Star className="w-5 h-5 text-muted-foreground" />
                )}
                <span className={`font-medium ${
                  ms.status === 'required' ? 'text-primary-foreground' : 'text-foreground'
                }`}>
                  {ms.value} ⭐
                </span>
                <span className={`ml-auto text-sm font-medium ${
                  ms.status === 'required'
                    ? 'text-primary-foreground'
                    : ms.status === 'completed'
                    ? 'text-accent'
                    : 'text-muted-foreground'
                }`}>
                  {ms.status === 'required' ? '🎁 Gift required!' : ms.status === 'completed' ? '✅ Completed' : 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GiftTracker;
