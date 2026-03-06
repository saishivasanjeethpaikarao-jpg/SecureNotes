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
  const [loading, setLoading] = useState(false);
  const [showBurst, setShowBurst] = useState(false);

  const receiver = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const handleSubmit = async (value: number) => {
    if (!reason.trim()) {
      toast.error('Please add a reason!');
      return;
    }
    setLoading(true);
    try {
      const newTotal = await onGiveStar(currentUser!, receiver, value, reason.trim(), message.trim() || undefined);
      if (value > 0) setShowBurst(true);
      
      // Check milestone
      if (newTotal > 0 && newTotal % 50 === 0) {
        const giftGiver = receiver === 'Nani' ? 'Ammu' : 'Nani';
        toast.success(`🎁 Gift Unlocked! ${receiver} reached ${newTotal} stars. ${giftGiver} owes a gift!`, {
          duration: 6000,
        });
      } else {
        toast.success(value > 0 ? `⭐ Star given to ${receiver}!` : `💔 Star removed from ${receiver}`);
      }
      setReason('');
      setMessage('');
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
          <p className="text-muted-foreground text-sm">Reward good actions or note bad ones</p>
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
