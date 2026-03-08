import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Dice1, Play } from 'lucide-react';
import { toast } from 'sonner';

const TRACK_LENGTH = 52;
const HOME_STRETCH = 5;
const PIECES_PER_PLAYER = 4;
const P1_START = 0;
const P2_START = 26;
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const CHANNEL_NAME = 'ludo-game-sync';

type PieceState = 'home' | 'track' | 'finished';
type Piece = { state: PieceState; trackPos: number; homeStretchPos: number };

interface LudoSyncState {
  p1Pieces: Piece[];
  p2Pieces: Piece[];
  currentTurn: 1 | 2;
  diceValue: number | null;
  hasRolled: boolean;
  winner: string | null;
  message: string;
  gameStarted: boolean;
  sixCount: number;
  triggeredBy?: string;
}

const createPieces = (): Piece[] =>
  Array.from({ length: PIECES_PER_PLAYER }, () => ({ state: 'home' as PieceState, trackPos: -1, homeStretchPos: -1 }));

const LudoGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  const [p1Pieces, setP1Pieces] = useState<Piece[]>(createPieces());
  const [p2Pieces, setP2Pieces] = useState<Piece[]>(createPieces());
  const [currentTurn, setCurrentTurn] = useState<1 | 2>(1);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [hasRolled, setHasRolled] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [sixCount, setSixCount] = useState(0);

  const p1Name = currentUser === 'Nani' ? 'Nani' : 'Ammu';
  const p2Name = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  // Nani is always Player 1, Ammu is Player 2
  const myPlayerNum = currentUser === 'Nani' ? 1 : 2;
  const isMyTurn = currentTurn === myPlayerNum;

  const broadcast = useCallback((state: Partial<LudoSyncState>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'ludo_sync',
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
      .on('broadcast', { event: 'ludo_sync' }, ({ payload }) => {
        if (payload.triggeredBy !== currentUser) {
          const s = payload as LudoSyncState;
          if (s.p1Pieces !== undefined) setP1Pieces(s.p1Pieces);
          if (s.p2Pieces !== undefined) setP2Pieces(s.p2Pieces);
          if (s.currentTurn !== undefined) setCurrentTurn(s.currentTurn);
          if (s.diceValue !== undefined) setDiceValue(s.diceValue);
          if (s.hasRolled !== undefined) setHasRolled(s.hasRolled);
          if (s.winner !== undefined) setWinner(s.winner);
          if (s.message !== undefined) setMessage(s.message);
          if (s.gameStarted !== undefined) setGameStarted(s.gameStarted);
          if (s.sixCount !== undefined) setSixCount(s.sixCount);
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

  const getAbsolutePos = (trackPos: number, player: 1 | 2) => {
    const start = player === 1 ? P1_START : P2_START;
    return (start + trackPos) % TRACK_LENGTH;
  };

  const rollDice = useCallback(() => {
    if (rolling || winner || hasRolled || !isMyTurn) return;
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
        setHasRolled(true);

        const pieces = currentTurn === 1 ? p1Pieces : p2Pieces;
        const canMove = pieces.some(p => {
          if (p.state === 'home') return finalValue === 6;
          if (p.state === 'track') {
            return p.trackPos + finalValue <= TRACK_LENGTH + HOME_STRETCH;
          }
          return false;
        });

        if (!canMove) {
          const msg = 'No valid moves! Turn passes.';
          setMessage(msg);
          broadcast({ message: msg, diceValue: finalValue, hasRolled: true });
          setTimeout(() => {
            const nextTurn = (currentTurn === 1 ? 2 : 1) as 1 | 2;
            setCurrentTurn(nextTurn);
            setHasRolled(false);
            setSixCount(0);
            broadcast({ currentTurn: nextTurn, hasRolled: false, sixCount: 0 });
          }, 1200);
        } else {
          const msg = finalValue === 6 ? 'Rolled a 6! Pick a piece to move 🎉' : '';
          if (msg) setMessage(msg);
          broadcast({ diceValue: finalValue, hasRolled: true, message: msg });
        }
      }
    }, 80);
  }, [rolling, winner, hasRolled, isMyTurn, currentTurn, p1Pieces, p2Pieces, broadcast]);

  const movePiece = useCallback((pieceIndex: number) => {
    if (!hasRolled || !diceValue || winner || !isMyTurn) return;

    const isP1 = currentTurn === 1;
    const pieces = isP1 ? [...p1Pieces] : [...p2Pieces];
    const opponentPieces = isP1 ? [...p2Pieces] : [...p1Pieces];
    const piece = { ...pieces[pieceIndex] };
    let msg = '';

    if (piece.state === 'home') {
      if (diceValue !== 6) { setMessage('Need a 6 to leave home!'); return; }
      piece.state = 'track';
      piece.trackPos = 0;
      msg = 'Piece enters the board! 🏁';
    } else if (piece.state === 'track') {
      const newPos = piece.trackPos + diceValue;
      if (newPos > TRACK_LENGTH + HOME_STRETCH) {
        setMessage('Too far! Pick another piece.');
        return;
      }
      if (newPos === TRACK_LENGTH + HOME_STRETCH) {
        piece.state = 'finished';
        piece.trackPos = -1;
        msg = 'Piece reached home! 🏠✨';
      } else if (newPos > TRACK_LENGTH) {
        piece.homeStretchPos = newPos - TRACK_LENGTH - 1;
        piece.trackPos = newPos;
        msg = 'Moving in home stretch!';
      } else {
        piece.trackPos = newPos;
        const absPos = getAbsolutePos(newPos, currentTurn);
        if (!SAFE_SPOTS.includes(absPos)) {
          const opponentStart = currentTurn === 1 ? P2_START : P1_START;
          opponentPieces.forEach((op, i) => {
            if (op.state === 'track') {
              const opAbsPos = (opponentStart + op.trackPos) % TRACK_LENGTH;
              if (opAbsPos === absPos) {
                opponentPieces[i] = { state: 'home', trackPos: -1, homeStretchPos: -1 };
                msg = `Captured ${isP1 ? p2Name : p1Name}'s piece! 💥`;
                toast(`💥 Captured a piece!`);
              }
            }
          });
        }
        if (!msg) msg = `Moved to position ${newPos}`;
      }
    } else {
      return;
    }

    pieces[pieceIndex] = piece;
    const newP1 = isP1 ? pieces : opponentPieces;
    const newP2 = isP1 ? opponentPieces : pieces;
    setP1Pieces(newP1);
    setP2Pieces(newP2);
    setMessage(msg);

    if (pieces.every(p => p.state === 'finished')) {
      const winnerName = isP1 ? p1Name : p2Name;
      setWinner(winnerName);
      const winMsg = `🎉 ${winnerName} wins!`;
      setMessage(winMsg);
      toast.success(`🎉 ${winnerName} wins Ludo!`);
      broadcast({ p1Pieces: newP1, p2Pieces: newP2, winner: winnerName, message: winMsg });
      supabase.from('game_results').insert([{
        game_type: 'ludo',
        played_by: currentUser!,
        partner,
        result: `${winnerName} won!`,
        details: { winner: winnerName } as any,
      }]);
      return;
    }

    if (diceValue === 6 && sixCount < 2) {
      const newSixCount = sixCount + 1;
      setSixCount(newSixCount);
      setHasRolled(false);
      const extraMsg = msg + ' — Roll again!';
      setMessage(extraMsg);
      broadcast({ p1Pieces: newP1, p2Pieces: newP2, hasRolled: false, sixCount: newSixCount, message: extraMsg });
    } else {
      const nextTurn = (currentTurn === 1 ? 2 : 1) as 1 | 2;
      setCurrentTurn(nextTurn);
      setHasRolled(false);
      setSixCount(0);
      broadcast({ p1Pieces: newP1, p2Pieces: newP2, currentTurn: nextTurn, hasRolled: false, sixCount: 0, message: msg });
    }
  }, [hasRolled, diceValue, winner, isMyTurn, currentTurn, p1Pieces, p2Pieces, p1Name, p2Name, sixCount, currentUser, partner, broadcast]);

  const resetGame = () => {
    const newP1 = createPieces();
    const newP2 = createPieces();
    setP1Pieces(newP1);
    setP2Pieces(newP2);
    setCurrentTurn(1);
    setDiceValue(null);
    setHasRolled(false);
    setRolling(false);
    setWinner(null);
    setMessage('');
    setSixCount(0);
    setGameStarted(true);
    broadcast({ p1Pieces: newP1, p2Pieces: newP2, currentTurn: 1, diceValue: null, hasRolled: false, winner: null, message: '', sixCount: 0, gameStarted: true });
  };

  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const OnlineBadge = () => (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${partnerOnline ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
      <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
      {partnerOnline ? `${partner} is here!` : `${partner} offline`}
    </div>
  );

  const renderPieceSelector = (pieces: Piece[], playerNum: 1 | 2, isActive: boolean) => {
    const colors = playerNum === 1
      ? { bg: 'bg-primary', text: 'text-primary-foreground', ring: 'ring-primary' }
      : { bg: 'bg-accent', text: 'text-accent-foreground', ring: 'ring-accent' };
    const name = playerNum === 1 ? p1Name : p2Name;
    const isMe = playerNum === myPlayerNum;

    return (
      <Card className={`p-3 ${isActive && !winner ? `ring-2 ${colors.ring}` : ''}`}>
        <p className="text-xs font-bold text-foreground mb-2 text-center">{name} {isMe ? '(You)' : ''}</p>
        <div className="flex gap-2 justify-center">
          {pieces.map((piece, i) => (
            <button
              key={i}
              onClick={() => isActive && isMe && hasRolled && !winner && movePiece(i)}
              disabled={!isActive || !isMe || !hasRolled || winner !== null || piece.state === 'finished'}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                piece.state === 'finished'
                  ? 'bg-green-500/60 text-primary-foreground opacity-60'
                  : piece.state === 'track'
                  ? `${colors.bg} ${colors.text} shadow-md ${isActive && isMe && hasRolled ? 'hover:scale-110 cursor-pointer animate-pulse' : ''}`
                  : `${colors.bg}/30 ${isActive && isMe && hasRolled && diceValue === 6 ? 'hover:scale-110 cursor-pointer ring-2 ring-yellow-400 animate-pulse' : 'opacity-40'}`
              }`}
            >
              {piece.state === 'finished' ? '✓' : piece.state === 'track' ? piece.trackPos : '🏠'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 justify-center mt-1">
          {pieces.map((p, i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${p.state === 'finished' ? 'bg-green-500' : p.state === 'track' ? colors.bg : 'bg-muted'}`} />
          ))}
        </div>
      </Card>
    );
  };

  const renderTrack = () => {
    const trackCells = [];
    for (let i = 0; i < TRACK_LENGTH; i++) {
      const isSafe = SAFE_SPOTS.includes(i);
      const p1Here = p1Pieces.some(p => p.state === 'track' && p.trackPos <= TRACK_LENGTH && getAbsolutePos(p.trackPos, 1) === i);
      const p2Here = p2Pieces.some(p => p.state === 'track' && p.trackPos <= TRACK_LENGTH && getAbsolutePos(p.trackPos, 2) === i);

      trackCells.push(
        <div
          key={i}
          className={`w-5 h-5 rounded-sm flex items-center justify-center text-[6px] font-bold border ${
            isSafe ? 'border-yellow-400 bg-yellow-500/10' : 'border-border/40 bg-background'
          }`}
        >
          {p1Here && p2Here ? (
            <span className="text-[8px]">⚔️</span>
          ) : p1Here ? (
            <span className="w-3 h-3 rounded-full bg-primary" />
          ) : p2Here ? (
            <span className="w-3 h-3 rounded-full bg-accent border border-border" />
          ) : isSafe ? (
            <span className="text-[7px]">⭐</span>
          ) : (
            <span className="text-muted-foreground/40">{i}</span>
          )}
        </div>
      );
    }
    return trackCells;
  };

  if (!gameStarted) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🎲 Ludo</h2>
          <div className="w-12" />
        </div>
        <div className="flex justify-center"><OnlineBadge /></div>
        <Card className="p-6 text-center bg-primary/5 border-primary/20">
          <div className="text-4xl mb-3">🎲🎯</div>
          <h3 className="font-bold text-foreground text-lg">Ludo</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Roll a 6 to bring pieces out. Race all 4 pieces around the board to home. Capture opponent's pieces by landing on them!
          </p>
          <div className="flex flex-col gap-1 mt-4 text-xs text-muted-foreground">
            <span>🎲 Roll 6 to enter the board</span>
            <span>⭐ Safe spots — can't be captured</span>
            <span>💥 Land on opponent to send them home</span>
            <span>🏠 Get all 4 pieces home to win</span>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Nani is Player 1, Ammu is Player 2</p>
        </Card>
        <Button variant="romantic" onClick={resetGame} className="w-full rounded-xl">
          <Play className="w-4 h-4 mr-1" /> Start Game
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🎲 Ludo</h2>
        <OnlineBadge />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {renderPieceSelector(p1Pieces, 1, currentTurn === 1)}
        {renderPieceSelector(p2Pieces, 2, currentTurn === 2)}
      </div>

      <Card className="p-3">
        <p className="text-[10px] text-muted-foreground text-center mb-2 font-medium">Game Board</p>
        <div className="flex flex-wrap gap-0.5 justify-center">
          {renderTrack()}
        </div>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> {p1Name}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-accent border border-border" /> {p2Name}</span>
          <span className="flex items-center gap-1">⭐ Safe</span>
        </div>
      </Card>

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
              {isMyTurn ? (hasRolled ? 'Pick a piece to move! ↑' : 'Your turn! 🎯') : `Waiting for ${currentTurn === 1 ? p1Name : p2Name}...`}
            </p>
            <Button variant="romantic" onClick={rollDice} disabled={rolling || hasRolled || !isMyTurn} className="w-full rounded-xl">
              <Dice1 className="w-4 h-4 mr-1" /> {rolling ? 'Rolling...' : !isMyTurn ? `Waiting for ${partner}...` : hasRolled ? 'Pick a piece above ↑' : 'Roll Dice 🎲'}
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

export default LudoGame;
