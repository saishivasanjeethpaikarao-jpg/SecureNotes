import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { useStarData } from '@/hooks/useStarData';
import { useNotifications } from '@/hooks/useNotifications';
import InAppNotification from '@/components/InAppNotification';
import { supabase } from '@/integrations/supabase/client';
import Login from './Login';
import HomeScreen from '@/components/screens/HomeScreen';
import Chat from '@/components/Chat';
import CoupleGames from '@/components/CoupleGames';
import MemoryTimeline from '@/components/MemoryTimeline';
import Gallery from '@/components/Gallery';
import ListenTogether from '@/components/ListenTogether';
import HistoryScreen from '@/components/screens/HistoryScreen';
import LoveLettersVault from '@/components/LoveLettersVault';
import SharedCalendar from '@/components/SharedCalendar';
import MiniPlayer from '@/components/MiniPlayer';
import { Heart, Home, MessageCircle, Gamepad2, Headphones, BookHeart, ScrollText, Settings, LogOut, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type MainTab = 'home' | 'chat' | 'games' | 'together' | 'memories' | 'gallery' | 'history' | 'letters' | 'calendar';

const TAB_ORDER: MainTab[] = ['home', 'chat', 'games', 'together', 'memories', 'gallery', 'history', 'letters', 'calendar'];

const Index = () => {
  const { currentUser, logout } = useAuth();
  const { showMiniPlayer } = useMusic();
  const { totals, stars, milestones, loading, giveStar } = useStarData();
  const [tab, setTab] = useState<MainTab>('home');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [missedCalls, setMissedCalls] = useState(0);
  const [forceShow, setForceShow] = useState(false);
  const prevTabRef = useRef<MainTab>('home');
  const { notification, dismiss } = useNotifications();

  // Force show after 2s even if data hasn't loaded
  useEffect(() => {
    const timer = setTimeout(() => setForceShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Reset to home tab on login
  useEffect(() => {
    if (currentUser) {
      setTab('home');
      prevTabRef.current = 'home';
    }
  }, [currentUser]);

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

    const fetchMissedCalls = async () => {
      const { count } = await supabase
        .from('call_history')
        .select('*', { count: 'exact', head: true })
        .eq('receiver', currentUser)
        .eq('status', 'missed');
      setMissedCalls(count || 0);
    };

    fetchUnread();
    fetchMissedCalls();

    const channel = supabase
      .channel('unread-counter')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetchUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_history' }, () => fetchMissedCalls())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  if (!currentUser) return <Login />;

  if (loading && !forceShow) {
    return (
      <div className="h-[100dvh] flex items-center justify-center gradient-romantic">
        <Heart className="w-12 h-12 text-primary-foreground animate-pulse" fill="currentColor" />
      </div>
    );
  }

  const handleTabChange = (newTab: MainTab) => {
    if (newTab === tab) return;
    if (newTab === 'chat') setUnreadMessages(0);
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
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: (unreadMessages || 0) + (missedCalls || 0) },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'together', icon: Headphones, label: 'Listen' },
    { id: 'memories', icon: BookHeart, label: 'Memories' },
    { id: 'history', icon: ScrollText, label: 'History' },
  ];

  const getTitle = () => {
    switch (tab) {
      case 'home': return 'Couple Stars';
      case 'chat': return 'Chat';
      case 'games': return 'Games';
      case 'together': return 'Listen Together';
      case 'memories': return 'Memories';
      case 'gallery': return 'Gallery';
      case 'history': return 'History';
      case 'letters': return 'Love Letters';
      case 'calendar': return 'Calendar';
    }
  };

  const getSlideClass = () => {
    if (!isTransitioning) return 'animate-in fade-in duration-200';
    if (slideDirection === 'left') return 'animate-out fade-out slide-out-to-left-2 duration-150';
    return 'animate-out fade-out slide-out-to-right-2 duration-150';
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* In-App Notification Popup */}
      <InAppNotification
        title={notification?.title ?? 'SecureNotes'}
        message={notification?.message ?? ''}
        visible={!!notification}
        onDismiss={dismiss}
        onView={() => {
          if (notification?.navigateTo) handleTabChange(notification.navigateTo as MainTab);
          dismiss();
        }}
      />
      {/* Fixed Header */}
      <header className="shrink-0 relative gradient-romantic px-4 py-3.5 shadow-romantic z-30 overflow-hidden">
        <span aria-hidden className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-white/15 blur-3xl" />
        <span aria-hidden className="absolute -bottom-12 -right-8 w-44 h-44 rounded-full bg-pink-200/25 blur-3xl" />
        <div className="relative flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative shrink-0 w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-glow">
              <Heart className="w-4 h-4 text-white animate-heartbeat" fill="currentColor" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-200 animate-pulse" fill="currentColor" />
            </span>
            <h1 className="font-display font-semibold text-[19px] tracking-tight text-primary-foreground truncate">
              {getTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-primary-foreground/85 text-sm font-script text-[17px] hidden xs:block sm:block">Hi {currentUser} 💕</p>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-primary-foreground/90 hover:text-primary-foreground hover:bg-white/25 transition-all active:scale-90">
                  <Settings className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-2">
                <div className="space-y-1">
                  <div className="px-3 py-2 text-xs text-muted-foreground">Couple Stars v2.0</div>
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
          {tab === 'memories' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTabChange('memories')}
                  className="flex-1 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-sm"
                >
                  💕 Timeline
                </button>
                <button
                  onClick={() => handleTabChange('gallery')}
                  className="flex-1 py-2 rounded-full text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  📷 Gallery
                </button>
              </div>
              <MemoryTimeline />
            </div>
          )}
          {tab === 'gallery' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleTabChange('memories')}
                  className="flex-1 py-2 rounded-full text-sm font-semibold bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  💕 Timeline
                </button>
                <button
                  onClick={() => handleTabChange('gallery')}
                  className="flex-1 py-2 rounded-full text-sm font-semibold bg-primary text-primary-foreground shadow-sm"
                >
                  📷 Gallery
                </button>
              </div>
              <Gallery />
            </div>
          )}
          {tab === 'history' && <HistoryScreen totals={totals} stars={stars} milestones={milestones} />}
          {tab === 'letters' && <LoveLettersVault />}
          {tab === 'calendar' && <SharedCalendar />}
        </div>
      </main>

      {/* Mini Player */}
      {tab !== 'together' && (
        <MiniPlayer onOpenListen={() => handleTabChange('together')} />
      )}

      {/* Fixed Bottom Navigation */}
      <nav className="shrink-0 relative bg-card/80 backdrop-blur-2xl border-t border-border/60 z-40 shadow-[0_-4px_20px_-12px_hsl(340_60%_60%/0.25)]">
        <div className="flex justify-around max-w-lg mx-auto px-1">
          {NAV_ITEMS.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`relative flex flex-col items-center py-2 px-2 min-w-[56px] rounded-2xl mx-0.5 my-1 transition-all duration-300 active:scale-90 ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80'
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-1 rounded-2xl bg-gradient-blush opacity-90 animate-in zoom-in-95 fade-in duration-300"
                  />
                )}
                <div className="relative">
                  <item.icon
                    className={`relative w-[22px] h-[22px] transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_2px_6px_hsl(340_80%_60%/0.5)]' : ''}`}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-rose ring-2 ring-card animate-in zoom-in-50 duration-200">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : null}
                </div>
                <span className={`relative text-[10px] mt-1 font-medium transition-all ${isActive ? 'text-primary font-bold' : ''}`}>
                  {item.label}
                </span>
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
