import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Dice1, Play } from 'lucide-react';
import { toast } from 'sonner';

// Simplified 2-player Ludo: each player has 4 pieces, must go around a track of 52 squares + 5 home stretch
const TRACK_LENGTH = 52;
const HOME_STRETCH = 5;
const PIECES_PER_PLAYER = 4;

// Starting positions on the main track for each player
const P1_START = 0;
const P2_START = 26;

// Safe spots (can't be captured here)
const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

type PieceState = 'home' | 'track' | 'finished';
type Piece = { state: PieceState; trackPos: number; homeStretchPos: number };

const createPieces = (): Piece[] =>
  Array.from({ length: PIECES_PER_PLAYER }, () => ({ state: 'home' as PieceState, trackPos: -1, homeStretchPos: -1 }));

const LudoGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

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

  const p1Name = currentUser || 'Player 1';
  const p2Name = partner;

  const getAbsolutePos = (trackPos: number, player: 1 | 2) => {
    const start = player === 1 ? P1_START : P2_START;
    return (start + trackPos) % TRACK_LENGTH;
  };

  const rollDice = useCallback(() => {
    if (rolling || winner || hasRolled) return;
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

        // Check if any move is possible
        const pieces = currentTurn === 1 ? p1Pieces : p2Pieces;
        const canMove = pieces.some(p => {
          if (p.state === 'home') return finalValue === 6;
          if (p.state === 'track') {
            const newTrackPos = p.trackPos + finalValue;
            if (newTrackPos <= TRACK_LENGTH + HOME_STRETCH) return true;
          }
          return false;
        });

        if (!canMove) {
          setMessage('No valid moves! Turn passes.');
          setTimeout(() => {
            setCurrentTurn(currentTurn === 1 ? 2 : 1);
            setHasRolled(false);
            setSixCount(0);
          }, 1200);
        } else if (finalValue === 6) {
          setMessage('Rolled a 6! Pick a piece to move 🎉');
        }
      }
    }, 80);
  }, [rolling, winner, hasRolled, currentTurn, p1Pieces, p2Pieces]);

  const movePiece = useCallback((pieceIndex: number) => {
    if (!hasRolled || !diceValue || winner) return;

    const isP1 = currentTurn === 1;
    const pieces = isP1 ? [...p1Pieces] : [...p2Pieces];
    const opponentPieces = isP1 ? [...p2Pieces] : [...p1Pieces];
    const piece = { ...pieces[pieceIndex] };

    // Validate move
    if (piece.state === 'home') {
      if (diceValue !== 6) { setMessage('Need a 6 to leave home!'); return; }
      piece.state = 'track';
      piece.trackPos = 0;
      setMessage('Piece enters the board! 🏁');
    } else if (piece.state === 'track') {
      const newPos = piece.trackPos + diceValue;
      if (newPos > TRACK_LENGTH + HOME_STRETCH) {
        setMessage('Too far! Pick another piece.');
        return;
      }
      if (newPos === TRACK_LENGTH + HOME_STRETCH) {
        piece.state = 'finished';
        piece.trackPos = -1;
        setMessage('Piece reached home! 🏠✨');
      } else if (newPos > TRACK_LENGTH) {
        piece.homeStretchPos = newPos - TRACK_LENGTH - 1;
        piece.trackPos = newPos;
        setMessage(`Moving in home stretch!`);
      } else {
        piece.trackPos = newPos;
        // Check capture
        const absPos = getAbsolutePos(newPos, currentTurn);
        if (!SAFE_SPOTS.includes(absPos)) {
          const opponentStart = currentTurn === 1 ? P2_START : P1_START;
          opponentPieces.forEach((op, i) => {
            if (op.state === 'track') {
              const opAbsPos = (opponentStart + op.trackPos) % TRACK_LENGTH;
              if (opAbsPos === absPos) {
                opponentPieces[i] = { state: 'home', trackPos: -1, homeStretchPos: -1 };
                setMessage(`Captured ${isP1 ? p2Name : p1Name}'s piece! 💥`);
                toast(`💥 Captured a piece!`);
              }
            }
          });
        }
      }
    } else {
      return; // finished pieces can't move
    }

    pieces[pieceIndex] = piece;
    if (isP1) { setP1Pieces(pieces); setP2Pieces(opponentPieces); }
    else { setP2Pieces(pieces); setP1Pieces(opponentPieces); }

    // Check win
    if (pieces.every(p => p.state === 'finished')) {
      const winnerName = isP1 ? p1Name : p2Name;
      setWinner(winnerName);
      setMessage(`🎉 ${winnerName} wins!`);
      toast.success(`🎉 ${winnerName} wins Ludo!`);
      supabase.from('game_results').insert([{
        game_type: 'ludo',
        played_by: currentUser!,
        partner,
        result: `${winnerName} won!`,
        details: { winner: winnerName } as any,
      }]);
      return;
    }

    // Next turn logic
    if (diceValue === 6 && sixCount < 2) {
      setSixCount(prev => prev + 1);
      setHasRolled(false);
      setMessage(prev => prev + ' — Roll again!');
    } else {
      setCurrentTurn(currentTurn === 1 ? 2 : 1);
      setHasRolled(false);
      setSixCount(0);
    }
  }, [hasRolled, diceValue, winner, currentTurn, p1Pieces, p2Pieces, p1Name, p2Name, sixCount, currentUser, partner]);

  const resetGame = () => {
    setP1Pieces(createPieces());
    setP2Pieces(createPieces());
    setCurrentTurn(1);
    setDiceValue(null);
    setHasRolled(false);
    setRolling(false);
    setWinner(null);
    setMessage('');
    setSixCount(0);
    setGameStarted(true);
  };

  const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  const renderPieceSelector = (pieces: Piece[], playerNum: 1 | 2, isActive: boolean) => {
    const colors = playerNum === 1
      ? { bg: 'bg-primary', text: 'text-primary-foreground', ring: 'ring-primary' }
      : { bg: 'bg-accent', text: 'text-accent-foreground', ring: 'ring-accent' };
    const name = playerNum === 1 ? p1Name : p2Name;

    return (
      <Card className={`p-3 ${isActive && !winner ? `ring-2 ${colors.ring}` : ''}`}>
        <p className="text-xs font-bold text-foreground mb-2 text-center">{name}</p>
        <div className="flex gap-2 justify-center">
          {pieces.map((piece, i) => (
            <button
              key={i}
              onClick={() => isActive && hasRolled && !winner && movePiece(i)}
              disabled={!isActive || !hasRolled || winner !== null || piece.state === 'finished'}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                piece.state === 'finished'
                  ? 'bg-green-500 text-white opacity-60'
                  : piece.state === 'track'
                  ? `${colors.bg} ${colors.text} shadow-md ${isActive && hasRolled ? 'hover:scale-110 cursor-pointer animate-pulse' : ''}`
                  : `${colors.bg}/30 ${isActive && hasRolled && diceValue === 6 ? 'hover:scale-110 cursor-pointer ring-2 ring-yellow-400 animate-pulse' : 'opacity-40'}`
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

  // Visual track representation
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
        <div className="w-12" />
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-2">
        {renderPieceSelector(p1Pieces, 1, currentTurn === 1)}
        {renderPieceSelector(p2Pieces, 2, currentTurn === 2)}
      </div>

      {/* Track visualization */}
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

      {/* Dice & message */}
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
              {hasRolled ? ' — Pick a piece to move!' : ''}
            </p>
            <Button variant="romantic" onClick={rollDice} disabled={rolling || hasRolled} className="w-full rounded-xl">
              <Dice1 className="w-4 h-4 mr-1" /> {rolling ? 'Rolling...' : hasRolled ? 'Pick a piece above ↑' : 'Roll Dice 🎲'}
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
