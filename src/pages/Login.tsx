import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (!success) {
      toast.error('Invalid credentials');
    } else {
      // Set OneSignal tag via Median.co bridge for push notification targeting
      try {
        if ((window as any).median?.onesignal?.tags?.sendTags) {
          (window as any).median.onesignal.tags.sendTags({ username });
        }
      } catch (e) {
        console.log('OneSignal tag set skipped (not in Median app)');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-1">
            Secure Notes
          </h1>
          <p className="text-slate-400 text-sm">Sign in to continue</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="pl-10 h-12 rounded-xl bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              />
            </div>
            <Button
              className="w-full h-12 rounded-xl text-base bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleLogin}
              disabled={loading || !username || !password}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">Protected access only</p>
      </div>
    </div>
  );
};

export default Login;
