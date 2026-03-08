import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Dice1, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const BOARD_SIZE = 10;
const TOTAL_CELLS = 100;

const SNAKES: Record<number, number> = {
  99: 54, 95: 75, 92: 51, 83: 19, 73: 1, 64: 36, 48: 26, 16: 6,
};

const LADDERS: Record<number, number> = {
  2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98,
};

const CHANNEL_NAME = 'snakes-ladders-sync';

interface SLState {
  p1Pos: number;
  p2Pos: number;
  currentTurn: 1 | 2;
  diceValue: number | null;
  winner: string | null;
  message: string;
  gameStarted: boolean;
  triggeredBy?: string;
}

const SnakesLaddersGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const [p1Pos, setP1Pos] = useState(0);
  const [p2Pos, setP2Pos] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const p1Name = currentUser || 'Player 1';
  const p2Name = partner;

  // Player 1 is always the user who is "Nani", Player 2 is "Ammu"
  const myPlayerNum = currentUser === 'Nani' ? 1 : 2;
  const isMyTurn = currentTurn === myPlayerNum;

  // Broadcast state
  const broadcast = useCallback((state: Partial<SLState>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'sl_sync',
      payload: { ...state, triggeredBy: currentUser },
    });
  }, [currentUser]);

  // Setup channel
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: currentUser } },
    });

    channel
      .on('broadcast', { event: 'sl_sync' }, ({ payload }) => {
        if (payload.triggeredBy !== currentUser) {
          const s = payload as SLState;
          if (s.p1Pos !== undefined) setP1Pos(s.p1Pos);
          if (s.p2Pos !== undefined) setP2Pos(s.p2Pos);
          if (s.currentTurn !== undefined) setCurrentTurn(s.currentTurn);
          if (s.diceValue !== undefined) setDiceValue(s.diceValue);
          if (s.winner !== undefined) setWinner(s.winner);
          if (s.message !== undefined) setMessage(s.message);
          if (s.gameStarted !== undefined) setGameStarted(s.gameStarted);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPartnerOnline(Object.keys(state).includes(partner));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: currentUser, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, partner]);

  const rollDice = useCallback(() => {
    if (rolling || winner || !isMyTurn) return;
    setRolling(true);
    setMessage('');

    let count = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        setRolling(false);

        const currentPos = currentTurn === 1 ? p1Pos : p2Pos;
        let newPos = currentPos + finalValue;

        if (newPos > TOTAL_CELLS) {
          const nextTurn = currentTurn === 1 ? 2 : 1;
          const msg = `Need exact roll to reach 100! Turn passes.`;
          setMessage(msg);
          setCurrentTurn(nextTurn as 1 | 2);
          broadcast({ message: msg, currentTurn: nextTurn as 1 | 2, diceValue: finalValue });
          return;
        }

        let finalPos = newPos;
        let extraMsg = '';
        if (SNAKES[newPos]) {
          finalPos = SNAKES[newPos];
          extraMsg = `🐍 Snake! Slid from ${newPos} to ${finalPos}`;
        } else if (LADDERS[newPos]) {
          finalPos = LADDERS[newPos];
          extraMsg = `🪜 Ladder! Climbed from ${newPos} to ${finalPos}`;
        }

        const newP1 = currentTurn === 1 ? finalPos : p1Pos;
        const newP2 = currentTurn === 2 ? finalPos : p2Pos;
        setP1Pos(newP1);
        setP2Pos(newP2);

        if (finalPos === TOTAL_CELLS) {
          const winnerName = currentTurn === 1 ? p1Name : p2Name;
          setWinner(winnerName);
          const msg = `🎉 ${winnerName} wins!`;
          setMessage(msg);
          toast.success(`🎉 ${winnerName} wins Snakes & Ladders!`);
          broadcast({ p1Pos: newP1, p2Pos: newP2, winner: winnerName, message: msg, diceValue: finalValue });
          supabase.from('game_results').insert([{
            game_type: 'snakes-ladders',
            played_by: currentUser!,
            partner,
            result: `${winnerName} won!`,
            details: { winner: winnerName } as any,
          }]);
          return;
        }

        let msg = extraMsg || `Moved to ${finalPos}`;
        let nextTurn: 1 | 2;
        if (finalValue === 6) {
          msg = msg + ' — Roll again! 🎲';
          nextTurn = currentTurn;
        } else {
          nextTurn = currentTurn === 1 ? 2 : 1;
        }
        setMessage(msg);
        setCurrentTurn(nextTurn);
        broadcast({ p1Pos: newP1, p2Pos: newP2, currentTurn: nextTurn, message: msg, diceValue: finalValue });
      }
    }, 80);
  }, [rolling, winner, isMyTurn, currentTurn, p1Pos, p2Pos, p1Name, p2Name, currentUser, partner, broadcast]);

  const resetGame = () => {
    setP1Pos(0);
    setP2Pos(0);
    setCurrentTurn(1);
    setDiceValue(null);
    setWinner(null);
    setMessage('');
    setGameStarted(true);
    broadcast({ p1Pos: 0, p2Pos: 0, currentTurn: 1, diceValue: null, winner: null, message: '', gameStarted: true });
  };

  const renderBoard = () => {
    const cells = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const actualRow = BOARD_SIZE - 1 - row;
        const isEvenRow = actualRow % 2 === 0;
        const cellNum = isEvenRow
          ? actualRow * BOARD_SIZE + col + 1
          : actualRow * BOARD_SIZE + (BOARD_SIZE - col);

        const isSnakeHead = SNAKES[cellNum] !== undefined;
        const isLadderBottom = LADDERS[cellNum] !== undefined;
        const hasP1 = p1Pos === cellNum;
        const hasP2 = p2Pos === cellNum;
        const isDark = (row + col) % 2 === 0;

        cells.push(
          <div
            key={cellNum}
            className={`relative flex items-center justify-center text-[8px] font-bold border border-border/30 ${
              isDark ? 'bg-primary/5' : 'bg-background'
            } ${isSnakeHead ? 'bg-destructive/15' : ''} ${isLadderBottom ? 'bg-green-500/15' : ''}`}
            style={{ aspectRatio: '1' }}
          >
            <span className="text-muted-foreground/60">{cellNum}</span>
            {isSnakeHead && <span className="absolute top-0 right-0 text-[10px]">🐍</span>}
            {isLadderBottom && <span className="absolute top-0 right-0 text-[10px]">🪜</span>}
            {hasP1 && (
              <span className="absolute bottom-0 left-0 w-4 h-4 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center font-bold shadow-md z-10">
                {p1Name[0]}
              </span>
            )}
            {hasP2 && (
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-accent text-[8px] text-accent-foreground flex items-center justify-center font-bold shadow-md z-10 border border-border">
                {p2Name[0]}
              </span>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const OnlineBadge = () => (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${partnerOnline ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
      <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
      {partnerOnline ? `${partner} is here!` : `${partner} offline`}
    </div>
  );

  if (!gameStarted) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🐍 Snakes & Ladders</h2>
          <div className="w-12" />
        </div>
        <div className="flex justify-center"><OnlineBadge /></div>
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <div className="text-4xl mb-3">🐍🪜</div>
          <h3 className="font-bold text-foreground text-lg">Snakes & Ladders</h3>
          <p className="text-sm text-muted-foreground mt-2">Classic board game for two! Roll dice, climb ladders, avoid snakes. First to 100 wins!</p>
          <div className="flex gap-4 justify-center mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3 text-green-500" /> Ladders go up</span>
            <span className="flex items-center gap-1"><ArrowDown className="w-3 h-3 text-destructive" /> Snakes go down</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Nani is Player 1, Ammu is Player 2</p>
        </Card>
        <Button variant="romantic" onClick={resetGame} className="w-full rounded-xl">🎲 Start Game</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🐍 Snakes & Ladders</h2>
        <OnlineBadge />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className={`p-2 text-center ${currentTurn === 1 && !winner ? 'ring-2 ring-primary' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-primary mx-auto flex items-center justify-center text-primary-foreground text-xs font-bold">{p1Name[0]}</div>
          <p className="text-xs font-bold text-foreground mt-1">{p1Name} {myPlayerNum === 1 ? '(You)' : ''}</p>
          <p className="text-[10px] text-muted-foreground">Pos: {p1Pos || 'Start'}</p>
        </Card>
        <Card className={`p-2 text-center ${currentTurn === 2 && !winner ? 'ring-2 ring-accent' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-accent mx-auto flex items-center justify-center text-accent-foreground text-xs font-bold border border-border">{p2Name[0]}</div>
          <p className="text-xs font-bold text-foreground mt-1">{p2Name} {myPlayerNum === 2 ? '(You)' : ''}</p>
          <p className="text-[10px] text-muted-foreground">Pos: {p2Pos || 'Start'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-10 gap-0 border border-border rounded-xl overflow-hidden shadow-md">
        {renderBoard()}
      </div>

      <div className="text-center space-y-2">
        {message && <p className="text-sm font-medium text-foreground animate-fade-in">{message}</p>}
        
        {diceValue && (
          <div className={`text-5xl ${rolling ? 'animate-bounce' : 'animate-scale-in'}`}>
            {diceFaces[diceValue - 1]}
          </div>
        )}

        {!winner ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {isMyTurn ? 'Your turn! 🎯' : `Waiting for ${currentTurn === 1 ? p1Name : p2Name}...`}
            </p>
            <Button variant="romantic" onClick={rollDice} disabled={rolling || !isMyTurn} className="w-full rounded-xl">
              <Dice1 className="w-4 h-4 mr-1" /> {rolling ? 'Rolling...' : !isMyTurn ? `Waiting for ${partner}...` : 'Roll Dice 🎲'}
            </Button>
          </div>
        ) : (
          <Card className="p-6 bg-primary/5 border-primary/20 animate-scale-in">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-xl font-bold text-foreground">{winner} wins! 🎉</p>
            <Button variant="romantic" onClick={resetGame} className="mt-3 rounded-xl">
              <RotateCcw className="w-4 h-4 mr-1" /> Play Again
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SnakesLaddersGame;
