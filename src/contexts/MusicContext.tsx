import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface NowPlaying {
  id: string;
  youtube_url: string;
  song_title: string;
  started_by: string;
  youtube_id: string;
}

interface MusicContextType {
  nowPlaying: NowPlaying | null;
  isPlaying: boolean;
  setIsPlaying: (v: boolean | ((p: boolean) => boolean)) => void;
  playSong: (url: string, title: string, startedBy: string, id?: string) => void;
  stopSong: () => void;
  showMiniPlayer: boolean;
  isFullPlayerOpen: boolean;
  setIsFullPlayerOpen: (v: boolean) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

export const MusicProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

  // Load last session on mount
  useEffect(() => {
    if (!currentUser) return;
    const loadLast = async () => {
      const { data } = await supabase
        .from('listen_together')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const s = data[0];
        const ytId = extractYouTubeId(s.youtube_url);
        if (ytId) {
          setNowPlaying({
            id: s.id,
            youtube_url: s.youtube_url,
            song_title: s.song_title,
            started_by: s.started_by,
            youtube_id: ytId,
          });
        }
      }
    };
    loadLast();
  }, [currentUser]);

  // Listen for new songs via realtime
  useEffect(() => {
    const channel = supabase
      .channel('music-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listen_together' }, (payload) => {
        const s = payload.new as any;
        const ytId = extractYouTubeId(s.youtube_url);
        if (ytId) {
          setNowPlaying({
            id: s.id,
            youtube_url: s.youtube_url,
            song_title: s.song_title,
            started_by: s.started_by,
            youtube_id: ytId,
          });
          setIsPlaying(true);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const playSong = useCallback((url: string, title: string, startedBy: string, id?: string) => {
    const ytId = extractYouTubeId(url);
    if (!ytId) return;
    setNowPlaying({ id: id || '', youtube_url: url, song_title: title, started_by: startedBy, youtube_id: ytId });
    setIsPlaying(true);
  }, []);

  const stopSong = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Media Session API
  useEffect(() => {
    if (!nowPlaying || !('mediaSession' in navigator)) return;
    const thumb = `https://img.youtube.com/vi/${nowPlaying.youtube_id}/mqdefault.jpg`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlaying.song_title,
      artist: `Started by ${nowPlaying.started_by}`,
      album: 'Couple Stars 💕',
      artwork: [
        { src: thumb, sizes: '320x180', type: 'image/jpeg' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
  }, [nowPlaying]);

  const showMiniPlayer = !!nowPlaying;

  return (
    <MusicContext.Provider value={{ nowPlaying, isPlaying, setIsPlaying, playSong, stopSong, showMiniPlayer, isFullPlayerOpen, setIsFullPlayerOpen }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
};
