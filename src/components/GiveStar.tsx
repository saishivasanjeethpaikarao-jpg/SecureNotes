import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import StarBurst from './StarBurst';
import { toast } from 'sonner';

interface Props {
  onGiveStar: (giver: string, receiver: string, value: number, reason: string, message?: string) => Promise<number>;
}

const GiveStar = ({ onGiveStar }: Props) => {
  const { currentUser } = useAuth();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [starCount, setStarCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  // Strict permission: Nani can only give to Ammu, Ammu can only give to Nani
  const receiver = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const handleSubmit = async (value: number) => {
    if (!reason.trim()) {
      toast.error('Please add a reason!');
      return;
    }
    if (!currentUser) return;

    // Double-check: cannot give stars to self
    if (currentUser === receiver) {
      toast.error('You cannot give stars to yourself!');
      return;
    }

    setLoading(true);
    const actualValue = value > 0 ? starCount : -starCount;
    try {
      const newTotal = await onGiveStar(currentUser, receiver, actualValue, reason.trim(), message.trim() || undefined);
      if (value > 0) setShowBurst(true);
      
      if (newTotal > 0 && newTotal % 50 === 0) {
        const giftGiver = currentUser;
        toast.success(`🎁 Gift Unlocked! ${receiver} reached ${newTotal} stars. ${giftGiver} owes a gift!`, {
          duration: 6000,
        });
      } else {
        const absCount = Math.abs(actualValue);
        toast.success(value > 0 ? `⭐ ${absCount} star${absCount > 1 ? 's' : ''} given to ${receiver}!` : `💔 ${absCount} star${absCount > 1 ? 's' : ''} removed from ${receiver}`);
      }
      setReason('');
      setMessage('');
      setStarCount(1);
    } catch {
      toast.error('Something went wrong!');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <StarBurst show={showBurst} onDone={() => setShowBurst(false)} />

      <div className="bg-card rounded-2xl p-6 shadow-card">
        <div className="text-center mb-6">
          <Star className="w-12 h-12 text-star glow-star mx-auto mb-2 animate-float" fill="currentColor" />
          <h2 className="text-xl font-bold text-foreground">Give Star to {receiver}</h2>
          <p className="text-muted-foreground text-sm">
            You can only give stars to {receiver}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Reason *</label>
            <Input
              placeholder="e.g., Made breakfast, Said something sweet..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">How many stars?</label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10"
                onClick={() => setStarCount(Math.max(1, starCount - 1))}
                disabled={starCount <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-2xl font-bold text-foreground min-w-[3rem] text-center">{starCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl h-10 w-10"
                onClick={() => setStarCount(starCount + 1)}
              >
                <Star className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Message (optional)</label>
            <Textarea
              placeholder="Add a love note 💕"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="romantic"
              className="h-14 text-lg rounded-xl"
              onClick={() => handleSubmit(1)}
              disabled={loading}
            >
              <Star className="w-5 h-5 mr-1" fill="currentColor" /> Give Star
            </Button>
            <Button
              variant="outline"
              className="h-14 text-lg rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleSubmit(-1)}
              disabled={loading}
            >
              <Minus className="w-5 h-5 mr-1" /> Remove Star
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiveStar;
