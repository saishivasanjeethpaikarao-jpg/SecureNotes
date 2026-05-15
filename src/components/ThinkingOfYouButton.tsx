import { useState, useEffect, useMemo } from 'react';
import { Heart, Sparkles } from 'lucide-react';
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

  const sparkles = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      id: i,
      dx: (i - 2.5) * 14,
      delay: i * 0.08,
      size: 8 + (i % 3) * 4,
    })),
    []
  );
  const cooldownPct = cooldownLeft > 0 ? (1 - cooldownLeft / COOLDOWN_MS) * 100 : 100;

  return (
    <button
      onClick={send}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-3xl p-[2px] transition-all duration-300 active:scale-[0.98]
        ${disabled ? 'opacity-90' : 'shadow-rose hover:-translate-y-0.5'}`}
    >
      {/* Animated gradient ring */}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-3xl ${disabled ? 'bg-muted' : 'bg-gradient-romantic'}`}
      />
      {/* Shimmer sweep when active */}
      {!disabled && (
        <span className="pointer-events-none absolute inset-0 rounded-3xl animate-shimmer opacity-60" />
      )}

      {/* Inner pill */}
      <span
        className={`relative flex items-center justify-center gap-3 rounded-[calc(1.5rem-2px)] px-5 py-4
          ${disabled
            ? 'bg-muted/80 text-muted-foreground'
            : 'bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 text-white'}`}
      >
        {/* Sparkle particles */}
        {!disabled && sparkles.map((s) => (
          <span
            key={s.id}
            className="pointer-events-none absolute left-1/2 top-1/2 animate-sparkle-rise"
            style={{
              ['--dx' as any]: `${s.dx}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: '2.2s',
              animationIterationCount: 'infinite',
            }}
          >
            <Sparkles
              className="text-white/90"
              style={{ width: s.size, height: s.size }}
              fill="currentColor"
            />
          </span>
        ))}

        <span className="relative">
          <Heart
            className={`w-5 h-5 ${disabled ? '' : 'animate-heartbeat'}`}
            fill={disabled ? 'none' : 'currentColor'}
          />
          {!disabled && (
            <span className="absolute inset-0 rounded-full blur-md bg-white/40 -z-10" />
          )}
        </span>

        <span className="relative font-display font-semibold tracking-tight text-[17px]">
          {sending
            ? 'Sending love…'
            : cooldownLeft > 0
              ? `Sent 💭 ${Math.ceil(cooldownLeft / 1000)}s`
              : `Thinking of ${partner}`}
        </span>

        {!disabled && (
          <span className="font-script text-2xl text-white/95 -mb-1 ml-1">♥</span>
        )}
      </span>

      {/* Cooldown progress bar */}
      {cooldownLeft > 0 && (
        <span
          aria-hidden
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-pink-400 to-fuchsia-400 transition-all duration-1000 rounded-full"
          style={{ width: `${cooldownPct}%` }}
        />
      )}
    </button>
  );
};

export default ThinkingOfYouButton;