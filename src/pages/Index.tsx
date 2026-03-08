import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStarData } from '@/hooks/useStarData';
import { useNotifications } from '@/hooks/useNotifications';
import Login from './Login';
import Dashboard from '@/components/Dashboard';
import GiveStar from '@/components/GiveStar';
import StarHistory from '@/components/StarHistory';
import GiftTracker from '@/components/GiftTracker';
import Chat from '@/components/Chat';
import CoupleGames from '@/components/CoupleGames';
import MemoryTimeline from '@/components/MemoryTimeline';
import { Button } from '@/components/ui/button';
import { Home, Star, Clock, Gift, LogOut, Heart, MessageCircle, Gamepad2, BookHeart } from 'lucide-react';

type Tab = 'dashboard' | 'give' | 'history' | 'gifts' | 'chat' | 'games' | 'memories';

const Index = () => {
  const { currentUser, logout } = useAuth();
  const { totals, stars, milestones, loading, giveStar } = useStarData();
  const [tab, setTab] = useState<Tab>('dashboard');
  useNotifications();

  if (!currentUser) return <Login />;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-romantic">
        <Heart className="w-12 h-12 text-primary-foreground animate-pulse" fill="currentColor" />
      </div>
    );
  }

  const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'give', icon: Star, label: 'Give' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'games', icon: Gamepad2, label: 'Games' },
    { id: 'memories', icon: BookHeart, label: 'Memories' },
    { id: 'history', icon: Clock, label: 'History' },
    { id: 'gifts', icon: Gift, label: 'Gifts' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-romantic p-4 pb-6 rounded-b-3xl shadow-romantic">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-foreground font-romantic">Couple Stars ✨</h1>
            <p className="text-primary-foreground/80 text-sm">Hi, {currentUser}! 💕</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-lg mx-auto">
        {tab === 'dashboard' && <Dashboard totals={totals} stars={stars} milestones={milestones} />}
        {tab === 'give' && <GiveStar onGiveStar={giveStar} />}
        {tab === 'history' && <StarHistory stars={stars} />}
        {tab === 'gifts' && <GiftTracker totals={totals} milestones={milestones} />}
        {tab === 'chat' && <Chat />}
        {tab === 'games' && <CoupleGames />}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="flex justify-around max-w-lg mx-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center py-3 px-4 transition-colors ${
                tab === t.id ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <t.icon className="w-5 h-5" fill={tab === t.id ? 'currentColor' : 'none'} />
              <span className="text-xs mt-1 font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
