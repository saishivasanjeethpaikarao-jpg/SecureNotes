import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, RotateCcw, Play, Heart } from 'lucide-react';
import { toast } from 'sonner';

const CELL_SIZE = 16;
const BOARD_W = 20;
const BOARD_H = 20;
const CANVAS_W = BOARD_W * CELL_SIZE;
const CANVAS_H = BOARD_H * CELL_SIZE;
const INITIAL_SPEED = 150;
const SPEED_INCREASE = 3;

type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Pos = { x: number; y: number };

const FOOD_EMOJIS = ['❤️', '💕', '💖', '💗', '✨', '⭐', '🌹', '🍫', '💎', '🦋'];

const WormGame = ({ onBack }: { onBack: () => void }) => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const dirRef = useRef<Dir>('RIGHT');
  const nextDirRef = useRef<Dir>('RIGHT');
  const snakeRef = useRef<Pos[]>([{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }]);
  const foodRef = useRef<Pos>({ x: 15, y: 10 });
  const scoreRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'over'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [partnerHighScore, setPartnerHighScore] = useState(0);

  // Load high scores
  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from('game_results')
        .select('*')
        .eq('game_type', 'worm')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) {
        const myScores = data.filter(r => r.played_by === currentUser).map(r => (r.details as any)?.score || 0);
        const partnerScores = data.filter(r => r.played_by === partner).map(r => (r.details as any)?.score || 0);
        if (myScores.length) setHighScore(Math.max(...myScores));
        if (partnerScores.length) setPartnerHighScore(Math.max(...partnerScores));
      }
    };
    fetchScores();
  }, [currentUser, partner]);

  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    let pos: Pos;
    do {
      pos = { x: Math.floor(Math.random() * BOARD_W), y: Math.floor(Math.random() * BOARD_H) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    foodRef.current = pos;
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = 'hsl(340, 30%, 8%)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = 'hsl(340, 20%, 12%)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= BOARD_W; x++) {
      ctx.beginPath(); ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= BOARD_H; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(CANVAS_W, y * CELL_SIZE); ctx.stroke();
    }

    // Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      const t = 1 - i / snake.length;
      const r = Math.round(220 + 35 * t);
      const g = Math.round(50 + 30 * t);
      const b = Math.round(80 + 50 * t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = i === 0 ? 0 : 1;
      ctx.beginPath();
      ctx.roundRect(seg.x * CELL_SIZE + pad, seg.y * CELL_SIZE + pad, CELL_SIZE - pad * 2, CELL_SIZE - pad * 2, i === 0 ? 4 : 2);
      ctx.fill();

      // Eyes on head
      if (i === 0) {
        ctx.fillStyle = '#fff';
        const dir = dirRef.current;
        const eyeOffsets = dir === 'RIGHT' ? [[10, 4], [10, 10]] :
          dir === 'LEFT' ? [[4, 4], [4, 10]] :
          dir === 'UP' ? [[4, 4], [10, 4]] : [[4, 10], [10, 10]];
        eyeOffsets.forEach(([ex, ey]) => {
          ctx.beginPath();
          ctx.arc(seg.x * CELL_SIZE + ex, seg.y * CELL_SIZE + ey, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // Food - draw as heart
    const food = foodRef.current;
    ctx.fillStyle = '#ff4d6d';
    ctx.font = `${CELL_SIZE - 2}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤️', food.x * CELL_SIZE + CELL_SIZE / 2, food.y * CELL_SIZE + CELL_SIZE / 2);
  }, []);

  const gameOver = useCallback(async () => {
    setGameState('over');
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    const finalScore = scoreRef.current;
    setScore(finalScore);

    if (finalScore > highScore) {
      setHighScore(finalScore);
      toast.success(`🎉 New high score: ${finalScore}!`);
    }

    // Save to DB
    if (currentUser) {
      await supabase.from('game_results').insert([{
        game_type: 'worm',
        played_by: currentUser,
        partner,
        question_text: null,
        result: `Score: ${finalScore}`,
        details: { score: finalScore } as any,
      }]);
    }
  }, [currentUser, partner, highScore]);

  const tick = useCallback(() => {
    const snake = [...snakeRef.current];
    dirRef.current = nextDirRef.current;
    const head = { ...snake[0] };

    switch (dirRef.current) {
      case 'UP': head.y--; break;
      case 'DOWN': head.y++; break;
      case 'LEFT': head.x--; break;
      case 'RIGHT': head.x++; break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= BOARD_W || head.y < 0 || head.y >= BOARD_H) {
      gameOver();
      return;
    }

    // Self collision
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current++;
      setScore(scoreRef.current);
      spawnFood();
      // Speed up
      speedRef.current = Math.max(60, speedRef.current - SPEED_INCREASE);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      gameLoopRef.current = window.setInterval(tick, speedRef.current);
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw, gameOver, spawnFood]);

  const startGame = useCallback(() => {
    snakeRef.current = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    dirRef.current = 'RIGHT';
    nextDirRef.current = 'RIGHT';
    scoreRef.current = 0;
    speedRef.current = INITIAL_SPEED;
    setScore(0);
    setGameState('playing');
    spawnFood();
    draw();
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    gameLoopRef.current = window.setInterval(tick, speedRef.current);
  }, [spawnFood, draw, tick]);

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const dir = dirRef.current;
      switch (e.key) {
        case 'ArrowUp': case 'w': if (dir !== 'DOWN') nextDirRef.current = 'UP'; break;
        case 'ArrowDown': case 's': if (dir !== 'UP') nextDirRef.current = 'DOWN'; break;
        case 'ArrowLeft': case 'a': if (dir !== 'RIGHT') nextDirRef.current = 'LEFT'; break;
        case 'ArrowRight': case 'd': if (dir !== 'LEFT') nextDirRef.current = 'RIGHT'; break;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState]);

  // Touch controls
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      if (!touchStartRef.current || gameState !== 'playing') return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const dir = dirRef.current;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20 && dir !== 'LEFT') nextDirRef.current = 'RIGHT';
        else if (dx < -20 && dir !== 'RIGHT') nextDirRef.current = 'LEFT';
      } else {
        if (dy > 20 && dir !== 'UP') nextDirRef.current = 'DOWN';
        else if (dy < -20 && dir !== 'DOWN') nextDirRef.current = 'UP';
      }
      touchStartRef.current = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  // Initial draw
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-foreground flex-1 text-center font-romantic">🐍 Love Worm</h2>
        <div className="w-12" />
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-2 text-center bg-primary/5 border-primary/20">
          <p className="text-lg font-bold text-primary">{score}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Score</p>
        </Card>
        <Card className="p-2 text-center bg-primary/5 border-primary/20">
          <p className="text-lg font-bold text-primary">{highScore}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Your Best</p>
        </Card>
        <Card className="p-2 text-center bg-primary/5 border-primary/20">
          <p className="text-lg font-bold text-primary">{partnerHighScore}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{partner}'s Best</p>
        </Card>
      </div>

      {/* Canvas */}
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-xl border-2 border-primary/20 shadow-romantic touch-none"
          style={{ width: CANVAS_W, height: CANVAS_H, imageRendering: 'pixelated' }}
        />
      </div>

      {/* Controls */}
      {gameState === 'idle' && (
        <div className="text-center space-y-3">
          <Card className="p-4 bg-primary/5 border-primary/20">
            <Heart className="w-8 h-8 mx-auto text-primary mb-2" fill="currentColor" />
            <p className="text-sm text-foreground font-medium">Collect hearts to grow!</p>
            <p className="text-xs text-muted-foreground mt-1">Swipe or use arrow keys to move 🎮</p>
          </Card>
          <Button variant="romantic" onClick={startGame} className="w-full rounded-xl">
            <Play className="w-4 h-4 mr-1" /> Start Game
          </Button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="grid grid-cols-3 gap-2 max-w-[180px] mx-auto">
          <div />
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { if (dirRef.current !== 'DOWN') nextDirRef.current = 'UP'; }}>↑</Button>
          <div />
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { if (dirRef.current !== 'RIGHT') nextDirRef.current = 'LEFT'; }}>←</Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { if (dirRef.current !== 'UP') nextDirRef.current = 'DOWN'; }}>↓</Button>
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => { if (dirRef.current !== 'LEFT') nextDirRef.current = 'RIGHT'; }}>→</Button>
        </div>
      )}

      {gameState === 'over' && (
        <div className="text-center space-y-3">
          <Card className="p-6 bg-primary/5 border-primary/20 animate-scale-in">
            <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">{score} ❤️</p>
            <p className="text-sm text-muted-foreground mt-1">
              {score > partnerHighScore ? `🔥 You beat ${partner}'s record!` :
               score === highScore && score > 0 ? '🎉 New personal best!' :
               'Try again to beat the high score! 💪'}
            </p>
          </Card>
          <Button variant="romantic" onClick={startGame} className="w-full rounded-xl">
            <RotateCcw className="w-4 h-4 mr-1" /> Play Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default WormGame;
