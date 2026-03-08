import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { useStarData } from '@/hooks/useStarData';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import Login from './Login';
import HomeScreen from '@/components/screens/HomeScreen';
import Chat from '@/components/Chat';
import CoupleGames from '@/components/CoupleGames';
import MemoryTimeline from '@/components/MemoryTimeline';
import ListenTogether from '@/components/ListenTogether';
import HistoryScreen from '@/components/screens/HistoryScreen';
import MiniPlayer from '@/components/MiniPlayer';
import { Heart, Home, MessageCircle, Gamepad2, Headphones, BookHeart, ScrollText } from 'lucide-react';

type MainTab = 'home' | 'chat' | 'games' | 'together' | 'memories' | 'history';

const TAB_ORDER: MainTab[] = ['home', 'chat', 'games', 'together', 'memories', 'history'];

const Index = () => {
  const { currentUser } = useAuth();
  const { showMiniPlayer } = useMusic();
  const { totals, stars, milestones, loading, giveStar } = useStarData();
  const [tab, setTab] = useState<MainTab>('home');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
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

  if (!currentUser) return <Login />;
  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center gradient-romantic">
        <Heart className="w-12 h-12 text-primary-foreground animate-pulse" fill="currentColor" />
      </div>
    );
  }

  const handleTabChange = (newTab: MainTab) => {
    if (newTab === tab) return;
    const oldIdx = TAB_ORDER.indexOf(prevTabRef.current);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setSlideDirection(newIdx > oldIdx ? 'left' : 'right');
    setIsTransitioning(true);
    setTimeout(() => {
      setTab(newTab);
      prevTabRef.current = newTab;
      setIsTransitioning(false);
    }, 150);
  };

  const NAV_ITEMS: { id: MainTab; icon: typeof Home; label: string; badge?: number }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'together', icon: Headphones, label: 'Listen' },
    { id: 'memories', icon: BookHeart, label: 'Memories' },
  ];

  const getTitle = () => {
    switch (tab) {
      case 'home': return 'Couple Stars ✨';
      case 'chat': return '💬 Chat';
      case 'games': return '🎮 Games';
      case 'together': return '🎵 Listen Together';
      case 'memories': return '💕 Memories';
    }
  };

  const getSlideClass = () => {
    if (!isTransitioning) return 'animate-in fade-in duration-200';
    if (slideDirection === 'left') return 'animate-out fade-out slide-out-to-left-2 duration-150';
    return 'animate-out fade-out slide-out-to-right-2 duration-150';
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Fixed Header */}
      <header className="shrink-0 gradient-romantic px-4 py-3 shadow-romantic z-30">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-primary-foreground font-romantic">{getTitle()}</h1>
          <p className="text-primary-foreground/70 text-sm">Hi, {currentUser}! 💕</p>
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main className={`flex-1 min-h-0 ${tab === 'chat' ? '' : 'overflow-y-auto overscroll-contain'}`}>
        <div className={`${tab === 'chat' ? 'h-full' : 'p-4'} max-w-lg mx-auto ${getSlideClass()}`}>
          {tab === 'home' && (
            <HomeScreen
              totals={totals}
              stars={stars}
              milestones={milestones}
              giveStar={giveStar}
              onNavigate={(screen) => handleTabChange(screen as MainTab)}
            />
          )}
          {tab === 'chat' && (
            <div className="h-full px-4 py-2">
              <Chat onNavigateToListen={() => handleTabChange('together')} />
            </div>
          )}
          {tab === 'games' && <CoupleGames />}
          {tab === 'together' && <ListenTogether />}
          {tab === 'memories' && <MemoryTimeline />}
        </div>
      </main>

      {/* Mini Player */}
      {tab !== 'together' && (
        <MiniPlayer onOpenListen={() => handleTabChange('together')} />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="shrink-0 bg-card/95 backdrop-blur-lg border-t border-border z-40">
        <div className="flex justify-around max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = tab === item.id;
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

export default Index;
