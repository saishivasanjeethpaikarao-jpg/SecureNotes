import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Music, Headphones, Play, Sparkles, Star, Heart } from 'lucide-react';
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
  const [history, setHistory] = useState<ListenSession[]>([]);
  const [myFeeling, setMyFeeling] = useState<string | null>(null);

  // Fetch latest session + history
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('listen_together')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        const sessions = data as ListenSession[];
        setSession(sessions[0]);
        setHistory(sessions.slice(1));
        // Restore my feeling
        const feelingField = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
        setMyFeeling(sessions[0][feelingField as keyof ListenSession] as string | null);
      }
    };
    fetch();
  }, [currentUser]);

  // Realtime for session updates
  useEffect(() => {
    const channel = supabase
      .channel('listen-together-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listen_together' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newSession = payload.new as ListenSession;
          setSession(newSession);
          setMyFeeling(null);
          setHistory(prev => (session ? [session, ...prev] : prev));
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as ListenSession;
          setSession(prev => prev?.id === updated.id ? updated : prev);
          if (session?.id === updated.id) {
            const feelingField = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
            setMyFeeling(updated[feelingField as keyof ListenSession] as string | null);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, session]);

  const handleStartSong = async () => {
    const url = urlInput.trim();
    const title = titleInput.trim();
    if (!url || !title) return;
    if (!extractYouTubeId(url)) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid YouTube link', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.from('listen_together').insert({
      youtube_url: url,
      song_title: title,
      started_by: currentUser!,
    }).select().single();

    if (error) {
      toast({ title: 'Error', description: 'Could not start song', variant: 'destructive' });
      return;
    }
    setSession(data as ListenSession);
    setMyFeeling(null);
    setUrlInput('');
    setTitleInput('');

    // Auto-save to memory
    await supabase.from('memories').insert({
      title: `Listened to "${title}" together`,
      icon: '🎵',
      created_by: currentUser!,
      type: 'listen',
      description: `${currentUser} & ${partner} listened together 💕`,
    });
    await supabase.from('listen_together').update({ saved_to_memory: true }).eq('id', (data as ListenSession).id);
  };

  const handleFeeling = async (emoji: string) => {
    if (!session) return;
    const feelingField = currentUser === 'Nani' ? 'nani_feeling' : 'ammu_feeling';
    setMyFeeling(emoji);
    await supabase
      .from('listen_together')
      .update({ [feelingField]: emoji })
      .eq('id', session.id);
  };

  const youtubeId = session ? extractYouTubeId(session.youtube_url) : null;
  const partnerFeelingField = currentUser === 'Nani' ? 'ammu_feeling' : 'nani_feeling';
  const partnerFeeling = session ? (session[partnerFeelingField as keyof ListenSession] as string | null) : null;
  const feelingLabel = (emoji: string) => FEELINGS.find(f => f.emoji === emoji)?.label || '';

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Header */}
      <Card className="border-none shadow-card overflow-hidden">
        <div className="gradient-romantic p-5 relative overflow-hidden">
          <div className="absolute top-3 right-5 animate-float opacity-40">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="absolute bottom-2 left-8 animate-float opacity-30" style={{ animationDelay: '1.5s' }}>
            <Star className="w-4 h-4 text-star" fill="currentColor" />
          </div>
          <div className="absolute top-4 left-4 animate-float opacity-20" style={{ animationDelay: '0.8s' }}>
            <Heart className="w-3 h-3 text-primary-foreground" fill="currentColor" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="flex -space-x-3">
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40">
                <AvatarImage src={avatarNani} alt="Nani" />
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <Avatar className="w-10 h-10 border-2 border-primary-foreground/40">
                <AvatarImage src={avatarAmmu} alt="Ammu" />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary-foreground font-romantic flex items-center gap-2">
                <Headphones className="w-5 h-5" /> Listen Together
              </h2>
              <p className="text-primary-foreground/70 text-xs">Nani & Ammu 💕</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Add Song */}
      <Card className="shadow-card border-primary/20">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" /> Play a Song
          </p>
          <Input
            placeholder="Paste YouTube link here..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            className="text-sm"
          />
          <Input
            placeholder="Song title (e.g. Perfect – Ed Sheeran)"
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            className="text-sm"
          />
          <Button
            variant="romantic"
            className="w-full"
            onClick={handleStartSong}
            disabled={!urlInput.trim() || !titleInput.trim()}
          >
            <Play className="w-4 h-4 mr-1" /> Start Listening Together
          </Button>
        </CardContent>
      </Card>

      {/* Now Playing */}
      {youtubeId && session && (
        <>
          <Card className="shadow-card border-primary/20 overflow-hidden">
            <div className="p-3 bg-primary/5 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Now Playing</p>
              <p className="text-sm font-bold text-foreground truncate mt-0.5">🎵 {session.song_title}</p>
            </div>
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={session.song_title}
              />
            </div>
          </Card>

          {/* Feelings */}
          <Card className="shadow-card border-primary/20">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground text-center">
                How do you feel about this song? 💕
              </p>
              <div className="flex justify-center gap-3">
                {FEELINGS.map(f => (
                  <button
                    key={f.emoji}
                    onClick={() => handleFeeling(f.emoji)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      myFeeling === f.emoji
                        ? 'bg-primary/15 scale-110 shadow-romantic'
                        : 'hover:bg-muted hover:scale-105'
                    }`}
                  >
                    <span className="text-2xl">{f.emoji}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{f.label}</span>
                  </button>
                ))}
              </div>

              {/* Partner feelings */}
              {(myFeeling || partnerFeeling) && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
                    Partner Feelings
                  </p>
                  <div className="flex justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={avatarNani} alt="Nani" />
                        <AvatarFallback>N</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {(currentUser === 'Nani' ? myFeeling : partnerFeeling)
                          ? `${currentUser === 'Nani' ? myFeeling : partnerFeeling} ${feelingLabel((currentUser === 'Nani' ? myFeeling : partnerFeeling)!)}`
                          : <span className="text-muted-foreground text-xs">waiting...</span>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={avatarAmmu} alt="Ammu" />
                        <AvatarFallback>A</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {(currentUser === 'Ammu' ? myFeeling : partnerFeeling)
                          ? `${currentUser === 'Ammu' ? myFeeling : partnerFeeling} ${feelingLabel((currentUser === 'Ammu' ? myFeeling : partnerFeeling)!)}`
                          : <span className="text-muted-foreground text-xs">waiting...</span>
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* History */}
      {history.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Music className="w-4 h-4 text-primary" /> Recently Listened
            </p>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                    <span className="text-lg">🎵</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{h.song_title}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.nani_feeling && `Nani: ${h.nani_feeling}`}
                        {h.nani_feeling && h.ammu_feeling && ' · '}
                        {h.ammu_feeling && `Ammu: ${h.ammu_feeling}`}
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
      {!session && (
        <Card className="shadow-card border-dashed border-primary/30">
          <CardContent className="p-8 text-center">
            <Headphones className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" />
            <p className="font-romantic text-xl text-gradient-romantic mb-2">No song playing yet</p>
            <p className="text-muted-foreground text-sm">
              Paste a YouTube link above to start listening together! 🎶
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ListenTogether;
