import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Play, Heart } from 'lucide-react';
import { toast } from 'sonner';

type Cell = 'X' | 'O' | null;
type Board = Cell[];
const CHANNEL_NAME = 'ttt-game-sync';

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
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

interface TTTSyncState {
  board: Board;
  isXTurn: boolean;
  scores: { p1: number; p2: number; draws: number };
  gameStarted: boolean;
  triggeredBy?: string;
}

const TicTacToeGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isXTurn, setIsXTurn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0, draws: 0 });

  // Nani is always X (Player 1), Ammu is always O (Player 2)
  const p1Name = 'Nani';
  const p2Name = 'Ammu';
  const mySymbol: Cell = currentUser === 'Nani' ? 'X' : 'O';
  const isMyTurn = (isXTurn && mySymbol === 'X') || (!isXTurn && mySymbol === 'O');

  const { winner, line: winLine } = checkWinner(board);
  const isDraw = !winner && board.every(c => c !== null);
  const gameOver = !!winner || isDraw;

  const broadcast = useCallback((state: Partial<TTTSyncState>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'ttt_sync',
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
      .on('broadcast', { event: 'ttt_sync' }, ({ payload }) => {
        if (payload.triggeredBy !== currentUser) {
          const s = payload as TTTSyncState;
          if (s.board !== undefined) setBoard(s.board);
          if (s.isXTurn !== undefined) setIsXTurn(s.isXTurn);
          if (s.scores !== undefined) setScores(s.scores);
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

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || gameOver || !isMyTurn) return;

    const currentSymbol = isXTurn ? 'X' : 'O';
    const newBoard = [...board] as Board;
    newBoard[index] = currentSymbol;
    const newIsXTurn = !isXTurn;
    setBoard(newBoard);
    setIsXTurn(newIsXTurn);

    const result = checkWinner(newBoard);
    const draw = !result.winner && newBoard.every(c => c !== null);

    let newScores = scores;
    if (result.winner || draw) {
      if (result.winner) {
        const winnerName = result.winner === 'X' ? p1Name : p2Name;
        newScores = {
          ...scores,
          p1: result.winner === 'X' ? scores.p1 + 1 : scores.p1,
          p2: result.winner === 'O' ? scores.p2 + 1 : scores.p2,
        };
        setScores(newScores);
        toast.success(`🎉 ${winnerName} wins!`);
      } else {
        newScores = { ...scores, draws: scores.draws + 1 };
        setScores(newScores);
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

    broadcast({ board: newBoard, isXTurn: newIsXTurn, scores: newScores });
  }, [board, gameOver, isMyTurn, isXTurn, scores, p1Name, p2Name, currentUser, partner, broadcast]);

  const resetBoard = () => {
    const newBoard = Array(9).fill(null) as Board;
    setBoard(newBoard);
    setIsXTurn(true);
    broadcast({ board: newBoard, isXTurn: true });
  };

  const startGame = () => {
    const newBoard = Array(9).fill(null) as Board;
    const newScores = { p1: 0, p2: 0, draws: 0 };
    setGameStarted(true);
    setBoard(newBoard);
    setIsXTurn(true);
    setScores(newScores);
    broadcast({ board: newBoard, isXTurn: true, scores: newScores, gameStarted: true });
  };

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
          <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">❌⭕ Tic Tac Toe</h2>
          <div className="w-12" />
        </div>
        <div className="flex justify-center"><OnlineBadge /></div>
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <div className="text-4xl mb-3">❌⭕</div>
          <h3 className="font-bold text-foreground text-lg">Tic Tac Toe</h3>
          <p className="text-sm text-muted-foreground mt-2">Classic 3x3 grid game! Take turns placing X and O. Get 3 in a row to win!</p>
          <div className="flex gap-6 justify-center mt-4">
            <div className="text-center">
              <span className="text-2xl">❌</span>
              <p className="text-xs text-muted-foreground mt-1">{p1Name} {currentUser === 'Nani' ? '(You)' : ''}</p>
            </div>
            <div className="text-center">
              <span className="text-2xl">⭕</span>
              <p className="text-xs text-muted-foreground mt-1">{p2Name} {currentUser === 'Ammu' ? '(You)' : ''}</p>
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
        <OnlineBadge />
      </div>

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

      {!gameOver && (
        <p className="text-center text-sm font-medium text-foreground">
          {isMyTurn ? 'Your turn! ' : `Waiting for ${partner}... `}
          {isXTurn ? '❌' : '⭕'}
        </p>
      )}

      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-2 w-[240px]">
          {board.map((cell, i) => {
            const isWinCell = winLine?.includes(i);
            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={!!cell || gameOver || !isMyTurn}
                className={`w-[72px] h-[72px] rounded-xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${
                  isWinCell
                    ? 'border-primary bg-primary/15 scale-105'
                    : cell
                    ? 'border-border bg-card'
                    : isMyTurn && !gameOver
                    ? 'border-border hover:border-primary/50 hover:bg-primary/5 active:scale-95 cursor-pointer'
                    : 'border-border bg-card/50 opacity-70'
                }`}
              >
                {cell === 'X' && <span className="text-primary animate-scale-in">❌</span>}
                {cell === 'O' && <span className="text-accent-foreground animate-scale-in">⭕</span>}
              </button>
            );
          })}
        </div>
      </div>

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
