import { useState, useEffect } from 'react';
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
import Chat from '@/components/Chat';
import CoupleGames from '@/components/CoupleGames';
import MemoryTimeline from '@/components/MemoryTimeline';
import ListenTogether from '@/components/ListenTogether';
import MiniPlayer from '@/components/MiniPlayer';
import { Heart, Home, MessageCircle, Phone, User, Settings } from 'lucide-react';

type MainTab = 'home' | 'chat' | 'calls' | 'profile' | 'settings';
type SubScreen = 'games' | 'together' | 'memories' | null;

const Index = () => {
  const { currentUser } = useAuth();
  const { showMiniPlayer } = useMusic();
  const { totals, stars, milestones, loading, giveStar } = useStarData();
  const [tab, setTab] = useState<MainTab>('home');
  const [subScreen, setSubScreen] = useState<SubScreen>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [missedCalls, setMissedCalls] = useState(0);
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

  if (!currentUser) return <Login />;
  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center gradient-romantic">
        <Heart className="w-12 h-12 text-primary-foreground animate-pulse" fill="currentColor" />
      </div>
    );
  }

  const handleNavigate = (screen: string) => {
    if (screen === 'games' || screen === 'together' || screen === 'memories') {
      setSubScreen(screen as SubScreen);
    }
  };

  const handleBackFromSub = () => {
    setSubScreen(null);
  };

  const handleTabChange = (newTab: MainTab) => {
    setSubScreen(null);
    setTab(newTab);
  };

  const NAV_ITEMS: { id: MainTab; icon: typeof Home; label: string; badge?: number }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'calls', icon: Phone, label: 'Calls', badge: missedCalls },
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Header title
  const getTitle = () => {
    if (subScreen === 'games') return '🎮 Games';
    if (subScreen === 'together') return '🎵 Listen Together';
    if (subScreen === 'memories') return '💕 Memories';
    switch (tab) {
      case 'home': return 'Couple Stars ✨';
      case 'chat': return '💬 Chat';
      case 'calls': return '📞 Calls';
      case 'profile': return '👤 Profile';
      case 'settings': return '⚙️ Settings';
    }
  };

  const hasMiniPlayer = showMiniPlayer && tab !== 'home' && subScreen !== 'together';

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <header className="shrink-0 gradient-romantic px-4 py-3 shadow-romantic z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            {subScreen && (
              <button
                onClick={handleBackFromSub}
                className="text-primary-foreground/80 hover:text-primary-foreground mr-1 text-lg"
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
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 max-w-lg mx-auto">
          {subScreen === 'games' && <CoupleGames />}
          {subScreen === 'together' && <ListenTogether />}
          {subScreen === 'memories' && <MemoryTimeline />}

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
            <Chat onNavigateToListen={() => { setTab('home'); setSubScreen('together'); }} />
          )}
          {!subScreen && tab === 'calls' && <CallsScreen />}
          {!subScreen && tab === 'profile' && (
            <ProfileScreen totals={totals} stars={stars} milestones={milestones} />
          )}
          {!subScreen && tab === 'settings' && <SettingsScreen />}
        </div>
      </main>

      {/* Mini Player */}
      {subScreen !== 'together' && (
        <MiniPlayer onOpenListen={() => { setTab('home'); setSubScreen('together'); }} />
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
                className={`relative flex flex-col items-center py-2.5 px-3 transition-all duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="relative">
                  <item.icon
                    className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {/* Notification badge */}
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`text-[10px] mt-1 font-medium transition-all ${isActive ? 'text-primary' : ''}`}>
                  {item.label}
                </span>
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
        {/* Safe area for phones with home indicator */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
};

export default Index;
