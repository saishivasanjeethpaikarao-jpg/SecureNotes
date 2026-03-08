import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shuffle, Flame, HelpCircle, Smile, RotateCcw, Trophy, Sparkles, Heart, Zap, Eye, MessageSquare, Dice1, Clock } from 'lucide-react';

// ─── Truth or Dare ───
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
  "Write 'I love you' with your non-dominant hand and show me",
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
  { q: "What's my favorite color?" }, { q: "What's my comfort food?" },
  { q: "What's my biggest fear?" }, { q: "What makes me laugh the most?" },
  { q: "What's my dream vacation?" }, { q: "What's my favorite movie?" },
  { q: "What do I do when I'm stressed?" }, { q: "What's my go-to song?" },
  { q: "What's my hidden talent?" }, { q: "What's the first thing I'd buy if I won the lottery?" },
];

// ─── Emoji Story ───
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

// ─── Never Have I Ever ───
const NEVER_HAVE_I_EVER = [
  "Never have I ever stalked your social media before we dated",
  "Never have I ever pretended to like something just because you like it",
  "Never have I ever re-read our old messages late at night",
  "Never have I ever saved a screenshot of our conversation",
  "Never have I ever cried because I missed you",
  "Never have I ever lied about being busy to test if you'd care",
  "Never have I ever written your name with mine just to see how it looks",
  "Never have I ever dreamt of our wedding",
  "Never have I ever practiced saying 'I love you' before actually saying it",
  "Never have I ever gotten jealous of someone talking to you",
  "Never have I ever smiled at my phone because of you in public",
  "Never have I ever watched you sleep and thought you looked adorable",
  "Never have I ever picked an outfit specifically to impress you",
  "Never have I ever pretended to be cold just to get closer to you",
  "Never have I ever thought about what our kids would look like",
];

// ─── This or That ───
const THIS_OR_THAT = [
  ["Morning cuddles", "Night cuddles"],
  ["Love letter", "Love song"],
  ["Surprise date", "Planned date"],
  ["Road trip together", "Flight vacation together"],
  ["Cooking together", "Ordering food together"],
  ["Watching sunrise", "Watching sunset"],
  ["Big wedding", "Small intimate wedding"],
  ["Pet dog together", "Pet cat together"],
  ["Matching PJs", "Stealing each other's hoodies"],
  ["First kiss", "First 'I love you'"],
  ["Rainy day in bed", "Sunny day adventure"],
  ["Slow dancing", "Crazy dancing"],
  ["Breakfast in bed", "Candlelight dinner"],
  ["Forehead kisses", "Hand holding"],
  ["Long phone calls", "Long voice notes"],
];

// ─── Complete the Sentence ───
const COMPLETE_SENTENCES = [
  "I knew I loved you when...",
  "The thing I find most attractive about you is...",
  "My favorite thing about us is...",
  "In 10 years, I see us...",
  "The funniest moment we've had together was...",
  "I feel most loved when you...",
  "If I could describe you in 3 words, they'd be...",
  "The moment I'll never forget is...",
  "Our love is like...",
  "I wish we could...",
  "The song that describes us is...",
  "My heart beats faster when you...",
  "If we had a movie, it would be called...",
  "You make me a better person because...",
  "The thing I want to do with you most is...",
];

// ─── Two Truths and a Lie ───
const TWO_TRUTHS_INSTRUCTIONS = [
  "Tell 2 truths and 1 lie about your feelings for me",
  "Tell 2 truths and 1 lie about your past relationships",
  "Tell 2 truths and 1 lie about your secret habits",
  "Tell 2 truths and 1 lie about your dreams for us",
  "Tell 2 truths and 1 lie about what you thought when we first met",
  "Tell 2 truths and 1 lie about your guilty pleasures",
  "Tell 2 truths and 1 lie about things on your bucket list",
  "Tell 2 truths and 1 lie about your childhood",
  "Tell 2 truths and 1 lie about what you do when you miss me",
  "Tell 2 truths and 1 lie about your favorite things about me",
];

// ─── 21 Questions ───
const TWENTY_ONE_Q = [
  "What's the one thing you'd change about our relationship?",
  "What's a secret fantasy you have about us?",
  "What's the bravest thing you've ever done for love?",
  "If you could have any superpower to use for us, what would it be?",
  "What's one thing you think we should try together?",
  "What's the most embarrassing thing you've done around me?",
  "If we could live anywhere in the world, where would you pick?",
  "What do you think is our couple theme song?",
  "What's something small I do that means the world to you?",
  "What's the hardest thing about being in a relationship?",
  "What's your love language and why?",
  "If we swapped lives for a day, what would you do as me?",
  "What's a childhood memory that shaped how you love?",
  "What's one promise you'll always keep?",
  "What would our dream house look like?",
  "What's the best gift you've ever received from anyone?",
  "What do you think is our biggest strength as a couple?",
  "What scares you most about the future?",
  "What's a deal-breaker for you in relationships?",
  "If we wrote a book about us, what would the title be?",
  "What's the one thing you never want to lose?",
];

type GameType = 'menu' | 'truth-or-dare' | 'would-you-rather' | 'love-quiz' | 'emoji-story' | 'never-have-i-ever' | 'this-or-that' | 'complete-sentence' | 'two-truths-lie' | '21-questions';

const CoupleGames = () => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const [game, setGame] = useState<GameType>('menu');

  // Truth or Dare
  const [todCard, setTodCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);
  // Would You Rather / This or That
  const [wyrPair, setWyrPair] = useState<string[] | null>(null);
  const [wyrChoice, setWyrChoice] = useState<number | null>(null);
  const [totPair, setTotPair] = useState<string[] | null>(null);
  const [totChoice, setTotChoice] = useState<number | null>(null);
  // Love Quiz
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  // Single prompt games
  const [emojiPrompt, setEmojiPrompt] = useState('');
  const [nhiStatement, setNhiStatement] = useState('');
  const [nhiRevealed, setNhiRevealed] = useState(false);
  const [sentence, setSentence] = useState('');
  const [twoTruthsPrompt, setTwoTruthsPrompt] = useState('');
  // 21 Questions
  const [twentyOneIndex, setTwentyOneIndex] = useState(0);

  const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

  const games = [
    { id: 'truth-or-dare' as GameType, icon: Flame, label: 'Truth or Dare', desc: 'Spicy couple edition 🔥', color: 'from-red-500 to-orange-500' },
    { id: 'would-you-rather' as GameType, icon: HelpCircle, label: 'Would You Rather', desc: 'Tough love choices 💭', color: 'from-purple-500 to-pink-500' },
    { id: 'love-quiz' as GameType, icon: Trophy, label: 'Love Quiz', desc: 'How well do you know me? 🧠', color: 'from-blue-500 to-cyan-500' },
    { id: 'emoji-story' as GameType, icon: Smile, label: 'Emoji Story', desc: 'Tell stories with emojis 😄', color: 'from-yellow-500 to-green-500' },
    { id: 'never-have-i-ever' as GameType, icon: Eye, label: 'Never Have I Ever', desc: 'Confess your secrets 👀', color: 'from-pink-500 to-rose-600' },
    { id: 'this-or-that' as GameType, icon: Zap, label: 'This or That', desc: 'Quick-fire picks ⚡', color: 'from-amber-500 to-orange-600' },
    { id: 'complete-sentence' as GameType, icon: MessageSquare, label: 'Complete the Sentence', desc: 'Finish the thought 💬', color: 'from-teal-500 to-emerald-600' },
    { id: 'two-truths-lie' as GameType, icon: Dice1, label: '2 Truths & a Lie', desc: 'Can you spot the lie? 🎭', color: 'from-indigo-500 to-violet-600' },
    { id: '21-questions' as GameType, icon: Clock, label: '21 Questions', desc: 'Deep dive together 💫', color: 'from-sky-500 to-blue-600' },
  ];

  const handleGameStart = (id: GameType) => {
    setGame(id);
    if (id === 'love-quiz') { setQuizIndex(0); setQuizScore(0); setQuizDone(false); }
    if (id === 'emoji-story') setEmojiPrompt(pickRandom(EMOJI_PROMPTS));
    if (id === 'never-have-i-ever') { setNhiStatement(pickRandom(NEVER_HAVE_I_EVER)); setNhiRevealed(false); }
    if (id === 'this-or-that') { setTotPair(pickRandom(THIS_OR_THAT)); setTotChoice(null); }
    if (id === 'complete-sentence') setSentence(pickRandom(COMPLETE_SENTENCES));
    if (id === 'two-truths-lie') setTwoTruthsPrompt(pickRandom(TWO_TRUTHS_INSTRUCTIONS));
    if (id === '21-questions') setTwentyOneIndex(0);
  };

  if (game === 'menu') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground font-romantic">Couple Games 🎮</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a game and have fun together!</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {games.map((g) => (
            <button key={g.id} onClick={() => handleGameStart(g.id)}
              className="group relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-105 active:scale-95">
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
      <button onClick={() => setGame('menu')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← Back to Games
      </button>

      {/* ── Truth or Dare ── */}
      {game === 'truth-or-dare' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">🔥 Truth or Dare</h2>
          {todCard ? (
            <Card className="p-6 text-center animate-scale-in">
              <span className={`text-xs font-bold uppercase tracking-wider ${todCard.type === 'truth' ? 'text-blue-500' : 'text-red-500'}`}>{todCard.type}</span>
              <p className="text-lg font-medium text-foreground mt-3 leading-relaxed">{todCard.text}</p>
            </Card>
          ) : (
            <Card className="p-8 text-center"><Sparkles className="w-12 h-12 mx-auto text-primary mb-3" /><p className="text-muted-foreground">Choose Truth or Dare!</p></Card>
          )}
          <div className="flex gap-3">
            <Button onClick={() => setTodCard({ type: 'truth', text: pickRandom(TRUTHS) })} className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white">😇 Truth</Button>
            <Button onClick={() => setTodCard({ type: 'dare', text: pickRandom(DARES) })} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">😈 Dare</Button>
          </div>
        </div>
      )}

      {/* ── Would You Rather ── */}
      {game === 'would-you-rather' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">💭 Would You Rather</h2>
          {wyrPair ? (
            <div className="space-y-3 animate-scale-in">
              {wyrPair.map((opt, i) => (
                <button key={i} onClick={() => setWyrChoice(i)}
                  className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${wyrChoice === i ? 'border-primary bg-primary/10 scale-[1.02]' : wyrChoice !== null ? 'border-border opacity-50' : 'border-border hover:border-primary/50'}`}>
                  <span className="text-sm font-medium text-foreground">{opt}</span>
                  {wyrChoice === i && <span className="block text-xs text-primary mt-1">Your choice! 💕</span>}
                </button>
              ))}
              {wyrChoice !== null && <p className="text-center text-sm text-muted-foreground animate-fade-in">Now ask {partner} what they'd pick! 👀</p>}
            </div>
          ) : (
            <Card className="p-8 text-center"><HelpCircle className="w-12 h-12 mx-auto text-primary mb-3" /><p className="text-muted-foreground">Tap below to start!</p></Card>
          )}
          <Button variant="romantic" onClick={() => { setWyrPair(pickRandom(WOULD_YOU_RATHER)); setWyrChoice(null); }} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> {wyrPair ? 'Next Question' : 'Start'}
          </Button>
        </div>
      )}

      {/* ── Love Quiz ── */}
      {game === 'love-quiz' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">🧠 Love Quiz</h2>
          {!quizDone ? (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {quizIndex + 1}/{QUIZ_QUESTIONS.length}</span>
                <span>Ask {partner}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%` }} />
              </div>
              <Card className="p-6 text-center animate-scale-in">
                <p className="text-lg font-medium text-foreground">{QUIZ_QUESTIONS[quizIndex].q}</p>
                <p className="text-xs text-muted-foreground mt-3">Ask your partner out loud! 🗣️</p>
              </Card>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { if (quizIndex >= QUIZ_QUESTIONS.length - 1) setQuizDone(true); else setQuizIndex(i => i + 1); }} className="flex-1 rounded-xl">❌ Wrong</Button>
                <Button variant="romantic" onClick={() => { setQuizScore(s => s + 1); if (quizIndex >= QUIZ_QUESTIONS.length - 1) setQuizDone(true); else setQuizIndex(i => i + 1); }} className="flex-1 rounded-xl">✅ Correct!</Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center animate-scale-in">
              <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
              <h3 className="text-2xl font-bold text-foreground">{quizScore}/{QUIZ_QUESTIONS.length}</h3>
              <p className="text-muted-foreground mt-1">{quizScore >= 8 ? "Soulmates! 💕" : quizScore >= 5 ? "Not bad! 💛" : "Pay more attention! 😅💗"}</p>
              <Button variant="romantic" onClick={() => { setQuizIndex(0); setQuizScore(0); setQuizDone(false); }} className="mt-4 rounded-xl"><RotateCcw className="w-4 h-4 mr-1" /> Play Again</Button>
            </Card>
          )}
        </div>
      )}

      {/* ── Emoji Story ── */}
      {game === 'emoji-story' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">😄 Emoji Story</h2>
          <Card className="p-6 text-center animate-scale-in">
            <Smile className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-lg font-medium text-foreground">{emojiPrompt}</p>
            <p className="text-xs text-muted-foreground mt-3">Respond using only emojis in chat! 🎭</p>
          </Card>
          <Button variant="romantic" onClick={() => setEmojiPrompt(pickRandom(EMOJI_PROMPTS))} className="w-full rounded-xl"><Shuffle className="w-4 h-4 mr-1" /> New Prompt</Button>
        </div>
      )}

      {/* ── Never Have I Ever ── */}
      {game === 'never-have-i-ever' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">👀 Never Have I Ever</h2>
          <Card className="p-6 text-center animate-scale-in">
            <Eye className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-lg font-medium text-foreground leading-relaxed">{nhiStatement}</p>
          </Card>
          {!nhiRevealed ? (
            <div className="flex gap-3">
              <Button onClick={() => setNhiRevealed(true)} className="flex-1 rounded-xl bg-green-500 hover:bg-green-600 text-white">🙋 I have!</Button>
              <Button onClick={() => setNhiRevealed(true)} variant="outline" className="flex-1 rounded-xl">🙅 Never!</Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground animate-fade-in">Now see if {partner} has too! 😏</p>
          )}
          <Button variant="romantic" onClick={() => { setNhiStatement(pickRandom(NEVER_HAVE_I_EVER)); setNhiRevealed(false); }} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> Next Statement
          </Button>
        </div>
      )}

      {/* ── This or That ── */}
      {game === 'this-or-that' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">⚡ This or That</h2>
          {totPair && (
            <div className="space-y-3 animate-scale-in">
              {totPair.map((opt, i) => (
                <button key={i} onClick={() => setTotChoice(i)}
                  className={`w-full p-5 rounded-2xl text-center transition-all border-2 font-medium ${totChoice === i ? 'border-primary bg-primary/10 scale-[1.02]' : totChoice !== null ? 'border-border opacity-50' : 'border-border hover:border-primary/50'}`}>
                  <span className="text-foreground">{opt}</span>
                  {totChoice === i && <span className="block text-xs text-primary mt-1">💕</span>}
                </button>
              ))}
              {totChoice !== null && <p className="text-center text-sm text-muted-foreground animate-fade-in">Does {partner} agree? 🤔</p>}
            </div>
          )}
          <Button variant="romantic" onClick={() => { setTotPair(pickRandom(THIS_OR_THAT)); setTotChoice(null); }} className="w-full rounded-xl">
            <Zap className="w-4 h-4 mr-1" /> Next Pick
          </Button>
        </div>
      )}

      {/* ── Complete the Sentence ── */}
      {game === 'complete-sentence' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">💬 Complete the Sentence</h2>
          <Card className="p-6 text-center animate-scale-in">
            <MessageSquare className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-xl font-medium text-foreground leading-relaxed italic">"{sentence}"</p>
            <p className="text-xs text-muted-foreground mt-4">Both of you complete this sentence, then compare! 💕</p>
          </Card>
          <Button variant="romantic" onClick={() => setSentence(pickRandom(COMPLETE_SENTENCES))} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Sentence
          </Button>
        </div>
      )}

      {/* ── Two Truths and a Lie ── */}
      {game === 'two-truths-lie' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">🎭 2 Truths & a Lie</h2>
          <Card className="p-6 text-center animate-scale-in">
            <Dice1 className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="text-lg font-medium text-foreground leading-relaxed">{twoTruthsPrompt}</p>
            <p className="text-xs text-muted-foreground mt-4">One person shares, the other guesses which is the lie! 🕵️</p>
          </Card>
          <Button variant="romantic" onClick={() => setTwoTruthsPrompt(pickRandom(TWO_TRUTHS_INSTRUCTIONS))} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Topic
          </Button>
        </div>
      )}

      {/* ── 21 Questions ── */}
      {game === '21-questions' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">💫 21 Questions</h2>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Question {twentyOneIndex + 1}/{TWENTY_ONE_Q.length}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((twentyOneIndex + 1) / TWENTY_ONE_Q.length) * 100}%` }} />
          </div>
          <Card className="p-6 text-center animate-scale-in">
            <p className="text-lg font-medium text-foreground leading-relaxed">{TWENTY_ONE_Q[twentyOneIndex]}</p>
            <p className="text-xs text-muted-foreground mt-3">Take turns answering! 🗣️</p>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setTwentyOneIndex(i => Math.max(0, i - 1))} disabled={twentyOneIndex === 0} className="flex-1 rounded-xl">← Previous</Button>
            <Button variant="romantic" onClick={() => setTwentyOneIndex(i => Math.min(TWENTY_ONE_Q.length - 1, i + 1))} disabled={twentyOneIndex >= TWENTY_ONE_Q.length - 1} className="flex-1 rounded-xl">Next →</Button>
          </div>
          {twentyOneIndex >= TWENTY_ONE_Q.length - 1 && (
            <Card className="p-4 text-center animate-fade-in bg-primary/5 border-primary/20">
              <p className="text-sm font-medium text-foreground">🎉 You completed all 21 questions!</p>
              <Button variant="romantic" size="sm" onClick={() => setTwentyOneIndex(0)} className="mt-2 rounded-xl"><RotateCcw className="w-3 h-3 mr-1" /> Start Over</Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CoupleGames;
