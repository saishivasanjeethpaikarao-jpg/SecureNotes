import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Star, Lock } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!selectedUser || !password) return;
    setLoading(true);
    const success = await login(selectedUser, password);
    setLoading(false);
    if (!success) {
      toast.error('Wrong password! Try again 💔');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-romantic">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center gap-2 mb-4">
            <Star className="w-8 h-8 text-star glow-star animate-float" />
            <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
            <Star className="w-8 h-8 text-star glow-star animate-float" style={{ animationDelay: '1s' }} />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground font-romantic mb-2">
            Couple Star Rewards
          </h1>
          <p className="text-primary-foreground/80 text-lg">✨ Track your love in stars ✨</p>
        </div>

        <div className="bg-card rounded-2xl p-8 shadow-card">
          {!selectedUser ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground font-medium mb-6">Who are you?</p>
              <Button
                variant="romantic"
                className="w-full h-14 text-lg rounded-xl"
                onClick={() => setSelectedUser('Nani')}
              >
                💜 Login as Nani
              </Button>
              <Button
                variant="romantic"
                className="w-full h-14 text-lg rounded-xl"
                onClick={() => setSelectedUser('Ammu')}
              >
                💖 Login as Ammu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedUser(null); setPassword(''); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back
              </button>
              <p className="text-center text-lg font-semibold text-foreground">
                Welcome, {selectedUser}! 💕
              </p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
              <Button
                variant="romantic"
                className="w-full h-12 rounded-xl text-lg"
                onClick={handleLogin}
                disabled={loading || !password}
              >
                {loading ? '...' : '💫 Enter'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
