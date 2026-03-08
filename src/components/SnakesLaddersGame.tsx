import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Dice1, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

const BOARD_SIZE = 10;
const TOTAL_CELLS = 100;

// Snakes: head -> tail (go down)
const SNAKES: Record<number, number> = {
  99: 54, 95: 75, 92: 51, 83: 19, 73: 1, 64: 36, 48: 26, 16: 6,
};

// Ladders: bottom -> top (go up)
const LADDERS: Record<number, number> = {
  2: 38, 7: 14, 8: 31, 15: 26, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 78: 98,
};

const getCellCoords = (pos: number): { row: number; col: number } => {
  const row = Math.floor((pos - 1) / BOARD_SIZE);
  const isEvenRow = row % 2 === 0;
  const col = isEvenRow ? (pos - 1) % BOARD_SIZE : BOARD_SIZE - 1 - ((pos - 1) % BOARD_SIZE);
  return { row: BOARD_SIZE - 1 - row, col };
};

const SnakesLaddersGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const [p1Pos, setP1Pos] = useState(0); // 0 = not on board, 1-100
  const [p2Pos, setP2Pos] = useState(0);
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  const p1Name = currentUser || 'Player 1';
  const p2Name = partner;

  const rollDice = useCallback(() => {
    if (rolling || winner) return;
    setRolling(true);
    setMessage('');

    // Animate dice
    let count = 0;
    const interval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 8) {
        clearInterval(interval);
        const finalValue = Math.floor(Math.random() * 6) + 1;
        setDiceValue(finalValue);
        setRolling(false);

        // Move piece
        const currentPos = currentTurn === 1 ? p1Pos : p2Pos;
        let newPos = currentPos + finalValue;

        if (newPos > TOTAL_CELLS) {
          setMessage(`Need exact roll to reach 100! Turn passes.`);
          setCurrentTurn(currentTurn === 1 ? 2 : 1);
          return;
        }

        // Check snakes and ladders
        let finalPos = newPos;
        let extraMsg = '';
        if (SNAKES[newPos]) {
          finalPos = SNAKES[newPos];
          extraMsg = `🐍 Snake! Slid from ${newPos} to ${finalPos}`;
        } else if (LADDERS[newPos]) {
          finalPos = LADDERS[newPos];
          extraMsg = `🪜 Ladder! Climbed from ${newPos} to ${finalPos}`;
        }

        if (currentTurn === 1) {
          setP1Pos(finalPos);
        } else {
          setP2Pos(finalPos);
        }

        if (finalPos === TOTAL_CELLS) {
          const winnerName = currentTurn === 1 ? p1Name : p2Name;
          setWinner(winnerName);
          setMessage(`🎉 ${winnerName} wins!`);
          toast.success(`🎉 ${winnerName} wins Snakes & Ladders!`);
          // Save result
          supabase.from('game_results').insert([{
            game_type: 'snakes-ladders',
            played_by: currentUser!,
            partner,
            result: `${winnerName} won!`,
            details: { winner: winnerName } as any,
          }]);
          return;
        }

        setMessage(extraMsg || `Moved to ${finalPos}`);
        // Extra turn on 6
        if (finalValue === 6) {
          setMessage(prev => (prev ? prev + ' — Roll again! 🎲' : 'Rolled a 6! Roll again! 🎲'));
        } else {
          setCurrentTurn(currentTurn === 1 ? 2 : 1);
        }
      }
    }, 80);
  }, [rolling, winner, currentTurn, p1Pos, p2Pos, p1Name, p2Name, currentUser, partner]);

  const resetGame = () => {
    setP1Pos(0);
    setP2Pos(0);
    setCurrentTurn(1);
    setDiceValue(null);
    setWinner(null);
    setMessage('');
    setGameStarted(true);
  };

  // Render board
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

  if (!gameStarted) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🐍 Snakes & Ladders</h2>
          <div className="w-12" />
        </div>
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <div className="text-4xl mb-3">🐍🪜</div>
          <h3 className="font-bold text-foreground text-lg">Snakes & Ladders</h3>
          <p className="text-sm text-muted-foreground mt-2">Classic board game for two! Roll dice, climb ladders, avoid snakes. First to 100 wins!</p>
          <div className="flex gap-4 justify-center mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3 text-green-500" /> Ladders go up</span>
            <span className="flex items-center gap-1"><ArrowDown className="w-3 h-3 text-destructive" /> Snakes go down</span>
          </div>
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
        <div className="w-12" />
      </div>

      {/* Player info */}
      <div className="grid grid-cols-2 gap-2">
        <Card className={`p-2 text-center ${currentTurn === 1 && !winner ? 'ring-2 ring-primary' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-primary mx-auto flex items-center justify-center text-primary-foreground text-xs font-bold">{p1Name[0]}</div>
          <p className="text-xs font-bold text-foreground mt-1">{p1Name}</p>
          <p className="text-[10px] text-muted-foreground">Pos: {p1Pos || 'Start'}</p>
        </Card>
        <Card className={`p-2 text-center ${currentTurn === 2 && !winner ? 'ring-2 ring-accent' : ''}`}>
          <div className="w-6 h-6 rounded-full bg-accent mx-auto flex items-center justify-center text-accent-foreground text-xs font-bold border border-border">{p2Name[0]}</div>
          <p className="text-xs font-bold text-foreground mt-1">{p2Name}</p>
          <p className="text-[10px] text-muted-foreground">Pos: {p2Pos || 'Start'}</p>
        </Card>
      </div>

      {/* Board */}
      <div className="grid grid-cols-10 gap-0 border border-border rounded-xl overflow-hidden shadow-md">
        {renderBoard()}
      </div>

      {/* Dice & controls */}
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
              {currentTurn === 1 ? p1Name : p2Name}'s turn
            </p>
            <Button variant="romantic" onClick={rollDice} disabled={rolling} className="w-full rounded-xl">
              <Dice1 className="w-4 h-4 mr-1" /> {rolling ? 'Rolling...' : 'Roll Dice 🎲'}
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
