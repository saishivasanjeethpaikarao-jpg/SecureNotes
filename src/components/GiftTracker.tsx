import { Gift, Star, Check } from 'lucide-react';
import { Totals, Milestone } from '@/hooks/useStarData';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import ProgressRing from './ProgressRing';

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
      const prevMilestone = m - 50;
      const starsInBucket = Math.max(0, Math.min(total - prevMilestone, 50));
      items.push({
        value: m,
        status: isReached ? (reached?.gift_given ? 'completed' : 'required') : 'upcoming',
        starsInBucket,
        progressPct: (starsInBucket / 50) * 100,
      });
    }
    return items;
  };

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

      {users.map((user) => {
        const nextMilestone = Math.ceil((user.total + 1) / 50) * 50;
        const prevMilestone = nextMilestone - 50;
        const starsToward = user.total - prevMilestone;
        const progressPct = (starsToward / 50) * 100;

        return (
          <div key={user.name} className="bg-card rounded-2xl p-5 shadow-card">
            <h3 className="font-semibold text-lg text-foreground mb-2">{user.emoji} {user.name}</h3>
            
            {/* Current progress toward next milestone */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-xl">
              <ProgressRing progress={progressPct} size={56} strokeWidth={4}>
                <span className="text-xs font-bold text-foreground">{starsToward}/50</span>
              </ProgressRing>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {user.total} ⭐ total
                </p>
                <p className="text-xs text-muted-foreground">
                  {50 - starsToward} more to reach {nextMilestone} ⭐
                </p>
              </div>
            </div>

            {/* Milestone list */}
            <div className="space-y-2.5">
              {getMilestonesForUser(user.name, user.total).map((ms) => {
                const isGiver = currentUser === getGiftGiver(user.name);
                const isMarking = marking === `${user.name}-${ms.value}`;
                const isCurrent = ms.status === 'upcoming' && ms.value === nextMilestone;

                return (
                  <div
                    key={ms.value}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                      ms.status === 'required'
                        ? 'gradient-romantic shadow-romantic'
                        : ms.status === 'completed'
                        ? 'bg-secondary'
                        : isCurrent
                        ? 'bg-muted border border-primary/20'
                        : 'bg-muted'
                    }`}
                  >
                    {ms.status === 'required' ? (
                      <Gift className="w-5 h-5 text-primary-foreground animate-pulse-glow shrink-0" />
                    ) : ms.status === 'completed' ? (
                      <Check className="w-5 h-5 text-accent shrink-0" />
                    ) : (
                      <Star className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium text-sm ${
                        ms.status === 'required' ? 'text-primary-foreground' : 'text-foreground'
                      }`}>
                        {ms.value} ⭐
                      </span>
                      {isCurrent && (
                        <div className="mt-1">
                          <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${ms.progressPct}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ms.starsInBucket}/50 stars</p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {ms.status === 'required' && isGiver ? (
                        <button
                          onClick={() => markGiftGiven(user.name, ms.value)}
                          disabled={isMarking}
                          className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isMarking ? '...' : '🎁 Mark Given'}
                        </button>
                      ) : (
                        <span className={`text-xs font-medium ${
                          ms.status === 'required'
                            ? 'text-primary-foreground'
                            : ms.status === 'completed'
                            ? 'text-accent'
                            : 'text-muted-foreground'
                        }`}>
                          {ms.status === 'required' ? '🎁 Gift required!' : ms.status === 'completed' ? '✅ Done' : isCurrent ? 'In progress' : 'Upcoming'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GiftTracker;
