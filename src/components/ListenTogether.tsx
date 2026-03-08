import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMusic } from '@/contexts/MusicContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Music, Headphones, Play, Pause, Sparkles, Star, Heart, Plus, ListMusic, X, Trash2, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import avatarAmmu from '@/assets/avatar-ammu.png';
import avatarNani from '@/assets/avatar-nani.png';

interface ListenSession {
  id: string;
  youtube_url: string;
  song_title: string;
  started_by: string;
  nani_feeling: string | null;
  ammu_feeling: string | null;
  saved_to_memory: boolean;
  created_at: string;
}

interface PlaylistItem {
  id: string;
  youtube_url: string;
  song_title: string;
  added_by: string;
  is_favorite: boolean;
  created_at: string;
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

const FEELINGS = [
  { emoji: '❤️', label: 'Love it' },
  { emoji: '🥰', label: 'Romantic' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😢', label: 'Emotional' },
  { emoji: '⭐', label: 'Favorite' },
];

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const getThumbnail = (url: string) => {
  const id = extractYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

const ListenTogether = () => {
  const { currentUser } = useAuth();
  const { isPlaying, setIsPlaying, playSong, currentTime, duration, seekTo, seekForward, seekBackward, playNext, playPrev, playlist: globalPlaylist } = useMusic();
  const { toast } = useToast();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const [session, setSession] = useState<ListenSession | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [musicMemories, setMusicMemories] = useState<ListenSession[]>([]);
  const [myFeeling, setMyFeeling] = useState<string | null>(null);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  const [sparkleId, setSparkleId] = useState<string | null>(null);
  const [partnerOnline, setPartnerOnline] = useState(false);

  // Presence tracking
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase.channel('listen-presence', {
      config: { presence: { key: currentUser } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setPartnerOnline(!!state[partner]);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: currentUser, online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, partner]);

  // Fetch all data
  useEffect(() => {
    const fetchAll = async () => {
      const [sessionsRes, playlistRes] = await Promise.all([
        supabase.from('listen_together').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('couple_playlist').select('*').order('created_at', { ascending: true }),
      ]);
      if (sessionsRes.data && sessionsRes.data.length > 0) {
        const sessions = sessionsRes.data as ListenSession[];
        setSession(sessions[0]);
        setMusicMemories(sessions);
        const feelingField = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
        setMyFeeling(sessions[0][feelingField as keyof ListenSession] as string | null);
      }
      if (playlistRes.data) setPlaylist(playlistRes.data as PlaylistItem[]);
    };
    fetchAll();
  }, [currentUser]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('couple-music')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listen_together' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const s = payload.new as ListenSession;
          setSession(s);
          setMyFeeling(null);
          setIsPlaying(true);
          setMusicMemories(prev => [s, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const s = payload.new as ListenSession;
          setSession(prev => prev?.id === s.id ? s : prev);
          setMusicMemories(prev => prev.map(m => m.id === s.id ? s : m));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_playlist' }, () => {
        supabase.from('couple_playlist').select('*').order('created_at', { ascending: true }).then(({ data }) => {
          if (data) setPlaylist(data as PlaylistItem[]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const spawnFloatingEmoji = useCallback((emoji: string) => {
    const id = Date.now();
    const x = 20 + Math.random() * 60;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 2000);
  }, []);

  const handleStartSong = async () => {
    const url = urlInput.trim();
    const title = titleInput.trim();
    if (!url || !title) return;
    if (!extractYouTubeId(url)) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid YouTube link', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.from('listen_together').insert({
      youtube_url: url, song_title: title, started_by: currentUser!,
    }).select().single();
    if (error) { toast({ title: 'Error', variant: 'destructive' }); return; }
    playSong(url, title, currentUser!, (data as ListenSession).id);
    await supabase.from('memories').insert({
      title: `Listened to "${title}" together`,
      icon: '🎵', created_by: currentUser!, type: 'listen',
      description: `${currentUser} & ${partner} listened together 💕`,
    });
    await supabase.from('listen_together').update({ saved_to_memory: true }).eq('id', (data as ListenSession).id);
    setUrlInput(''); setTitleInput('');
    toast({ title: 'Now playing! 🎵', description: title });
  };

  const handlePlayFromPlaylist = async (item: PlaylistItem) => {
    const { data } = await supabase.from('listen_together').insert({
      youtube_url: item.youtube_url, song_title: item.song_title, started_by: currentUser!,
    }).select().single();
    if (data) {
      playSong(item.youtube_url, item.song_title, currentUser!, (data as ListenSession).id);
      await supabase.from('memories').insert({
        title: `Listened to "${item.song_title}" together`,
        icon: '🎵', created_by: currentUser!, type: 'listen',
        description: `${currentUser} & ${partner} listened together 💕`,
      });
      await supabase.from('listen_together').update({ saved_to_memory: true }).eq('id', (data as ListenSession).id);
    }
  };

  const handleAddToPlaylist = async () => {
    const url = playlistUrl.trim();
    const title = playlistTitle.trim();
    if (!url || !title) return;
    if (!extractYouTubeId(url)) {
      toast({ title: 'Invalid URL', variant: 'destructive' }); return;
    }
    await supabase.from('couple_playlist').insert({
      youtube_url: url, song_title: title, added_by: currentUser!,
    });
    setPlaylistUrl(''); setPlaylistTitle(''); setShowAddPlaylist(false);
    toast({ title: 'Added to playlist! 🎶' });
  };

  const handleToggleFavorite = async (item: PlaylistItem) => {
    if (!item.is_favorite) {
      setSparkleId(item.id);
      setTimeout(() => setSparkleId(null), 800);
      spawnFloatingEmoji('⭐');
    }
    await supabase.from('couple_playlist').update({ is_favorite: !item.is_favorite }).eq('id', item.id);
  };

  const handleRemoveFromPlaylist = async (id: string) => {
    await supabase.from('couple_playlist').delete().eq('id', id);
  };

  const handleFeeling = async (emoji: string) => {
    if (!session) return;
    const field = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
    setMyFeeling(emoji);
    // Spawn floating emojis
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnFloatingEmoji(emoji), i * 150);
    }
    await supabase.from('listen_together').update({ [field]: emoji }).eq('id', session.id);
  };

  const youtubeId = session ? extractYouTubeId(session.youtube_url) : null;
  const partnerField = currentUser === 'Nani' ? 'ammu_feeling' : 'nani_feeling';
  const partnerFeeling = session ? (session[partnerField as keyof ListenSession] as string | null) : null;
  const feelingLabel = (emoji: string) => FEELINGS.find(f => f.emoji === emoji)?.label || '';
  const favorites = playlist.filter(p => p.is_favorite);

  // Mood lighting
  const moodThemes: Record<string, { bg: string; glow: string; particles: string[] }> = {
    '❤️': { bg: 'from-rose-500/8 via-pink-500/5 to-transparent', glow: 'shadow-[0_0_80px_rgba(244,63,94,0.15)]', particles: ['❤️', '💕', '✨'] },
    '🥰': { bg: 'from-pink-400/8 via-fuchsia-400/5 to-transparent', glow: 'shadow-[0_0_80px_rgba(232,121,249,0.15)]', particles: ['🥰', '💖', '✨'] },
    '😌': { bg: 'from-sky-400/8 via-cyan-300/5 to-transparent', glow: 'shadow-[0_0_80px_rgba(56,189,248,0.12)]', particles: ['😌', '🌿', '☁️'] },
    '😢': { bg: 'from-indigo-400/8 via-blue-300/5 to-transparent', glow: 'shadow-[0_0_80px_rgba(129,140,248,0.12)]', particles: ['😢', '💧', '🌙'] },
    '⭐': { bg: 'from-amber-400/8 via-yellow-300/5 to-transparent', glow: 'shadow-[0_0_80px_rgba(251,191,36,0.15)]', particles: ['⭐', '🌟', '✨'] },
  };
  const defaultMood = { bg: 'from-primary/5 via-accent/3 to-transparent', glow: '', particles: ['⭐', '❤️', '✨'] };
  const activeMood = myFeeling ? (moodThemes[myFeeling] || defaultMood) : defaultMood;

  const bgParticles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    icon: activeMood.particles[i % activeMood.particles.length],
    left: `${5 + (i * 8) % 90}%`,
    delay: `${(i * 1.3) % 6}s`,
    duration: `${4 + (i % 4) * 1.5}s`,
    size: i % 4 === 0 ? 'text-lg' : 'text-sm',
  }));

  const thumbnail = session ? getThumbnail(session.youtube_url) : null;

  return (
    <div className="space-y-5 animate-in fade-in relative pb-16">
      {/* Mood ambient */}
      <div className={`fixed inset-0 pointer-events-none z-0 bg-gradient-to-t ${activeMood.bg} transition-all duration-1000`} />
      <div className={`fixed inset-0 pointer-events-none z-0 ${activeMood.glow} transition-all duration-1000`} />
      {/* Background particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {bgParticles.map(p => (
          <span key={p.id} className={`absolute ${p.size} animate-float-particle opacity-20`}
            style={{ left: p.left, bottom: '-20px', animationDelay: p.delay, animationDuration: p.duration }}>
            {p.icon}
          </span>
        ))}
      </div>
      {/* Floating reaction emojis */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
        {floatingEmojis.map(fe => (
          <span key={fe.id} className="absolute text-3xl animate-reaction-float"
            style={{ left: `${fe.x}%`, bottom: '30%' }}>
            {fe.emoji}
          </span>
        ))}
      </div>

      {/* ─── Header ─── */}
      <Card className="border-none shadow-card overflow-hidden relative z-10">
        <div className="gradient-romantic p-5 relative overflow-hidden">
          <div className="absolute top-3 right-5 animate-float opacity-40"><Sparkles className="w-5 h-5 text-primary-foreground" /></div>
          <div className="absolute bottom-2 left-8 animate-float opacity-30" style={{ animationDelay: '1.5s' }}><Star className="w-4 h-4 text-star" fill="currentColor" /></div>
          <div className="absolute top-5 left-5 animate-float opacity-20" style={{ animationDelay: '0.8s' }}><Heart className="w-3 h-3 text-primary-foreground" fill="currentColor" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex -space-x-3">
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40"><AvatarImage src={avatarNani} /><AvatarFallback>N</AvatarFallback></Avatar>
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40"><AvatarImage src={avatarAmmu} /><AvatarFallback>A</AvatarFallback></Avatar>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-primary-foreground font-romantic flex items-center gap-2"><Headphones className="w-5 h-5" /> Listen Together</h2>
              <p className="text-primary-foreground/70 text-xs">Nani & Ammu 💕</p>
            </div>
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${partnerOnline ? 'bg-green-500/20 text-green-300' : 'bg-primary-foreground/10 text-primary-foreground/50'}`}>
              <span className={`w-2 h-2 rounded-full ${partnerOnline ? 'bg-green-400 animate-pulse' : 'bg-primary-foreground/30'}`} />
              {partner} {partnerOnline ? 'listening' : 'offline'}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 1. Play a Song ─── */}
      <Card className="shadow-card border-primary/20 relative z-10">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> Play a Song</p>
          <Input placeholder="Paste YouTube link here..." value={urlInput} onChange={e => setUrlInput(e.target.value)} className="text-sm" />
          {/* Preview thumbnail */}
          {urlInput && extractYouTubeId(urlInput) && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img src={`https://img.youtube.com/vi/${extractYouTubeId(urlInput)}/mqdefault.jpg`} alt="Preview" className="w-full h-auto" />
            </div>
          )}
          <Input placeholder="Song title (e.g. Perfect – Ed Sheeran)" value={titleInput} onChange={e => setTitleInput(e.target.value)} className="text-sm" />
          <Button variant="romantic" className="w-full" onClick={handleStartSong} disabled={!urlInput.trim() || !titleInput.trim()}>
            <Play className="w-4 h-4 mr-1" /> Start Listening Together
          </Button>
        </CardContent>
      </Card>

      {/* ─── Now Playing - Spotify Style ─── */}
      {youtubeId && session && (
        <Card className={`shadow-card border-primary/20 overflow-hidden relative z-10`}>
          {/* Album art / Thumbnail */}
          {thumbnail && (
            <div className="relative">
              <img src={thumbnail} alt={session.song_title} className="w-full aspect-video object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
              {/* Now Playing badge */}
              {isPlaying && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-sm">
                  <div className="flex gap-[2px] items-end h-3">
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '50%', animationDelay: '0s' }} />
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '100%', animationDelay: '0.15s' }} />
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0.3s' }} />
                  </div>
                  <span className="text-[10px] font-semibold text-primary-foreground uppercase tracking-wider">Playing</span>
                </div>
              )}
              {/* Song info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-lg font-bold text-foreground drop-shadow truncate">{session.song_title}</p>
                <p className="text-xs text-muted-foreground drop-shadow">Started by {session.started_by}</p>
              </div>
            </div>
          )}
          {/* Seek bar */}
          <div className="px-4 pt-3">
            <div
              className="h-1.5 bg-muted rounded-full cursor-pointer relative overflow-hidden"
              onClick={(e) => {
                if (duration <= 0) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * duration);
              }}
            >
              <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
              <span>{formatTimeDisplay(currentTime)}</span>
              <span>{formatTimeDisplay(duration)}</span>
            </div>
          </div>
          {/* Controls bar */}
          <div className="px-4 py-3 flex items-center justify-center gap-5">
            <button onClick={playPrev} disabled={globalPlaylist.length <= 1}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all active:scale-90">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </button>
            <button onClick={() => seekBackward(10)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90">
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-14 h-14 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 hover:scale-105 transition-all shadow-romantic"
            >
              {isPlaying
                ? <Pause className="w-6 h-6 text-primary-foreground" fill="currentColor" />
                : <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
              }
            </button>
            <button onClick={() => seekForward(10)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all active:scale-90">
              <FastForward className="w-4 h-4" />
            </button>
            <button onClick={playNext} disabled={globalPlaylist.length <= 1}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all active:scale-90">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </button>
          </div>
        </Card>
      )}

      {/* ─── 2. Feelings Reaction ─── */}
      {session && youtubeId && (
        <Card className="shadow-card border-primary/20 relative z-10">
          <CardContent className="p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground text-center">How do you feel about this song? 💕</p>
            <div className="flex justify-center gap-2">
              {FEELINGS.map(f => (
                <button key={f.emoji} onClick={() => handleFeeling(f.emoji)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl transition-all duration-300 ${
                    myFeeling === f.emoji
                      ? 'bg-primary/15 scale-115 shadow-romantic ring-2 ring-primary/20'
                      : 'hover:bg-muted hover:scale-110'
                  }`}>
                  <span className={`text-2xl transition-transform duration-300 ${myFeeling === f.emoji ? 'animate-celebrate' : ''}`}>{f.emoji}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{f.label}</span>
                </button>
              ))}
            </div>
            {(myFeeling || partnerFeeling) && (
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Partner Feelings</p>
                <div className="flex justify-center gap-6">
                  {['Nani', 'Ammu'].map(name => {
                    const feeling = name === currentUser ? myFeeling : partnerFeeling;
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <Avatar className="w-7 h-7"><AvatarImage src={name === 'Nani' ? avatarNani : avatarAmmu} /><AvatarFallback>{name[0]}</AvatarFallback></Avatar>
                        <span className="text-sm">{feeling ? `${feeling} ${feelingLabel(feeling)}` : <span className="text-muted-foreground text-xs">waiting...</span>}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── 3. Shared Couple Playlist ─── */}
      <Card className="shadow-card relative z-10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><ListMusic className="w-4 h-4 text-primary" /> Our Playlist ❤️</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAddPlaylist(v => !v)} className="text-xs h-7">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          {showAddPlaylist && (
            <div className="space-y-2 p-3 rounded-xl bg-muted/50 animate-in slide-in-from-top-2">
              <Input placeholder="YouTube link" value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} className="text-sm h-9" />
              {playlistUrl && extractYouTubeId(playlistUrl) && (
                <img src={`https://img.youtube.com/vi/${extractYouTubeId(playlistUrl)}/default.jpg`} alt="Thumb" className="w-20 h-auto rounded-md" />
              )}
              <Input placeholder="Song title" value={playlistTitle} onChange={e => setPlaylistTitle(e.target.value)} className="text-sm h-9" />
              <div className="flex gap-2">
                <Button variant="romantic" size="sm" className="flex-1" onClick={handleAddToPlaylist}><Plus className="w-3 h-3 mr-1" /> Add</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddPlaylist(false)}><X className="w-3 h-3" /></Button>
              </div>
            </div>
          )}

          {playlist.length === 0 ? (
            <p className="text-center text-muted-foreground text-xs py-4">No songs yet. Add your first song! 🎶</p>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-1.5">
                {playlist.map((item, i) => {
                  const isActive = session?.youtube_url === item.youtube_url;
                  const thumb = getThumbnail(item.youtube_url);
                  return (
                    <div key={item.id} className={`flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/10 shadow-sm' : 'hover:bg-muted'}`}>
                      {/* Thumbnail */}
                      {thumb && (
                        <img src={thumb.replace('mqdefault', 'default')} alt="" className="w-12 h-9 rounded-md object-cover shrink-0" />
                      )}
                      <button onClick={() => handlePlayFromPlaylist(item)} className="flex-1 min-w-0 text-left">
                        <p className={`text-sm truncate ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{item.song_title}</p>
                        <p className="text-[10px] text-muted-foreground">Added by {item.added_by}</p>
                      </button>
                      <button onClick={() => handleToggleFavorite(item)}
                        className={`text-lg transition-all duration-300 hover:scale-125 relative ${item.is_favorite ? 'drop-shadow-sm' : 'opacity-40'} ${sparkleId === item.id ? 'animate-celebrate' : ''}`}>
                        {item.is_favorite ? '⭐' : '☆'}
                      </button>
                      <button onClick={() => handleRemoveFromPlaylist(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* ─── 4. Favorite Songs ─── */}
      {favorites.length > 0 && (
        <Card className="shadow-card border-star/30 relative z-10">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">⭐ Our Favorite Songs</p>
            <div className="space-y-1.5">
              {favorites.map(f => {
                const thumb = getThumbnail(f.youtube_url);
                return (
                  <div key={f.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-star/5 hover:bg-star/10 transition-colors">
                    {thumb && <img src={thumb.replace('mqdefault', 'default')} alt="" className="w-10 h-7 rounded object-cover" />}
                    <span>⭐</span>
                    <p className="text-sm text-foreground truncate flex-1">{f.song_title}</p>
                    <button onClick={() => handlePlayFromPlaylist(f)} className="text-primary hover:text-primary/80 transition-colors">
                      <Play className="w-4 h-4" fill="currentColor" />
                    </button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 5. Music Memory Timeline ─── */}
      {musicMemories.length > 0 && (
        <Card className="shadow-card relative z-10">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> 🧠 Music Memories</p>
            <ScrollArea className="max-h-60">
              <div className="relative pl-4 border-l-2 border-primary/20 space-y-3">
                {musicMemories.map(m => {
                  const thumb = getThumbnail(m.youtube_url);
                  return (
                    <div key={m.id} className="relative flex gap-3 animate-in fade-in">
                      {/* Timeline dot */}
                      <div className="absolute -left-[1.3rem] top-2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
                      {thumb && <img src={thumb.replace('mqdefault', 'default')} alt="" className="w-12 h-9 rounded-md object-cover shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">🎵 {m.song_title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.nani_feeling && `Nani: ${m.nani_feeling} ${feelingLabel(m.nani_feeling)}`}
                          {m.nani_feeling && m.ammu_feeling && ' · '}
                          {m.ammu_feeling && `Ammu: ${m.ammu_feeling} ${feelingLabel(m.ammu_feeling)}`}
                          {!m.nani_feeling && !m.ammu_feeling && 'No reactions yet'}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!session && playlist.length === 0 && (
        <Card className="shadow-card border-dashed border-primary/30 relative z-10">
          <CardContent className="p-8 text-center">
            <Headphones className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
            <p className="font-romantic text-xl text-gradient-romantic mb-2">No song playing yet</p>
            <p className="text-muted-foreground text-sm">Paste a YouTube link to start listening together! 🎶</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListenTogether;
