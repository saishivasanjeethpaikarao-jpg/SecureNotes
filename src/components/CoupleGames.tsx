import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart, Shuffle, Flame, HelpCircle, Smile, RotateCcw, Trophy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// ─── Truth or Dare (Couple Edition) ───
const TRUTHS = [
  "What's the first thing you noticed about me?",
  "What's your favorite memory of us?",
  "What's one thing I do that always makes you smile?",
  "Have you ever dreamt about me? What happened?",
  "What song reminds you of us?",
  "What's something you've never told me?",
  "When did you first realize you liked me?",
  "What's the most romantic thing I've done?",
  "What do you love most about our relationship?",
  "If you could relive one day with me, which would it be?",
  "What's your favorite outfit of mine?",
  "What habit of mine do you find cute?",
  "What's something you want us to do together?",
  "What's the sweetest text I've ever sent you?",
  "What were you thinking on our first date?",
];

const DARES = [
  "Send me the last photo you took of me",
  "Write me a love poem in 30 seconds",
  "Do your best impression of me",
  "Send a voice note saying 'I love you' in 3 different ways",
  "Change your wallpaper to a pic of us for a week",
  "Give me 5 compliments in a row",
  "Sing our song right now",
  "Send me the cutest selfie you can take right now",
  "Text my best friend something nice about me",
  "Plan our next date in 60 seconds",
  "Tell me 3 things you'd miss most about me",
  "Do a silly dance and send a video",
  "Write 'I love [name]' with your non-dominant hand and show me",
  "Call me and just say something romantic",
  "Make up a rap about our relationship",
];

// ─── Would You Rather ───
const WOULD_YOU_RATHER = [
  ["Never be able to hug me again", "Never be able to kiss me again"],
  ["Go on a fancy dinner date", "Have a cozy movie night at home"],
  ["Travel the world together", "Build our dream home together"],
  ["Read my mind for a day", "Have me read yours for a day"],
  ["Relive our first date", "Fast forward to our 50th anniversary"],
  ["Always have to slow dance", "Always have to fast dance"],
  ["Get a love letter every day", "Get a surprise gift every month"],
  ["Be stuck on an island with me", "Be in a mansion without me"],
  ["Have a pet we raise together", "Go on adventures every weekend"],
  ["Know everything about my past", "Know everything about our future"],
  ["Cook for me every day", "Have me cook for you every day"],
  ["Live in Paris together", "Live on a beach together"],
  ["Have matching tattoos", "Have matching outfits forever"],
  ["Give up social media", "Give up desserts for a year"],
  ["Always hold hands in public", "Always have matching accessories"],
];

// ─── Love Quiz ───
const QUIZ_QUESTIONS = [
  { q: "What's my favorite color?", type: "open" },
  { q: "What's my comfort food?", type: "open" },
  { q: "What's my biggest fear?", type: "open" },
  { q: "What makes me laugh the most?", type: "open" },
  { q: "What's my dream vacation?", type: "open" },
  { q: "What's my favorite movie?", type: "open" },
  { q: "What do I do when I'm stressed?", type: "open" },
  { q: "What's my go-to song?", type: "open" },
  { q: "What's my hidden talent?", type: "open" },
  { q: "What's the first thing I'd buy if I won the lottery?", type: "open" },
];

// ─── Emoji Story Game ───
const EMOJI_PROMPTS = [
  "Tell our love story using only emojis",
  "Describe your perfect date with emojis",
  "How are you feeling right now? (emojis only)",
  "Describe me in emojis",
  "What's your dream life with me? (emojis only)",
  "Describe our first meeting in emojis",
  "What do we do on weekends? (emojis only)",
  "Our future together in emojis",
];

type GameType = 'menu' | 'truth-or-dare' | 'would-you-rather' | 'love-quiz' | 'emoji-story';

const CoupleGames = () => {
  const { currentUser } = useAuth();
  const [game, setGame] = useState<GameType>('menu');
  const [todCard, setTodCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);
  const [wyrPair, setWyrPair] = useState<string[] | null>(null);
  const [wyrChoice, setWyrChoice] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [emojiPrompt, setEmojiPrompt] = useState('');

  const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const drawTruthOrDare = (type: 'truth' | 'dare') => {
    const text = type === 'truth' ? pickRandom(TRUTHS) : pickRandom(DARES);
    setTodCard({ type, text });
  };

  const drawWYR = () => {
    setWyrPair(pickRandom(WOULD_YOU_RATHER));
    setWyrChoice(null);
  };

  const startQuiz = () => {
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
  };

  const drawEmoji = () => {
    setEmojiPrompt(pickRandom(EMOJI_PROMPTS));
  };

  const games = [
    { id: 'truth-or-dare' as GameType, icon: Flame, label: 'Truth or Dare', desc: 'Spicy couple edition 🔥', color: 'from-red-500 to-orange-500' },
    { id: 'would-you-rather' as GameType, icon: HelpCircle, label: 'Would You Rather', desc: 'Tough love choices 💭', color: 'from-purple-500 to-pink-500' },
    { id: 'love-quiz' as GameType, icon: Trophy, label: 'Love Quiz', desc: 'How well do you know me? 🧠', color: 'from-blue-500 to-cyan-500' },
    { id: 'emoji-story' as GameType, icon: Smile, label: 'Emoji Story', desc: 'Tell stories with emojis 😄', color: 'from-yellow-500 to-green-500' },
  ];

  if (game === 'menu') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground font-romantic">Couple Games 🎮</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a game and have fun together!</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {games.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGame(g.id);
                if (g.id === 'love-quiz') startQuiz();
                if (g.id === 'emoji-story') drawEmoji();
              }}
              className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${g.color} opacity-90`} />
              <div className="relative z-10 text-white">
                <g.icon className="w-8 h-8 mb-2 drop-shadow" />
                <h3 className="font-bold text-sm">{g.label}</h3>
                <p className="text-[11px] opacity-80 mt-0.5">{g.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={() => setGame('menu')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Games
      </button>

      {/* Truth or Dare */}
      {game === 'truth-or-dare' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">🔥 Truth or Dare</h2>
          {todCard ? (
            <Card className="p-6 text-center animate-scale-in">
              <span className={`text-xs font-bold uppercase tracking-wider ${todCard.type === 'truth' ? 'text-blue-500' : 'text-red-500'}`}>
                {todCard.type}
              </span>
              <p className="text-lg font-medium text-foreground mt-3 leading-relaxed">{todCard.text}</p>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Sparkles className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Choose Truth or Dare to begin!</p>
            </Card>
          )}
          <div className="flex gap-3">
            <Button onClick={() => drawTruthOrDare('truth')} className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white">
              😇 Truth
            </Button>
            <Button onClick={() => drawTruthOrDare('dare')} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">
              😈 Dare
            </Button>
          </div>
          <Button variant="outline" onClick={() => setTodCard(null)} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Round
          </Button>
        </div>
      )}

      {/* Would You Rather */}
      {game === 'would-you-rather' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">💭 Would You Rather</h2>
          {wyrPair ? (
            <div className="space-y-3 animate-scale-in">
              {wyrPair.map((option, i) => (
                <button
                  key={i}
                  onClick={() => setWyrChoice(i)}
                  className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
                    wyrChoice === i
                      ? 'border-primary bg-primary/10 scale-[1.02]'
                      : wyrChoice !== null && wyrChoice !== i
                      ? 'border-border opacity-50'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">{option}</span>
                  {wyrChoice === i && <span className="block text-xs text-primary mt-1">Your choice! 💕</span>}
                </button>
              ))}
              {wyrChoice !== null && (
                <p className="text-center text-sm text-muted-foreground animate-fade-in">
                  Now ask {currentUser === 'Nani' ? 'Ammu' : 'Nani'} what they'd pick! 👀
                </p>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <HelpCircle className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Tap below to get a question!</p>
            </Card>
          )}
          <Button variant="romantic" onClick={drawWYR} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> {wyrPair ? 'Next Question' : 'Start'}
          </Button>
        </div>
      )}

      {/* Love Quiz */}
      {game === 'love-quiz' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">🧠 Love Quiz</h2>
          {!quizDone ? (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {quizIndex + 1}/{QUIZ_QUESTIONS.length}</span>
                <span>Ask {currentUser === 'Nani' ? 'Ammu' : 'Nani'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }} />
              </div>
              <Card className="p-6 text-center animate-scale-in">
                <p className="text-lg font-medium text-foreground leading-relaxed">
                  {QUIZ_QUESTIONS[quizIndex].q}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Ask your partner this question out loud! 🗣️
                </p>
              </Card>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (quizIndex >= QUIZ_QUESTIONS.length - 1) setQuizDone(true);
                    else setQuizIndex(i => i + 1);
                  }}
                  className="flex-1 rounded-xl"
                >
                  ❌ Wrong
                </Button>
                <Button
                  variant="romantic"
                  onClick={() => {
                    setQuizScore(s => s + 1);
                    if (quizIndex >= QUIZ_QUESTIONS.length - 1) setQuizDone(true);
                    else setQuizIndex(i => i + 1);
                  }}
                  className="flex-1 rounded-xl"
                >
                  ✅ Correct!
                </Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center animate-scale-in">
              <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
              <h3 className="text-2xl font-bold text-foreground">{quizScore}/{QUIZ_QUESTIONS.length}</h3>
              <p className="text-muted-foreground mt-1">
                {quizScore >= 8 ? "Soulmates! You know each other perfectly! 💕" :
                 quizScore >= 5 ? "Not bad! Keep learning about each other! 💛" :
                 "Time to pay more attention! 😅💗"}
              </p>
              <Button variant="romantic" onClick={startQuiz} className="mt-4 rounded-xl">
                <RotateCcw className="w-4 h-4 mr-1" /> Play Again
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Emoji Story */}
      {game === 'emoji-story' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">😄 Emoji Story</h2>
          <Card className="p-6 text-center animate-scale-in">
            <Smile className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-lg font-medium text-foreground leading-relaxed">{emojiPrompt}</p>
            <p className="text-xs text-muted-foreground mt-3">
              Go to the chat and respond using only emojis! 🎭
            </p>
          </Card>
          <Button variant="romantic" onClick={drawEmoji} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Prompt
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoupleGames;
