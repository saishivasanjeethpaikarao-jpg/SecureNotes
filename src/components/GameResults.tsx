import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, HelpCircle, Eye, Zap, Clock, MessageSquare, Dice1, Smile, ArrowLeft, Heart, BarChart3 } from 'lucide-react';

interface GameResult {
  id: string;
  game_type: string;
  played_by: string;
  partner: string;
  question_text: string | null;
  result: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const GAME_META: Record<string, { icon: typeof Flame; label: string; color: string }> = {
  'truth-or-dare': { icon: Flame, label: 'Truth or Dare', color: 'from-red-500 to-orange-500' },
  'would-you-rather': { icon: HelpCircle, label: 'Would You Rather', color: 'from-purple-500 to-pink-500' },
  'love-quiz': { icon: Trophy, label: 'Love Quiz', color: 'from-blue-500 to-cyan-500' },
  'emoji-story': { icon: Smile, label: 'Emoji Story', color: 'from-yellow-500 to-green-500' },
  'never-have-i-ever': { icon: Eye, label: 'Never Have I Ever', color: 'from-pink-500 to-rose-600' },
  'this-or-that': { icon: Zap, label: 'This or That', color: 'from-amber-500 to-orange-600' },
  'complete-sentence': { icon: MessageSquare, label: 'Complete the Sentence', color: 'from-teal-500 to-emerald-600' },
  'two-truths-lie': { icon: Dice1, label: '2 Truths & a Lie', color: 'from-indigo-500 to-violet-600' },
  '21-questions': { icon: Clock, label: '21 Questions', color: 'from-sky-500 to-blue-600' },
  'worm': { icon: Heart, label: 'Love Worm', color: 'from-rose-500 to-fuchsia-600' },
};

const GameResults = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const fetchResults = async () => {
      const { data } = await supabase
        .from('game_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      setResults((data as GameResult[]) || []);
      setLoading(false);
    };
    fetchResults();
  }, []);

  // Stats
  const gameTypes = [...new Set(results.map(r => r.game_type))];
  const totalGames = results.length;
  const myResults = results.filter(r => r.played_by === currentUser);
  const partnerResults = results.filter(r => r.played_by === partner);

  // Per-game stats
  const gameStats = gameTypes.map(type => {
    const gameResults = results.filter(r => r.game_type === type);
    const myCount = gameResults.filter(r => r.played_by === currentUser).length;
    const partnerCount = gameResults.filter(r => r.played_by === partner).length;
    const meta = GAME_META[type] || { icon: Heart, label: type, color: 'from-gray-500 to-gray-600' };

    // WYR/ToT match calculation
    let matchRate: number | null = null;
    if (type === 'would-you-rather' || type === 'this-or-that') {
      const myPicks = gameResults.filter(r => r.played_by === currentUser);
      const partnerPicks = gameResults.filter(r => r.played_by === partner);
      if (myPicks.length > 0 && partnerPicks.length > 0) {
        // Group by question, check if both picked same
        const myByQ = new Map(myPicks.map(r => [r.question_text, r.result]));
        let matches = 0, compared = 0;
        partnerPicks.forEach(r => {
          if (myByQ.has(r.question_text)) {
            compared++;
            if (myByQ.get(r.question_text) === r.result) matches++;
          }
        });
        if (compared > 0) matchRate = Math.round((matches / compared) * 100);
      }
    }

    // Quiz scores
    let quizAvg: string | null = null;
    if (type === 'love-quiz') {
      const scores = gameResults
        .filter(r => r.details && typeof (r.details as any).score === 'number')
        .map(r => (r.details as any).score as number);
      if (scores.length > 0) {
        quizAvg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      }
    }

    return { type, meta, total: gameResults.length, myCount, partnerCount, matchRate, quizAvg };
  });

  const filtered = filter === 'all' ? results : results.filter(r => r.game_type === filter);

  // Compatibility score: average of all match rates
  const matchRates = gameStats.filter(s => s.matchRate !== null).map(s => s.matchRate!);
  const compatibilityScore = matchRates.length > 0
    ? Math.round(matchRates.reduce((a, b) => a + b, 0) / matchRates.length)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Heart className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">Game Results 🏆</h2>
        <div className="w-12" />
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center bg-primary/5 border-primary/20">
          <p className="text-2xl font-bold text-primary">{totalGames}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Total Rounds</p>
        </Card>
        <Card className="p-3 text-center bg-primary/5 border-primary/20">
          <p className="text-2xl font-bold text-primary">{gameTypes.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Games Played</p>
        </Card>
        <Card className="p-3 text-center bg-primary/5 border-primary/20">
          <p className="text-2xl font-bold text-primary">{compatibilityScore !== null ? `${compatibilityScore}%` : '—'}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Match Rate 💕</p>
        </Card>
      </div>

      {/* Compatibility bar */}
      {compatibilityScore !== null && (
        <Card className="p-4 border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">💕 Love Compatibility</span>
            <span className="text-sm font-bold text-primary">{compatibilityScore}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-red-500 transition-all duration-1000"
              style={{ width: `${compatibilityScore}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            {compatibilityScore >= 80 ? '🔥 Soulmates!' : compatibilityScore >= 60 ? '💛 Great match!' : compatibilityScore >= 40 ? '😊 Getting there!' : '💭 Opposites attract!'}
          </p>
        </Card>
      )}

      {/* Per-game breakdown */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Game Breakdown</h3>
        {gameStats.length === 0 ? (
          <Card className="p-6 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No games played yet! Go play some games 🎮</p>
          </Card>
        ) : (
          gameStats.map(({ type, meta, total, myCount, partnerCount, matchRate, quizAvg }) => {
            const Icon = meta.icon;
            return (
              <Card key={type} className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{meta.label}</p>
                  <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span>{total} rounds</span>
                    <span>{currentUser}: {myCount}</span>
                    <span>{partner}: {partnerCount}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {matchRate !== null && (
                    <span className="text-xs font-bold text-primary">{matchRate}% match</span>
                  )}
                  {quizAvg !== null && (
                    <span className="text-xs font-bold text-primary">Avg: {quizAvg}/10</span>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Recent activity filter */}
      {results.length > 0 && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              All
            </button>
            {gameTypes.map(type => {
              const meta = GAME_META[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {meta?.label || type}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            {filtered.slice(0, 20).map((r) => {
              const meta = GAME_META[r.game_type] || { icon: Heart, label: r.game_type, color: 'from-gray-500 to-gray-600' };
              const Icon = meta.icon;
              const time = new Date(r.created_at);
              return (
                <div key={r.id} className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{r.played_by} played {meta.label}</p>
                    {r.result && <p className="text-[11px] text-muted-foreground truncate">{r.result}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default GameResults;
