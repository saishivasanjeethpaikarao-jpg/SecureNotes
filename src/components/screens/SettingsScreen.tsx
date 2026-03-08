import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Heart, Shield, Info, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import avatarNani from '@/assets/avatar-nani.png';
import avatarAmmu from '@/assets/avatar-ammu.png';

const SettingsScreen = () => {
  const { currentUser, logout } = useAuth();
  const isNani = currentUser === 'Nani';
  const avatar = isNani ? avatarNani : avatarAmmu;

  const SETTINGS_ITEMS = [
    {
      icon: Shield,
      label: 'Privacy',
      description: 'All media is stored privately with secure links',
      action: null,
    },
    {
      icon: Smartphone,
      label: 'App Version',
      description: 'Couple Stars v2.0',
      action: null,
    },
    {
      icon: Info,
      label: 'About',
      description: 'Made with love for Nani & Ammu 💕',
      action: null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="bg-card rounded-3xl p-5 border border-border/50 shadow-sm flex items-center gap-4">
        <img
          src={avatar}
          alt={currentUser || ''}
          className="w-14 h-14 rounded-full border-3 border-primary/30 object-cover"
        />
        <div>
          <h2 className="text-lg font-bold font-romantic text-foreground">{currentUser}</h2>
          <p className="text-sm text-muted-foreground">Logged in ✓</p>
        </div>
      </div>

      {/* Settings items */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
        {SETTINGS_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <item.icon className="w-4.5 h-4.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full rounded-2xl py-6 text-base font-semibold"
        onClick={logout}
      >
        <LogOut className="w-5 h-5 mr-2" />
        Logout
      </Button>

      {/* Footer */}
      <div className="text-center pt-4 pb-2">
        <Heart className="w-5 h-5 text-primary mx-auto mb-1" fill="currentColor" />
        <p className="text-xs text-muted-foreground">Couple Stars ✨</p>
        <p className="text-[10px] text-muted-foreground/60">Built with love 💕</p>
      </div>
    </div>
  );
};

export default SettingsScreen;
