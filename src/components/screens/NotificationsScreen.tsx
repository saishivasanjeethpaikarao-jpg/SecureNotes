import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Star, MessageCircle, Phone, PhoneMissed, Gift, Gamepad2, Headphones, Heart } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'message' | 'star' | 'star_remove' | 'milestone' | 'missed_call' | 'game' | 'music';
  title: string;
  description: string;
  time: string;
  icon: string;
}

export default function NotificationsScreen() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

    const fetchAll = async () => {
      // Fetch recent stars, messages, calls, milestones in parallel
      const [starsRes, messagesRes, callsRes, milestonesRes, gamesRes] = await Promise.all([
        supabase.from('stars').select('*').eq('giver', partner).order('created_at', { ascending: false }).limit(20),
        supabase.from('messages').select('*').eq('sender', partner).order('created_at', { ascending: false }).limit(20),
        supabase.from('call_history').select('*').eq('receiver', currentUser).eq('status', 'missed').order('created_at', { ascending: false }).limit(10),
        supabase.from('milestones').select('*').order('reached_at', { ascending: false }).limit(10),
        supabase.from('game_results').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      const notifs: Notification[] = [];

      // Stars
      starsRes.data?.forEach((s: any) => {
        notifs.push({
          id: `star-${s.id}`,
          type: s.value > 0 ? 'star' : 'star_remove',
          title: s.value > 0 ? `⭐ ${partner} gave you ${Math.abs(s.value)} star${Math.abs(s.value) > 1 ? 's' : ''}` : `💔 ${partner} removed ${Math.abs(s.value)} star${Math.abs(s.value) > 1 ? 's' : ''}`,
          description: s.reason,
          time: s.created_at,
          icon: s.value > 0 ? 'star' : 'star_remove',
        });
      });

      // Messages (group - just show count hint)
      if (messagesRes.data && messagesRes.data.length > 0) {
        const recent = messagesRes.data.slice(0, 5);
        recent.forEach((m: any) => {
          const preview = m.type === 'image' ? '📷 Photo' : m.type === 'voice' ? '🎤 Voice note' : m.content?.slice(0, 60);
          notifs.push({
            id: `msg-${m.id}`,
            type: 'message',
            title: `💬 ${partner}`,
            description: preview,
            time: m.created_at,
            icon: 'message',
          });
        });
      }

      // Missed calls
      callsRes.data?.forEach((c: any) => {
        notifs.push({
          id: `call-${c.id}`,
          type: 'missed_call',
          title: `📞 Missed ${c.call_type} call`,
          description: `from ${c.caller}`,
          time: c.created_at,
          icon: 'missed_call',
        });
      });

      // Milestones
      milestonesRes.data?.forEach((m: any) => {
        const giftGiver = m.username === 'Nani' ? 'Ammu' : 'Nani';
        notifs.push({
          id: `milestone-${m.id}`,
          type: 'milestone',
          title: `🎁 ${m.username} reached ${m.milestone_value} stars!`,
          description: `${giftGiver} owes a gift! 🎉`,
          time: m.reached_at,
          icon: 'milestone',
        });
      });

      // Games
      gamesRes.data?.forEach((g: any) => {
        if (g.played_by !== currentUser) {
          notifs.push({
            id: `game-${g.id}`,
            type: 'game',
            title: `🎮 ${g.played_by} played ${g.game_type}`,
            description: g.result || 'Check the results!',
            time: g.created_at,
            icon: 'game',
          });
        }
      });

      // Sort by time
      notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(notifs.slice(0, 50));
      setLoading(false);
    };

    fetchAll();
  }, [currentUser]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'star': return <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />;
      case 'star_remove': return <Star className="w-5 h-5 text-muted-foreground" />;
      case 'message': return <MessageCircle className="w-5 h-5 text-primary" />;
      case 'missed_call': return <PhoneMissed className="w-5 h-5 text-destructive" />;
      case 'milestone': return <Gift className="w-5 h-5 text-pink-500" />;
      case 'game': return <Gamepad2 className="w-5 h-5 text-purple-500" />;
      case 'music': return <Headphones className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getNotifBg = (type: string) => {
    switch (type) {
      case 'star': return 'bg-yellow-500/10';
      case 'star_remove': return 'bg-muted';
      case 'message': return 'bg-primary/10';
      case 'missed_call': return 'bg-destructive/10';
      case 'milestone': return 'bg-pink-500/10';
      case 'game': return 'bg-purple-500/10';
      default: return 'bg-muted';
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return formatDistanceToNow(new Date(timeStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const d = new Date(n.time);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d');
    (acc[key] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-romantic text-foreground flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" /> Notifications
      </h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-muted-foreground font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">Activity from your partner will show up here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dateNotifs]) => (
          <div key={dateLabel}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{dateLabel}</p>
            <div className="space-y-2">
              {dateNotifs.map((n, idx) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 bg-card rounded-2xl p-3.5 border border-border/50 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-1"
                  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${getNotifBg(n.type)} flex items-center justify-center`}>
                    {getNotifIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{formatTime(n.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
