import { Gift, Star, Check } from 'lucide-react';
import { Totals, Milestone } from '@/hooks/useStarData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';

interface Props {
  totals: Totals;
  milestones: Milestone[];
}

const GiftTracker = ({ totals, milestones }: Props) => {
  const { currentUser } = useAuth();
  const [marking, setMarking] = useState<string | null>(null);

  const markGiftGiven = async (username: string, milestoneValue: number) => {
    const key = `${username}-${milestoneValue}`;
    setMarking(key);
    try {
      const milestone = milestones.find(ms => ms.username === username && ms.milestone_value === milestoneValue);
      if (milestone) {
        await supabase.from('milestones').update({ gift_given: true }).eq('id', milestone.id);
        toast.success(`Gift marked as given for ${username} at ${milestoneValue} ⭐!`);
      }
    } catch {
      toast.error('Failed to update milestone');
    } finally {
      setMarking(null);
    }
  };

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

  // The opposite partner gives the gift
  const getGiftGiver = (username: string) => username === 'Nani' ? 'Ammu' : 'Nani';

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
            {getMilestonesForUser(user.name, user.total).map((ms) => {
              const isGiver = currentUser === getGiftGiver(user.name);
              const isMarking = marking === `${user.name}-${ms.value}`;
              return (
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
                  <div className="ml-auto flex items-center gap-2">
                    {ms.status === 'required' && isGiver ? (
                      <button
                        onClick={() => markGiftGiven(user.name, ms.value)}
                        disabled={isMarking}
                        className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                      >
                        {isMarking ? '...' : '🎁 Mark Given'}
                      </button>
                    ) : (
                      <span className={`text-sm font-medium ${
                        ms.status === 'required'
                          ? 'text-primary-foreground'
                          : ms.status === 'completed'
                          ? 'text-accent'
                          : 'text-muted-foreground'
                      }`}>
                        {ms.status === 'required' ? '🎁 Gift required!' : ms.status === 'completed' ? '✅ Completed' : 'Upcoming'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default GiftTracker;
