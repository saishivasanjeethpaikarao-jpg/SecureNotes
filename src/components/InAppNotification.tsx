import { useState, useEffect, useCallback } from 'react';
import { X, Eye } from 'lucide-react';

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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          {onView && (
            <button
              onClick={() => { onView(); onDismiss(); }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
