import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  navigateTo?: string;
}

/**
 * Global notification hook — listens for realtime events and queues
 * in-app popup notifications for messages, stars, and milestones.
 */
export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notification, setNotification] = useState<AppNotification | null>(null);

  const dismiss = useCallback(() => setNotification(null), []);

  useEffect(() => {
    if (!currentUser) return;
    const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

    const channel = supabase
      .channel('global-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender === partner) {
          setNotification({
            id: `msg-${msg.id}`,
            title: 'SecureNotes',
            message: 'You have a new update',
            navigateTo: 'chat',
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stars' }, (payload) => {
        const star = payload.new as any;
        if (star.giver === partner) {
          setNotification({
            id: `star-${star.id}`,
            title: 'SecureNotes',
            message: 'You have a new update',
            navigateTo: 'home',
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'milestones' }, (payload) => {
        setNotification({
          id: `milestone-${(payload.new as any).id}`,
          title: 'SecureNotes',
          message: 'You have a new update',
          navigateTo: 'history',
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  return { notification, dismiss };
};
