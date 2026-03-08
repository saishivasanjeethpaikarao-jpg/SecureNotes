import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Play, Heart } from 'lucide-react';
import { toast } from 'sonner';

type Cell = 'X' | 'O' | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diags
];

const checkWinner = (board: Board): { winner: Cell; line: number[] | null } => {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
};

const TicTacToeGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 });

  const p1Name = currentUser || 'Player 1';
  const p2Name = partner;

  const { winner, line: winLine } = checkWinner(board);
  const isDraw = !winner && board.every(c => c !== null);
  const gameOver = !!winner || isDraw;
  const currentPlayer = isXTurn ? p1Name : p2Name;
  const currentSymbol = isXTurn ? 'X' : 'O';

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || gameOver) return;

    const newBoard = [...board];
    newBoard[index] = currentSymbol;
    setBoard(newBoard);

    const result = checkWinner(newBoard);
    const draw = !result.winner && newBoard.every(c => c !== null);

    if (result.winner || draw) {
      if (result.winner) {
        const winnerName = result.winner === 'X' ? p1Name : p2Name;
        setScores(prev => ({
          ...prev,
          p1: result.winner === 'X' ? prev.p1 + 1 : prev.p1,
          p2: result.winner === 'O' ? prev.p2 + 1 : prev.p2,
        }));
        toast.success(`🎉 ${winnerName} wins!`);
      } else {
        setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        toast('🤝 It\'s a draw!');
      }

      if (currentUser) {
        supabase.from('game_results').insert([{
          game_type: 'tic-tac-toe',
          played_by: currentUser,
          partner,
          result: result.winner ? `${result.winner === 'X' ? p1Name : p2Name} won` : 'Draw',
          details: { winner: result.winner ? (result.winner === 'X' ? p1Name : p2Name) : 'draw' } as any,
        }]);
      }
    }

    setIsXTurn(!isXTurn);
  }, [board, gameOver, currentSymbol, isXTurn, p1Name, p2Name, currentUser, partner]);

  const resetBoard = () => {
    setBoard(Array(9).fill(null));
    setIsXTurn(true);
  };

  const startGame = () => {
    setGameStarted(true);
    resetBoard();
    setScores({ p1: 0, p2: 0, draws: 0 });
  };

  if (!gameStarted) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">❌⭕ Tic Tac Toe</h2>
          <div className="w-12" />
        </div>
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <div className="text-4xl mb-3">❌⭕</div>
          <h3 className="font-bold text-foreground text-lg">Tic Tac Toe</h3>
          <p className="text-sm text-muted-foreground mt-2">Classic 3x3 grid game! Take turns placing X and O. Get 3 in a row to win!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-center">
              <span className="text-2xl">❌</span>
              <p className="text-xs text-muted-foreground mt-1">{p1Name}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">⭕</span>
              <p className="text-xs text-muted-foreground mt-1">{p2Name}</p>
            </div>
          </div>
        </Card>
        <Button variant="romantic" onClick={startGame} className="w-full rounded-xl">
          <Play className="w-4 h-4 mr-1" /> Start Game
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">❌⭕ Tic Tac Toe</h2>
        <div className="w-12" />
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2 text-center bg-primary/5 border-primary/20">
          <p className="text-lg font-bold text-primary">{scores.p1}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{p1Name} (❌)</p>
        </Card>
        <Card className="p-2 text-center">
          <p className="text-lg font-bold text-muted-foreground">{scores.draws}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Draws</p>
        </Card>
        <Card className="p-2 text-center bg-accent/5 border-accent/20">
          <p className="text-lg font-bold text-accent-foreground">{scores.p2}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{p2Name} (⭕)</p>
        </Card>
      </div>

      {/* Turn indicator */}
      {!gameOver && (
        <p className="text-center text-sm font-medium text-foreground">
          {currentPlayer}'s turn {currentSymbol === 'X' ? '❌' : '⭕'}
        </p>
      )}

      {/* Board */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-2 w-[240px]">
          {board.map((cell, i) => {
            const isWinCell = winLine?.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!!cell || gameOver}
                className={`w-[72px] h-[72px] rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                  isWinCell
                    ? 'border-primary bg-primary/15 scale-105'
                    : cell
                    ? 'border-border bg-card'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5 active:scale-95 cursor-pointer'
                }`}
              >
                {cell === 'X' && <span className="text-primary animate-scale-in">❌</span>}
                {cell === 'O' && <span className="text-accent-foreground animate-scale-in">⭕</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Game over */}
      {gameOver && (
        <Card className="p-5 text-center bg-primary/5 border-primary/20 animate-scale-in">
          {winner ? (
            <>
              <Trophy className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
              <p className="text-xl font-bold text-foreground">
                {winner === 'X' ? p1Name : p2Name} wins! {winner === 'X' ? '❌' : '⭕'}
              </p>
            </>
          ) : (
            <>
              <Heart className="w-10 h-10 mx-auto text-primary mb-2" />
              <p className="text-xl font-bold text-foreground">It's a draw! 🤝</p>
            </>
          )}
          <Button variant="romantic" onClick={resetBoard} className="mt-3 rounded-xl">
            <RotateCcw className="w-4 h-4 mr-1" /> Play Again
          </Button>
        </Card>
      )}
    </div>
  );
};

export default TicTacToeGame;
