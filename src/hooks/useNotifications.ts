import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Global notification hook — listens for realtime events and shows toasts
 * for messages, star changes, and gift milestones from the OTHER user.
 */
export const useNotifications = () => {
  const { currentUser } = useAuth();
  const prevStarCountRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (!currentUser) return;
    const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

    // Fetch initial totals to track changes
    supabase.from('totals').select('*').single().then(({ data }) => {
      if (data) {
        prevStarCountRef.current = {
          nani_total: data.nani_total,
          ammu_total: data.ammu_total,
        };
      }
    });

    const channel = supabase
      .channel('global-notifications')
      // New message from partner
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender === partner) {
          const preview = msg.type === 'image' ? '📷 Photo' : msg.type === 'voice' ? '🎤 Voice note' : msg.content;
          toast(`💬 ${partner}`, {
            description: preview.length > 50 ? preview.slice(0, 50) + '...' : preview,
            duration: 4000,
          });
        }
      })
      // Star changes
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stars' }, (payload) => {
        const star = payload.new as any;
        if (star.giver === partner) {
          const abs = Math.abs(star.value);
          if (star.value > 0) {
            toast(`⭐ ${partner} gave you ${abs} star${abs > 1 ? 's' : ''}!`, {
              description: star.reason,
              duration: 5000,
            });
          } else {
            toast(`💔 ${partner} removed ${abs} star${abs > 1 ? 's' : ''}`, {
              description: star.reason,
              duration: 5000,
            });
          }
        }
      })
      // Milestone notifications
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'milestones' }, (payload) => {
        const milestone = payload.new as any;
        const giftGiver = milestone.username === 'Nani' ? 'Ammu' : 'Nani';
        toast(`🎁 Gift Milestone Reached!`, {
          description: `${milestone.username} hit ${milestone.milestone_value} stars! ${giftGiver} owes a gift! 🎉`,
          duration: 8000,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);
};
