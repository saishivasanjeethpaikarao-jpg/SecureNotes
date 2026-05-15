import { useEffect } from 'react';
import { X, Eye, Heart } from 'lucide-react';

interface InAppNotificationProps {
  title: string;
  message: string;
  visible: boolean;
  onView?: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function InAppNotification({
  title,
  message,
  visible,
  onView,
  onDismiss,
  autoDismissMs = 5000,
}: InAppNotificationProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [visible, autoDismissMs, onDismiss]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-top-6 fade-in zoom-in-95 duration-300">
      <div className="relative glass-pink rounded-3xl shadow-rose p-4 overflow-hidden">
        {/* shimmer accent */}
        <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-romantic flex items-center justify-center shadow-glow">
            <Heart className="w-5 h-5 text-white animate-heartbeat" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground font-display leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 w-7 h-7 -mr-1 -mt-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 pl-14">
          {onView && (
            <button
              onClick={() => { onView(); onDismiss(); }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full bg-gradient-romantic text-primary-foreground shadow-soft hover:shadow-rose transition-all active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              Open
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-4 py-1.5 text-xs font-semibold rounded-full bg-white/70 text-muted-foreground hover:bg-white transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
