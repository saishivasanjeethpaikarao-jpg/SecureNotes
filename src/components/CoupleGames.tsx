import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shuffle, Flame, HelpCircle, Smile, RotateCcw, Trophy, Sparkles, Heart, Zap, Eye, MessageSquare, Dice1, Clock, Users, BarChart3, Wand2, Loader2 } from 'lucide-react';
import GameResults from './GameResults';
import WormGame from './WormGame';
import { toast } from 'sonner';

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
  "What's one thing about me that surprised you?",
  "What's a nickname you secretly want to call me?",
  "What's the most attractive thing about my personality?",
  "If you could change one thing about how we met, what would it be?",
  "What's one thing I do that drives you crazy (in a good way)?",
  "What's your favorite inside joke we have?",
  "What would you do if we were apart for a whole year?",
  "What's the most thoughtful thing I've ever done for you?",
  "What's something about me that only you know?",
  "If you had to describe our relationship to a stranger, what would you say?",
  "What was the moment you knew this was something special?",
  "What's a fear you have about our future?",
  "What's the best advice you'd give to other couples?",
  "What's a compliment you've been wanting to give me?",
  "What do you think we'll be like when we're old?",
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
  "Record a video telling me why you love me",
  "Send me the most embarrassing photo on your phone",
  "Draw a portrait of me in 1 minute and show me",
  "Act out how we first met",
  "Send a paragraph about what you love about me to my family group chat",
  "Whisper something sweet and record it",
  "Do 10 pushups and dedicate each one to something you love about me",
  "Make a TikTok/reel about us right now",
  "Write our love story in exactly 3 sentences",
  "Describe our perfect future in 60 seconds without stopping",
  "Give me a dramatic movie-style love confession",
  "Send me your best 'missing you' selfie face",
  "List 10 reasons you love me without pausing",
  "Recreate our first text conversation from memory",
  "Serenade me with any song right now",
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
  ["Never argue again", "Always make up with a kiss"],
  ["Have one perfect day together on repeat", "Have a new adventure every day"],
  ["Be able to teleport to each other", "Be able to read each other's emotions"],
  ["Live in a tiny house together", "Live in separate mansions next door"],
  ["Only communicate through love letters", "Only communicate through songs"],
  ["Go back to when we first met", "Jump 20 years into the future together"],
  ["Have a movie made about us", "Have a song written about us"],
  ["Forget our first kiss", "Forget our first 'I love you'"],
  ["Always agree on everything", "Have passionate debates about everything"],
  ["Spend every holiday together forever", "Take turns choosing surprise vacation spots"],
  ["Be famous together", "Be secretly in love forever"],
  ["Share all passwords", "Have zero secrets but keep passwords private"],
  ["Grow old without wrinkles", "Grow old with all our memories intact"],
  ["Have breakfast in bed every day", "Have a surprise date every week"],
  ["Live without music", "Live without movies"],
];

// ─── Love Quiz ───
const QUIZ_QUESTIONS = [
  { q: "What's my favorite color?" },
  { q: "What's my comfort food?" },
  { q: "What's my biggest fear?" },
  { q: "What makes me laugh the most?" },
  { q: "What's my dream vacation?" },
  { q: "What's my favorite movie?" },
  { q: "What do I do when I'm stressed?" },
  { q: "What's my go-to song?" },
  { q: "What's my hidden talent?" },
  { q: "What's the first thing I'd buy if I won the lottery?" },
  { q: "What's my favorite season?" },
  { q: "What's my shoe size?" },
  { q: "What do I order at our favorite restaurant?" },
  { q: "What's my middle name?" },
  { q: "What time do I usually wake up?" },
  { q: "What's my biggest pet peeve?" },
  { q: "What's my favorite childhood memory?" },
  { q: "Who's my celebrity crush?" },
  { q: "What's my favorite ice cream flavor?" },
  { q: "What's my most-used emoji?" },
  { q: "What do I do first thing in the morning?" },
  { q: "What's my favorite book or author?" },
  { q: "What's the weirdest food I like?" },
  { q: "What's my favorite thing to do on a lazy day?" },
  { q: "What would I name our future pet?" },
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
  "Describe our biggest fight and makeup in emojis",
  "Show what our wedding would look like in emojis",
  "Describe our perfect vacation in emojis",
  "Show how you feel when you miss me (emojis only)",
  "Describe our morning routine together in emojis",
  "What would our movie plot be? (emojis only)",
  "Describe our anniversary celebration in emojis",
  "Show our entire relationship timeline in emojis",
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
  "Never have I ever googled relationship advice because of us",
  "Never have I ever secretly smelled your hoodie when you weren't around",
  "Never have I ever stayed up all night just talking to you",
  "Never have I ever deleted a text before sending it because it was too cheesy",
  "Never have I ever told my friends every detail about our dates",
  "Never have I ever planned our future in my head without telling you",
  "Never have I ever cried happy tears because of something you did",
  "Never have I ever pretended to not see your message so I could reply later",
  "Never have I ever checked if you were online on social media",
  "Never have I ever doodled hearts with our initials",
  "Never have I ever rehearsed a conversation before talking to you",
  "Never have I ever kept a gift wrapper or ticket from our date as a memory",
  "Never have I ever secretly taken a photo of you without you knowing",
  "Never have I ever wished we met sooner",
  "Never have I ever faked being tired to cuddle with you",
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
  ["Netflix and chill", "Go out and party"],
  ["Picnic in the park", "Dinner at a fancy restaurant"],
  ["Beach holiday", "Mountain retreat"],
  ["Couple tattoos", "Couple rings"],
  ["Movie marathon", "Game night"],
  ["Sweet texts all day", "One long goodnight call"],
  ["Amusement park date", "Museum date"],
  ["Bubble bath together", "Stargazing together"],
  ["Write a song together", "Paint together"],
  ["Stay up late together", "Wake up early together"],
  ["Share one dessert", "Get your own desserts"],
  ["Dance in the rain", "Build a snowman together"],
  ["Couple Halloween costumes", "Couple New Year's resolutions"],
  ["Weekend getaway", "Staycation at home"],
  ["Ice cream date", "Coffee date"],
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
  "When I'm with you, I feel...",
  "The craziest thing I'd do for you is...",
  "If I could give you anything, it would be...",
  "You're different from everyone else because...",
  "The first thing I think about in the morning is...",
  "I can't imagine my life without...",
  "My favorite way to spend time with you is...",
  "The best surprise you ever gave me was...",
  "If we could travel anywhere right now, I'd take you to...",
  "One thing I've learned from loving you is...",
  "The sound of your voice makes me...",
  "When we're apart, I always...",
  "The thing I'm most grateful for about us is...",
  "If today was our last day, I'd want to...",
  "Loving you taught me that...",
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
  "Tell 2 truths and 1 lie about your biggest fears",
  "Tell 2 truths and 1 lie about your happiest memories",
  "Tell 2 truths and 1 lie about things you've never told anyone",
  "Tell 2 truths and 1 lie about your most embarrassing moments",
  "Tell 2 truths and 1 lie about your future plans",
  "Tell 2 truths and 1 lie about your relationship dealbreakers",
  "Tell 2 truths and 1 lie about what makes you cry",
  "Tell 2 truths and 1 lie about your proudest achievements",
  "Tell 2 truths and 1 lie about your worst dates ever",
  "Tell 2 truths and 1 lie about things that make you jealous",
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
  "What's the most selfless thing you've done for someone?",
  "What's a tradition you want us to start?",
  "What does 'home' mean to you?",
  "What's the hardest truth you've had to accept?",
  "If you could fix one mistake from your past, what would it be?",
  "What makes you feel truly safe?",
  "What's the most important lesson love has taught you?",
  "What do you think our friends say about us?",
  "What's something you admire about me that you've never said?",
  "If you could freeze one moment in time, which would it be?",
  "What would you sacrifice for our relationship?",
  "What's the kindest thing a stranger has done for you?",
  "What's your definition of a perfect day with me?",
  "What do you think we'll argue about when we're old?",
];

type GameType = 'menu' | 'results' | 'truth-or-dare' | 'would-you-rather' | 'love-quiz' | 'emoji-story' | 'never-have-i-ever' | 'this-or-that' | 'complete-sentence' | 'two-truths-lie' | '21-questions' | 'worm';

interface GameState {
  game: GameType;
  todCard?: { type: 'truth' | 'dare'; text: string } | null;
  wyrPair?: string[] | null;
  quizIndex?: number;
  quizScore?: number;
  quizDone?: boolean;
  emojiPrompt?: string;
  nhiStatement?: string;
  nhiRevealed?: boolean;
  totPair?: string[] | null;
  sentence?: string;
  twoTruthsPrompt?: string;
  twentyOneIndex?: number;
  triggeredBy?: string;
}

// Helper: pick random from array avoiding used indices, reset when all used
const pickUnused = <T,>(arr: T[], usedSet: Set<number>): { item: T; index: number } => {
  // If all used, reset
  if (usedSet.size >= arr.length) {
    usedSet.clear();
  }
  const available = arr.map((item, i) => ({ item, index: i })).filter(({ index }) => !usedSet.has(index));
  const pick = available[Math.floor(Math.random() * available.length)];
  usedSet.add(pick.index);
  return pick;
};

const CHANNEL_NAME = 'couple-games-sync';

const CoupleGames = () => {
  const { currentUser } = useAuth();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // ─── Game state ───
  const [game, setGame] = useState<GameType>('menu');
  const [todCard, setTodCard] = useState<{ type: 'truth' | 'dare'; text: string } | null>(null);
  const [wyrPair, setWyrPair] = useState<string[] | null>(null);
  const [wyrChoice, setWyrChoice] = useState<number | null>(null);
  const [wyrPartnerChoice, setWyrPartnerChoice] = useState<number | null>(null);
  const [totPair, setTotPair] = useState<string[] | null>(null);
  const [totChoice, setTotChoice] = useState<number | null>(null);
  const [totPartnerChoice, setTotPartnerChoice] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [emojiPrompt, setEmojiPrompt] = useState('');
  const [nhiStatement, setNhiStatement] = useState('');
  const [nhiRevealed, setNhiRevealed] = useState(false);
  const [sentence, setSentence] = useState('');
  const [twoTruthsPrompt, setTwoTruthsPrompt] = useState('');
  const [twentyOneIndex, setTwentyOneIndex] = useState(0);

  // ─── AI question state ───
  const [aiLoading, setAiLoading] = useState(false);
  const aiPreviousQuestions = useRef<string[]>([]);

  // ─── Used question tracking (no repeats per session) ───
  const usedTruths = useRef(new Set<number>());
  const usedDares = useRef(new Set<number>());
  const usedWyr = useRef(new Set<number>());
  const usedEmoji = useRef(new Set<number>());
  const usedNhi = useRef(new Set<number>());
  const usedTot = useRef(new Set<number>());
  const usedSentence = useRef(new Set<number>());
  const usedTwoTruths = useRef(new Set<number>());

  const pickRandom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const bothPicked = (a: number | null, b: number | null) => a !== null && b !== null;

  // ─── Save game result to DB ───
  const saveResult = useCallback(async (gameType: string, questionText: string, result: string, details?: Record<string, unknown>) => {
    if (!currentUser) return;
    try {
      await supabase.from('game_results').insert([{
        game_type: gameType,
        played_by: currentUser,
        partner,
        question_text: questionText,
        result,
        details: (details || {}) as any,
      }]);
    } catch (e) {
      console.error('Failed to save game result:', e);
    }
  }, [currentUser, partner]);

  // ─── Broadcast helper ───
  const broadcast = useCallback((state: Partial<GameState>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game_sync',
      payload: { ...state, triggeredBy: currentUser },
    });
  }, [currentUser]);

  // ─── Fetch AI-generated personalized question ───
  const fetchAiQuestion = useCallback(async (gameType: string) => {
    if (!currentUser || aiLoading) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-questions', {
        body: { gameType, currentUser, partner, previousQuestions: aiPreviousQuestions.current },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      switch (gameType) {
        case 'truth-or-dare': {
          const type = Math.random() > 0.5 ? 'truth' : 'dare';
          const text = type === 'truth' ? data.truth : data.dare;
          const card = { type: type as 'truth' | 'dare', text };
          setTodCard(card);
          broadcast({ todCard: card });
          saveResult('truth-or-dare', text, `ai-${type}`);
          aiPreviousQuestions.current.push(data.truth, data.dare);
          break;
        }
        case 'would-you-rather': {
          const pair = [data.option_a, data.option_b];
          setWyrPair(pair); setWyrChoice(null); setWyrPartnerChoice(null);
          broadcast({ wyrPair: pair });
          aiPreviousQuestions.current.push(pair.join(' vs '));
          break;
        }
        case 'love-quiz': {
          const q = data.question;
          setTodCard({ type: 'truth', text: q });
          broadcast({ todCard: { type: 'truth', text: q } });
          aiPreviousQuestions.current.push(q);
          break;
        }
        case 'never-have-i-ever': {
          setNhiStatement(data.statement); setNhiRevealed(false);
          broadcast({ nhiStatement: data.statement });
          aiPreviousQuestions.current.push(data.statement);
          break;
        }
        case 'this-or-that': {
          const pair = [data.option_a, data.option_b];
          setTotPair(pair); setTotChoice(null); setTotPartnerChoice(null);
          broadcast({ totPair: pair });
          aiPreviousQuestions.current.push(pair.join(' vs '));
          break;
        }
        case 'complete-sentence': {
          setSentence(data.sentence);
          broadcast({ sentence: data.sentence });
          aiPreviousQuestions.current.push(data.sentence);
          break;
        }
        case 'two-truths-lie': {
          setTwoTruthsPrompt(data.prompt);
          broadcast({ twoTruthsPrompt: data.prompt });
          aiPreviousQuestions.current.push(data.prompt);
          break;
        }
        case '21-questions':
        case 'emoji-story': {
          const q = data.question || data.prompt || data.sentence;
          if (gameType === 'emoji-story') {
            setEmojiPrompt(q);
            broadcast({ emojiPrompt: q });
          } else {
            setTodCard({ type: 'truth', text: q });
            broadcast({ todCard: { type: 'truth', text: q } });
          }
          aiPreviousQuestions.current.push(q);
          break;
        }
      }
      toast.success('✨ AI generated a personalized question!');
    } catch (e) {
      console.error('AI question error:', e);
      toast.error('Failed to generate AI question');
    } finally {
      setAiLoading(false);
    }
  }, [currentUser, partner, aiLoading, broadcast, saveResult]);

  const applyState = useCallback((s: GameState) => {
    if (s.game !== undefined) setGame(s.game);
    if (s.todCard !== undefined) setTodCard(s.todCard);
    if (s.wyrPair !== undefined) { setWyrPair(s.wyrPair); setWyrChoice(null); setWyrPartnerChoice(null); }
    if (s.quizIndex !== undefined) setQuizIndex(s.quizIndex);
    if (s.quizScore !== undefined) setQuizScore(s.quizScore);
    if (s.quizDone !== undefined) setQuizDone(s.quizDone);
    if (s.emojiPrompt !== undefined) setEmojiPrompt(s.emojiPrompt);
    if (s.nhiStatement !== undefined) { setNhiStatement(s.nhiStatement); setNhiRevealed(false); }
    if (s.totPair !== undefined) { setTotPair(s.totPair); setTotChoice(null); setTotPartnerChoice(null); }
    if (s.sentence !== undefined) setSentence(s.sentence);
    if (s.twoTruthsPrompt !== undefined) setTwoTruthsPrompt(s.twoTruthsPrompt);
    if (s.twentyOneIndex !== undefined) setTwentyOneIndex(s.twentyOneIndex);
  }, []);

  // ─── Setup channel ───
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: currentUser } },
    });

    channel
      .on('broadcast', { event: 'game_sync' }, ({ payload }) => {
        if (payload.triggeredBy !== currentUser) {
          applyState(payload as GameState);
        }
      })
      .on('broadcast', { event: 'choice_sync' }, ({ payload }) => {
        if (payload.user !== currentUser) {
          if (payload.gameType === 'wyr') setWyrPartnerChoice(payload.choice);
          if (payload.gameType === 'tot') setTotPartnerChoice(payload.choice);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        setPartnerOnline(keys.includes(partner));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: currentUser, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, partner, applyState]);

  // ─── Reset used questions when starting a new game ───
  const resetUsedForGame = (id: GameType) => {
    if (id === 'truth-or-dare') { usedTruths.current.clear(); usedDares.current.clear(); }
    if (id === 'would-you-rather') usedWyr.current.clear();
    if (id === 'emoji-story') usedEmoji.current.clear();
    if (id === 'never-have-i-ever') usedNhi.current.clear();
    if (id === 'this-or-that') usedTot.current.clear();
    if (id === 'complete-sentence') usedSentence.current.clear();
    if (id === 'two-truths-lie') usedTwoTruths.current.clear();
  };

  // ─── Synced actions ───
  const handleGameStart = (id: GameType) => {
    resetUsedForGame(id);
    const state: Partial<GameState> = { game: id };
    if (id === 'love-quiz') { state.quizIndex = 0; state.quizScore = 0; state.quizDone = false; }
    if (id === 'emoji-story') { const { item } = pickUnused(EMOJI_PROMPTS, usedEmoji.current); state.emojiPrompt = item; }
    if (id === 'never-have-i-ever') { const { item } = pickUnused(NEVER_HAVE_I_EVER, usedNhi.current); state.nhiStatement = item; }
    if (id === 'this-or-that') { const { item } = pickUnused(THIS_OR_THAT, usedTot.current); state.totPair = item; }
    if (id === 'complete-sentence') { const { item } = pickUnused(COMPLETE_SENTENCES, usedSentence.current); state.sentence = item; }
    if (id === 'two-truths-lie') { const { item } = pickUnused(TWO_TRUTHS_INSTRUCTIONS, usedTwoTruths.current); state.twoTruthsPrompt = item; }
    if (id === '21-questions') { state.twentyOneIndex = 0; }
    applyState(state as GameState);
    broadcast(state);
  };

  const syncedSetTodCard = (type: 'truth' | 'dare') => {
    const arr = type === 'truth' ? TRUTHS : DARES;
    const usedSet = type === 'truth' ? usedTruths.current : usedDares.current;
    const { item } = pickUnused(arr, usedSet);
    const card = { type, text: item };
    setTodCard(card);
    broadcast({ todCard: card });
    saveResult('truth-or-dare', item, type);
  };

  const syncedSetWyrPair = () => {
    const { item } = pickUnused(WOULD_YOU_RATHER, usedWyr.current);
    setWyrPair(item); setWyrChoice(null); setWyrPartnerChoice(null);
    broadcast({ wyrPair: item });
  };

  const syncedWyrChoice = (i: number) => {
    setWyrChoice(i);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'choice_sync',
      payload: { user: currentUser, gameType: 'wyr', choice: i },
    });
    if (wyrPair) {
      saveResult('would-you-rather', wyrPair.join(' vs '), wyrPair[i], { choice_index: i });
    }
  };

  const syncedTotChoice = (i: number) => {
    setTotChoice(i);
    channelRef.current?.send({
      type: 'broadcast',
      event: 'choice_sync',
      payload: { user: currentUser, gameType: 'tot', choice: i },
    });
    if (totPair) {
      saveResult('this-or-that', totPair.join(' vs '), totPair[i], { choice_index: i });
    }
  };

  const syncedQuizNext = (correct: boolean) => {
    const newScore = correct ? quizScore + 1 : quizScore;
    const done = quizIndex >= QUIZ_QUESTIONS.length - 1;
    const newIndex = done ? quizIndex : quizIndex + 1;
    setQuizScore(newScore);
    if (done) {
      setQuizDone(true);
      saveResult('love-quiz', `Quiz completed`, `${newScore}/${QUIZ_QUESTIONS.length}`, { score: newScore, total: QUIZ_QUESTIONS.length });
    } else {
      setQuizIndex(newIndex);
    }
    broadcast({ quizScore: newScore, quizDone: done, quizIndex: newIndex });
  };

  const syncedQuizReset = () => {
    setQuizIndex(0); setQuizScore(0); setQuizDone(false);
    broadcast({ quizIndex: 0, quizScore: 0, quizDone: false });
  };

  const syncedEmojiNext = () => {
    const { item } = pickUnused(EMOJI_PROMPTS, usedEmoji.current);
    setEmojiPrompt(item);
    broadcast({ emojiPrompt: item });
  };

  const syncedNhiNext = () => {
    const { item } = pickUnused(NEVER_HAVE_I_EVER, usedNhi.current);
    setNhiStatement(item); setNhiRevealed(false);
    broadcast({ nhiStatement: item });
  };

  const syncedNhiAnswer = (answer: 'I have' | 'Never') => {
    setNhiRevealed(true);
    saveResult('never-have-i-ever', nhiStatement, answer);
  };

  const syncedTotNext = () => {
    const { item } = pickUnused(THIS_OR_THAT, usedTot.current);
    setTotPair(item); setTotChoice(null); setTotPartnerChoice(null);
    broadcast({ totPair: item });
  };

  const syncedSentenceNext = () => {
    const { item } = pickUnused(COMPLETE_SENTENCES, usedSentence.current);
    setSentence(item);
    broadcast({ sentence: item });
  };

  const syncedTwoTruthsNext = () => {
    const { item } = pickUnused(TWO_TRUTHS_INSTRUCTIONS, usedTwoTruths.current);
    setTwoTruthsPrompt(item);
    broadcast({ twoTruthsPrompt: item });
  };

  const synced21Next = () => {
    const n = Math.min(TWENTY_ONE_Q.length - 1, twentyOneIndex + 1);
    setTwentyOneIndex(n);
    broadcast({ twentyOneIndex: n });
  };

  const synced21Prev = () => {
    const n = Math.max(0, twentyOneIndex - 1);
    setTwentyOneIndex(n);
    broadcast({ twentyOneIndex: n });
  };

  const synced21Reset = () => {
    setTwentyOneIndex(0);
    broadcast({ twentyOneIndex: 0 });
  };

  const syncedBackToMenu = () => {
    setGame('menu');
    broadcast({ game: 'menu' });
  };

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
    { id: 'worm' as GameType, icon: Heart, label: 'Love Worm', desc: 'Classic snake game 🐍', color: 'from-rose-500 to-fuchsia-600' },
  ];

  // ─── Online indicator ───
  const OnlineBadge = () => (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${partnerOnline ? 'bg-green-500/15 text-green-600' : 'bg-muted text-muted-foreground'}`}>
      <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
      {partnerOnline ? `${partner} is here!` : `${partner} offline`}
    </div>
  );

  if (game === 'results') {
    return <GameResults onBack={syncedBackToMenu} />;
  }

  if (game === 'worm') {
    return <WormGame onBack={syncedBackToMenu} />;
  }

  if (game === 'menu') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-foreground font-romantic">Couple Games 🎮</h2>
          <p className="text-sm text-muted-foreground mt-1">Pick a game and have fun together!</p>
          <div className="flex justify-center mt-2"><OnlineBadge /></div>
        </div>
        <button onClick={() => { setGame('results'); broadcast({ game: 'results' as any }); }}
          className="w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-95 border-2 border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Game Results & Love Score</h3>
              <p className="text-[11px] text-muted-foreground">View stats, match rate & history 🏆</p>
            </div>
          </div>
        </button>
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
      <div className="flex items-center justify-between">
        <button onClick={syncedBackToMenu} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Games
        </button>
        <OnlineBadge />
      </div>

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
            <Button onClick={() => syncedSetTodCard('truth')} className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white">😇 Truth</Button>
            <Button onClick={() => syncedSetTodCard('dare')} className="flex-1 rounded-xl bg-red-500 hover:bg-red-600 text-white">😈 Dare</Button>
          </div>
          <Button variant="outline" onClick={() => fetchAiQuestion('truth-or-dare')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized Question ✨
          </Button>
        </div>
      )}

      {/* ── Would You Rather ── */}
      {game === 'would-you-rather' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">💭 Would You Rather</h2>
          {wyrPair ? (
            <div className="space-y-3 animate-scale-in">
              {wyrPair.map((opt, i) => {
                const bothPicked = wyrChoice !== null && wyrPartnerChoice !== null;
                const myPick = wyrChoice === i;
                const partnerPick = wyrPartnerChoice === i;
                return (
                  <button key={i} onClick={() => wyrChoice === null && syncedWyrChoice(i)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${myPick ? 'border-primary bg-primary/10 scale-[1.02]' : wyrChoice !== null && !bothPicked ? 'border-border opacity-50' : partnerPick && bothPicked ? 'border-accent bg-accent/10' : 'border-border hover:border-primary/50'}`}>
                    <span className="text-sm font-medium text-foreground">{opt}</span>
                    {bothPicked && (
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {myPick && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">You 💕</span>}
                        {partnerPick && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground font-medium">{partner} 💕</span>}
                      </div>
                    )}
                    {myPick && !bothPicked && <span className="block text-xs text-primary mt-1">Your choice! Waiting for {partner}...</span>}
                  </button>
                );
              })}
              {bothPicked(wyrChoice, wyrPartnerChoice) && (
                <p className="text-center text-sm animate-fade-in font-medium">
                  {wyrChoice === wyrPartnerChoice ? '🎉 You both picked the same! Soulmates!' : `😄 Different picks — great convo starter!`}
                </p>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center"><HelpCircle className="w-12 h-12 mx-auto text-primary mb-3" /><p className="text-muted-foreground">Tap below to start!</p></Card>
          )}
          <Button variant="romantic" onClick={syncedSetWyrPair} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> {wyrPair ? 'Next Question' : 'Start'}
          </Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('would-you-rather')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
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
                <Button variant="outline" onClick={() => syncedQuizNext(false)} className="flex-1 rounded-xl">❌ Wrong</Button>
                <Button variant="romantic" onClick={() => syncedQuizNext(true)} className="flex-1 rounded-xl">✅ Correct!</Button>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center animate-scale-in">
              <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-3" />
              <h3 className="text-2xl font-bold text-foreground">{quizScore}/{QUIZ_QUESTIONS.length}</h3>
              <p className="text-muted-foreground mt-1">{quizScore >= 8 ? "Soulmates! 💕" : quizScore >= 5 ? "Not bad! 💛" : "Pay more attention! 😅💗"}</p>
              <Button variant="romantic" onClick={syncedQuizReset} className="mt-4 rounded-xl"><RotateCcw className="w-4 h-4 mr-1" /> Play Again</Button>
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
          <Button variant="romantic" onClick={syncedEmojiNext} className="w-full rounded-xl"><Shuffle className="w-4 h-4 mr-1" /> New Prompt</Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('emoji-story')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
          </Button>
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
              <Button onClick={() => syncedNhiAnswer('I have')} className="flex-1 rounded-xl bg-green-500 hover:bg-green-600 text-white">🙋 I have!</Button>
              <Button onClick={() => syncedNhiAnswer('Never')} variant="outline" className="flex-1 rounded-xl">🙅 Never!</Button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground animate-fade-in">Now see if {partner} has too! 😏</p>
          )}
          <Button variant="romantic" onClick={syncedNhiNext} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> Next Statement
          </Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('never-have-i-ever')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
          </Button>
        </div>
      )}

      {/* ── This or That ── */}
      {game === 'this-or-that' && (
        <div className="space-y-4 animate-fade-in">
          <h2 className="text-lg font-bold text-foreground text-center">⚡ This or That</h2>
          {totPair && (
            <div className="space-y-3 animate-scale-in">
              {totPair.map((opt, i) => {
                const bothPicked2 = totChoice !== null && totPartnerChoice !== null;
                const myPick = totChoice === i;
                const partnerPick = totPartnerChoice === i;
                return (
                  <button key={i} onClick={() => totChoice === null && syncedTotChoice(i)}
                    className={`w-full p-5 rounded-2xl text-center transition-all border-2 font-medium ${myPick ? 'border-primary bg-primary/10 scale-[1.02]' : totChoice !== null && !bothPicked2 ? 'border-border opacity-50' : partnerPick && bothPicked2 ? 'border-accent bg-accent/10' : 'border-border hover:border-primary/50'}`}>
                    <span className="text-foreground">{opt}</span>
                    {bothPicked2 && (
                      <div className="flex gap-2 mt-1.5 justify-center flex-wrap">
                        {myPick && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">You 💕</span>}
                        {partnerPick && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground font-medium">{partner} 💕</span>}
                      </div>
                    )}
                    {myPick && !bothPicked2 && <span className="block text-xs text-primary mt-1">Waiting for {partner}...</span>}
                  </button>
                );
              })}
              {bothPicked(totChoice, totPartnerChoice) && (
                <p className="text-center text-sm animate-fade-in font-medium">
                  {totChoice === totPartnerChoice ? '🎉 You agree! Perfect match!' : `😄 Different vibes — both are great!`}
                </p>
              )}
            </div>
          )}
          <Button variant="romantic" onClick={syncedTotNext} className="w-full rounded-xl">
            <Zap className="w-4 h-4 mr-1" /> Next Pick
          </Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('this-or-that')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
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
          <Button variant="romantic" onClick={syncedSentenceNext} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Sentence
          </Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('complete-sentence')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
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
          <Button variant="romantic" onClick={syncedTwoTruthsNext} className="w-full rounded-xl">
            <Shuffle className="w-4 h-4 mr-1" /> New Topic
          </Button>
          <Button variant="outline" onClick={() => fetchAiQuestion('two-truths-lie')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
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
            <Button variant="outline" onClick={synced21Prev} disabled={twentyOneIndex === 0} className="flex-1 rounded-xl">← Previous</Button>
            <Button variant="romantic" onClick={synced21Next} disabled={twentyOneIndex >= TWENTY_ONE_Q.length - 1} className="flex-1 rounded-xl">Next →</Button>
          </div>
          {twentyOneIndex >= TWENTY_ONE_Q.length - 1 && (
            <Card className="p-4 text-center animate-fade-in bg-primary/5 border-primary/20">
              <p className="text-sm font-medium text-foreground">🎉 You completed all 21 questions!</p>
              <Button variant="romantic" size="sm" onClick={synced21Reset} className="mt-2 rounded-xl"><RotateCcw className="w-3 h-3 mr-1" /> Start Over</Button>
            </Card>
          )}
          <Button variant="outline" onClick={() => fetchAiQuestion('21-questions')} disabled={aiLoading} className="w-full rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            {aiLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />} AI Personalized ✨
          </Button>
        </div>
      )}
    </div>
  );
};

export default CoupleGames;
