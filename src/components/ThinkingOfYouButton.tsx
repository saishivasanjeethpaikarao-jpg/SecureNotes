import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const COOLDOWN_MS = 60 * 1000;
const STORAGE_KEY = 'thinking-of-you-last-sent';

const ThinkingOfYouButton = () => {
  const { currentUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    const tick = () => {
      const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - last));
      setCooldownLeft(left);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const send = async () => {
    if (!currentUser || sending || cooldownLeft > 0) return;
    setSending(true);
    try {
      // 1) Persist ping so the other user gets a realtime in-app toast
      const { error: dbError } = await supabase.from('pings').insert({
        sender: currentUser,
        receiver: partner,
        message: `${currentUser} is thinking of you right now 💭💕`,
      });
      if (dbError) throw dbError;

      // 2) Send push notification
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          type: 'ping',
          record: {
            sender: currentUser,
            receiver: partner,
            message: `${currentUser} is thinking of you right now 💭💕`,
          },
        },
      });
      if (error) throw error;
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setCooldownLeft(COOLDOWN_MS);
      toast.success(`💭 Sent! ${partner} will know you're thinking of them 💕`);
    } catch (err: any) {
      toast.error('Could not send ping. Try again.');
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const disabled = sending || cooldownLeft > 0;

  return (
    <button
      onClick={send}
      disabled={disabled}
      className={`relative w-full overflow-hidden rounded-2xl p-4 flex items-center justify-center gap-3
        border border-pink-300/40 shadow-romantic transition-all duration-200 active:scale-95
        ${disabled
          ? 'bg-muted/60 text-muted-foreground'
          : 'bg-gradient-to-r from-pink-400 via-rose-400 to-purple-400 text-white hover:shadow-lg'}`}
    >
      {!disabled && (
        <span className="absolute inset-0 -z-0 animate-pulse opacity-30 bg-gradient-to-r from-pink-300 via-rose-300 to-purple-300" />
      )}
      <Sparkles className={`w-5 h-5 ${disabled ? '' : 'animate-pulse'}`} fill={disabled ? 'none' : 'currentColor'} />
      <span className="text-base font-bold">
        {sending
          ? 'Sending...'
          : cooldownLeft > 0
            ? `Sent 💭 (wait ${Math.ceil(cooldownLeft / 1000)}s)`
            : `Thinking of ${partner} 💭`}
      </span>
    </button>
  );
};

export default ThinkingOfYouButton;