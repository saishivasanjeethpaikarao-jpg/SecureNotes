import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { useStarData } from '@/hooks/useStarData';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import Login from './Login';
import HomeScreen from '@/components/screens/HomeScreen';
import CallsScreen from '@/components/screens/CallsScreen';
import ProfileScreen from '@/components/screens/ProfileScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import NotificationsScreen from '@/components/screens/NotificationsScreen';
import Chat from '@/components/Chat';
import CoupleGames from '@/components/CoupleGames';
import MemoryTimeline from '@/components/MemoryTimeline';
import ListenTogether from '@/components/ListenTogether';
import MiniPlayer from '@/components/MiniPlayer';
import { Heart, Home, MessageCircle, Phone, Bell, User } from 'lucide-react';

type MainTab = 'home' | 'chat' | 'games' | 'together' | 'memories';
type SubScreen = 'settings' | null;

const TAB_ORDER: MainTab[] = ['home', 'chat', 'calls', 'notifications', 'profile'];

const Index = () => {
  const { currentUser } = useAuth();
  const { showMiniPlayer } = useMusic();
  const { totals, stars, milestones, loading, giveStar } = useStarData();
  const [tab, setTab] = useState<MainTab>('home');
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'up'>('left');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [missedCalls, setMissedCalls] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const prevTabRef = useRef<MainTab>('home');
  useNotifications();

  // Track unread messages
  useEffect(() => {
    if (!currentUser) return;
    const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender', partner)
        .eq('receiver', currentUser)
        .is('read_at', null);
      setUnreadMessages(count || 0);
    };

    fetchUnread();
    const channel = supabase
      .channel('unread-counter')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, tab]);

  // Track missed calls
  useEffect(() => {
    if (!currentUser) return;

    const fetchMissed = async () => {
      const { count } = await supabase
        .from('call_history')
        .select('*', { count: 'exact', head: true })
        .eq('receiver', currentUser)
        .eq('status', 'missed');
      setMissedCalls(count || 0);
    };

    fetchMissed();
    const channel = supabase
      .channel('missed-calls-counter')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_history' }, () => fetchMissed())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Track notification count (stars + milestones from partner)
  useEffect(() => {
    if (!currentUser) return;
    const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

    const fetchNotifCount = async () => {
      const { count } = await supabase
        .from('stars')
        .select('*', { count: 'exact', head: true })
        .eq('giver', partner);
      setNotifCount(count || 0);
    };

    fetchNotifCount();
  }, [currentUser]);

  if (!currentUser) return <Login />;
  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center gradient-romantic">
        <Heart className="w-12 h-12 text-primary-foreground animate-pulse" fill="currentColor" />
      </div>
    );
  }

  const handleNavigate = (screen: string) => {
    if (['games', 'together', 'memories', 'settings'].includes(screen)) {
      setSlideDirection('left');
      setIsTransitioning(true);
      setTimeout(() => {
        setSubScreen(screen as SubScreen);
        setIsTransitioning(false);
      }, 150);
    }
  };

  const handleBackFromSub = () => {
    setSlideDirection('right');
    setIsTransitioning(true);
    setTimeout(() => {
      setSubScreen(null);
      setIsTransitioning(false);
    }, 150);
  };

  const handleTabChange = (newTab: MainTab) => {
    if (newTab === tab && !subScreen) return;
    const oldIdx = TAB_ORDER.indexOf(prevTabRef.current);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setSlideDirection(newIdx > oldIdx ? 'left' : 'right');
    setIsTransitioning(true);
    setTimeout(() => {
      setSubScreen(null);
      setTab(newTab);
      prevTabRef.current = newTab;
      setIsTransitioning(false);
    }, 150);
  };

  const NAV_ITEMS: { id: MainTab; icon: typeof Home; label: string; badge?: number }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'calls', icon: Phone, label: 'Calls', badge: missedCalls },
    { id: 'notifications', icon: Bell, label: 'Alerts', badge: notifCount > 0 ? undefined : undefined },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  // Header title
  const getTitle = () => {
    if (subScreen === 'games') return '🎮 Games';
    if (subScreen === 'together') return '🎵 Listen Together';
    if (subScreen === 'memories') return '💕 Memories';
    if (subScreen === 'settings') return '⚙️ Settings';
    switch (tab) {
      case 'home': return 'Couple Stars ✨';
      case 'chat': return '💬 Chat';
      case 'calls': return '📞 Calls';
      case 'notifications': return '🔔 Notifications';
      case 'profile': return '👤 Profile';
    }
  };

  const getSlideClass = () => {
    if (!isTransitioning) return 'animate-in fade-in duration-200';
    if (slideDirection === 'left') return 'animate-out fade-out slide-out-to-left-2 duration-150';
    if (slideDirection === 'right') return 'animate-out fade-out slide-out-to-right-2 duration-150';
    return 'animate-out fade-out slide-out-to-bottom-2 duration-150';
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <header className="shrink-0 gradient-romantic px-4 py-3 shadow-romantic z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            {subScreen && (
              <button
                onClick={handleBackFromSub}
                className="text-primary-foreground/80 hover:text-primary-foreground mr-1 text-lg active:scale-90 transition-transform"
              >
                ←
              </button>
            )}
            <h1 className="text-lg font-bold text-primary-foreground font-romantic">{getTitle()}</h1>
          </div>
          <p className="text-primary-foreground/70 text-sm">Hi, {currentUser}! 💕</p>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main className={`flex-1 min-h-0 ${tab === 'chat' && !subScreen ? '' : 'overflow-y-auto overscroll-contain'}`}>
        <div className={`${tab === 'chat' && !subScreen ? 'h-full' : 'p-4'} max-w-lg mx-auto ${getSlideClass()}`}>
          {subScreen === 'games' && <CoupleGames />}
          {subScreen === 'together' && <ListenTogether />}
          {subScreen === 'memories' && <MemoryTimeline />}
          {subScreen === 'settings' && (
            <div className="space-y-4">
              <SettingsContent />
            </div>
          )}

          {!subScreen && tab === 'home' && (
            <HomeScreen
              totals={totals}
              stars={stars}
              milestones={milestones}
              giveStar={giveStar}
              onNavigate={handleNavigate}
            />
          )}
          {!subScreen && tab === 'chat' && (
            <div className="h-full px-4 py-2">
              <Chat onNavigateToListen={() => { setSubScreen('together'); }} />
            </div>
          )}
          {!subScreen && tab === 'calls' && <CallsScreen />}
          {!subScreen && tab === 'notifications' && <NotificationsScreen />}
          {!subScreen && tab === 'profile' && (
            <ProfileScreen totals={totals} stars={stars} milestones={milestones} onNavigate={handleNavigate} />
          )}
        </div>
      </main>

      {/* Mini Player */}
      {subScreen !== 'together' && (
        <MiniPlayer onOpenListen={() => setSubScreen('together')} />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="shrink-0 bg-card/95 backdrop-blur-lg border-t border-border z-40">
        <div className="flex justify-around max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = tab === item.id && !subScreen;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`relative flex flex-col items-center py-2.5 px-3 min-w-[56px] transition-all duration-200 active:scale-90 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <item.icon
                    className={`w-6 h-6 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-in zoom-in-50 duration-200">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-all ${isActive ? 'text-primary font-semibold' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 w-5 h-0.5 rounded-full bg-primary animate-in zoom-in-50 duration-200" />
                )}
              </button>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
};

// Settings content (now a sub-screen from Profile)
const SettingsContent = () => {
  const { currentUser, logout } = useAuth();
  const isNani = currentUser === 'Nani';

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {[
          { label: 'Privacy', desc: 'All media stored privately with secure links', emoji: '🔒' },
          { label: 'App Version', desc: 'Couple Stars v2.0', emoji: '📱' },
          { label: 'About', desc: 'Made with love for Nani & Ammu 💕', emoji: 'ℹ️' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
            <span className="text-lg">{item.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        className="w-full bg-destructive text-destructive-foreground rounded-2xl py-4 text-base font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        🚪 Logout
      </button>

      <div className="text-center pt-2 pb-4">
        <Heart className="w-5 h-5 text-primary mx-auto mb-1" fill="currentColor" />
        <p className="text-xs text-muted-foreground">Built with love 💕</p>
      </div>
    </div>
  );
};

export default Index;
