import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Music, Headphones, Play, Pause, Sparkles, Star, Heart, Plus, ListMusic, X, Trash2 } from 'lucide-react';
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

const ListenTogether = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const [session, setSession] = useState<ListenSession | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [musicMemories, setMusicMemories] = useState<ListenSession[]>([]);
  const [myFeeling, setMyFeeling] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showAddPlaylist, setShowAddPlaylist] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistTitle, setPlaylistTitle] = useState('');

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

    // Auto-save memory
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
      await supabase.from('memories').insert({
        title: `Listened to "${item.song_title}" together`,
        icon: '🎵', created_by: currentUser!, type: 'listen',
        description: `${currentUser} & ${partner} listened together 💕`,
      });
      await supabase.from('listen_together').update({ saved_to_memory: true }).eq('id', (data as ListenSession).id);
    }
    setIsPlaying(true);
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
    await supabase.from('couple_playlist').update({ is_favorite: !item.is_favorite }).eq('id', item.id);
  };

  const handleRemoveFromPlaylist = async (id: string) => {
    await supabase.from('couple_playlist').delete().eq('id', id);
  };

  const handleFeeling = async (emoji: string) => {
    if (!session) return;
    const field = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
    setMyFeeling(emoji);
    await supabase.from('listen_together').update({ [field]: emoji }).eq('id', session.id);
  };

  const youtubeId = session ? extractYouTubeId(session.youtube_url) : null;
  const partnerField = currentUser === 'Nani' ? 'ammu_feeling' : 'nani_feeling';
  const partnerFeeling = session ? (session[partnerField as keyof ListenSession] as string | null) : null;
  const feelingLabel = (emoji: string) => FEELINGS.find(f => f.emoji === emoji)?.label || '';
  const favorites = playlist.filter(p => p.is_favorite);

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    icon: i % 3 === 0 ? '⭐' : i % 3 === 1 ? '❤️' : '✨',
    left: `${5 + (i * 8) % 90}%`,
    delay: `${(i * 1.3) % 6}s`,
    duration: `${4 + (i % 4) * 1.5}s`,
    size: i % 4 === 0 ? 'text-lg' : 'text-sm',
  }));

  return (
    <div className="space-y-5 animate-in fade-in relative">
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map(p => (
          <span
            key={p.id}
            className={`absolute ${p.size} animate-float-particle opacity-20`}
            style={{
              left: p.left,
              bottom: '-20px',
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          >
            {p.icon}
          </span>
        ))}
      </div>
      {/* ─── Header ─── */}
      <Card className="border-none shadow-card overflow-hidden">
        <div className="gradient-romantic p-5 relative overflow-hidden">
          <div className="absolute top-3 right-5 animate-float opacity-40"><Sparkles className="w-5 h-5 text-primary-foreground" /></div>
          <div className="absolute bottom-2 left-8 animate-float opacity-30" style={{ animationDelay: '1.5s' }}><Star className="w-4 h-4 text-star" fill="currentColor" /></div>
          <div className="absolute top-5 left-5 animate-float opacity-20" style={{ animationDelay: '0.8s' }}><Heart className="w-3 h-3 text-primary-foreground" fill="currentColor" /></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex -space-x-3">
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40"><AvatarImage src={avatarNani} /><AvatarFallback>N</AvatarFallback></Avatar>
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40"><AvatarImage src={avatarAmmu} /><AvatarFallback>A</AvatarFallback></Avatar>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground font-romantic flex items-center gap-2"><Headphones className="w-5 h-5" /> Listen Together</h2>
              <p className="text-primary-foreground/70 text-xs">Nani & Ammu 💕</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── 1. Listen Together Player ─── */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> Play a Song</p>
          <Input placeholder="Paste YouTube link here..." value={urlInput} onChange={e => setUrlInput(e.target.value)} className="text-sm" />
          <Input placeholder="Song title (e.g. Perfect – Ed Sheeran)" value={titleInput} onChange={e => setTitleInput(e.target.value)} className="text-sm" />
          <Button variant="romantic" className="w-full" onClick={handleStartSong} disabled={!urlInput.trim() || !titleInput.trim()}>
            <Play className="w-4 h-4 mr-1" /> Start Listening Together
          </Button>
        </CardContent>
      </Card>

      {/* Now Playing */}
      {youtubeId && session && (
        <Card className="shadow-card border-primary/20 overflow-hidden">
          <div className="p-3 bg-primary/5 border-b border-border flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Now Playing</p>
              <p className="text-sm font-bold text-foreground truncate mt-0.5">🎵 {session.song_title}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setIsPlaying(p => !p)}>
              {isPlaying ? <Pause className="w-4 h-4 text-primary" /> : <Play className="w-4 h-4 text-primary" fill="currentColor" />}
            </Button>
          </div>
          <div className="aspect-video">
            <iframe
              key={youtubeId + (isPlaying ? '-p' : '-s')}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}`}
              className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={session.song_title}
            />
          </div>
        </Card>
      )}

      {/* ─── 2. Feelings Reaction ─── */}
      {session && youtubeId && (
        <Card className="shadow-card border-primary/20">
          <CardContent className="p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground text-center">How do you feel about this song? 💕</p>
            <div className="flex justify-center gap-3">
              {FEELINGS.map(f => (
                <button key={f.emoji} onClick={() => handleFeeling(f.emoji)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${myFeeling === f.emoji ? 'bg-primary/15 scale-110 shadow-romantic' : 'hover:bg-muted hover:scale-105'}`}>
                  <span className="text-2xl">{f.emoji}</span>
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
      <Card className="shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><ListMusic className="w-4 h-4 text-primary" /> Our Playlist ❤️</p>
            <Button variant="ghost" size="sm" onClick={() => setShowAddPlaylist(v => !v)} className="text-xs h-7">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>

          {showAddPlaylist && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/50 animate-in slide-in-from-top-2">
              <Input placeholder="YouTube link" value={playlistUrl} onChange={e => setPlaylistUrl(e.target.value)} className="text-sm h-9" />
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
            <ScrollArea className="max-h-52">
              <div className="space-y-1">
                {playlist.map((item, i) => {
                  const isActive = session?.youtube_url === item.youtube_url;
                  return (
                    <div key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-primary/10' : 'hover:bg-muted'}`}>
                      <span className="text-xs text-muted-foreground font-medium w-5">{i + 1}.</span>
                      <button onClick={() => handlePlayFromPlaylist(item)} className="flex-1 min-w-0 text-left">
                        <p className={`text-sm truncate ${isActive ? 'text-primary font-semibold' : 'text-foreground'}`}>{item.song_title}</p>
                        <p className="text-[10px] text-muted-foreground">Added by {item.added_by}</p>
                      </button>
                      <button onClick={() => handleToggleFavorite(item)} className={`text-lg transition-transform hover:scale-125 ${item.is_favorite ? 'drop-shadow-sm' : 'opacity-40'}`}>
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
        <Card className="shadow-card border-star/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">⭐ Our Favorite Songs</p>
            <div className="space-y-1">
              {favorites.map(f => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-star/5">
                  <span>⭐</span>
                  <p className="text-sm text-foreground truncate flex-1">{f.song_title}</p>
                  <button onClick={() => handlePlayFromPlaylist(f)} className="text-primary hover:text-primary/80">
                    <Play className="w-4 h-4" fill="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── 5. Music Memory Timeline ─── */}
      {musicMemories.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> 🧠 Music Memories</p>
            <ScrollArea className="max-h-52">
              <div className="space-y-2">
                {musicMemories.map(m => (
                  <div key={m.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-muted/40">
                    <span className="text-lg mt-0.5">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.song_title}</p>
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
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!session && playlist.length === 0 && (
        <Card className="shadow-card border-dashed border-primary/30">
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
