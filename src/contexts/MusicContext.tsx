import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  currentTime: number;
  duration: number;
  seekTo: (seconds: number) => void;
  seekForward: (seconds?: number) => void;
  seekBackward: (seconds?: number) => void;
  playNext: () => void;
  playPrev: () => void;
  playlist: NowPlaying[];
  isSeeking: boolean;
  seekingValue: number;
  onSeekStart: (value: number) => void;
  onSeekEnd: (value: number) => void;
  onSeekChange: (value: number) => void;
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<NowPlaying[]>([]);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekingValue, setSeekingValue] = useState(0);
  const isSeekingRef = useRef(false);

  // YouTube player ref (set by PersistentPlayer)
  const playerRef = useRef<any>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Realtime sync (Supabase Broadcast) — mirrors play/pause/seek/song between phones
  const syncChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const lastBroadcastRef = useRef(0);

  const broadcast = useCallback((event: 'play' | 'pause' | 'seek' | 'change', payload: any) => {
    if (isRemoteUpdateRef.current) return; // don't echo back
    const ch = syncChannelRef.current;
    if (!ch) return;
    lastBroadcastRef.current = Date.now();
    ch.send({ type: 'broadcast', event, payload: { ...payload, by: currentUser, ts: Date.now() } });
  }, [currentUser]);

  // Expose playerRef setter for PersistentPlayer
  const setPlayerRef = useCallback((player: any) => {
    playerRef.current = player;
  }, []);

  // Attach to window for PersistentPlayer to access
  useEffect(() => {
    (window as any).__musicSetPlayer = setPlayerRef;
    (window as any).__musicOnTimeUpdate = (time: number, dur: number) => {
      if (!isSeekingRef.current) {
        setCurrentTime(time);
      }
      setDuration(dur);
    };
    (window as any).__musicOnStateChange = (state: number) => {
      // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
      if (state === 1) {
        setIsPlaying(true);
        const p = playerRef.current;
        if (p?.getCurrentTime) broadcast('play', { time: p.getCurrentTime() });
      } else if (state === 2) {
        setIsPlaying(false);
        const p = playerRef.current;
        if (p?.getCurrentTime) broadcast('pause', { time: p.getCurrentTime() });
      } else if (state === 0) {
        // Song ended — play next
        setIsPlaying(false);
        playNextInternal();
      }
    };
    return () => {
      delete (window as any).__musicSetPlayer;
      delete (window as any).__musicOnTimeUpdate;
      delete (window as any).__musicOnStateChange;
    };
  }, [broadcast]);

  // Set up Realtime broadcast channel — both phones share `music-sync-couple`
  useEffect(() => {
    if (!currentUser) return;
    const ch = supabase.channel('music-sync-couple', {
      config: { broadcast: { self: false } },
    });
    syncChannelRef.current = ch;

    const applyRemote = (fn: () => void) => {
      isRemoteUpdateRef.current = true;
      try { fn(); } finally {
        setTimeout(() => { isRemoteUpdateRef.current = false; }, 300);
      }
    };

    ch.on('broadcast', { event: 'play' }, ({ payload }) => {
      applyRemote(() => {
        const p = playerRef.current;
        // Drift correction: account for network latency
        const target = (payload?.time ?? 0) + (Date.now() - (payload?.ts ?? Date.now())) / 1000;
        if (p?.seekTo) p.seekTo(target, true);
        if (p?.playVideo) p.playVideo();
        setIsPlaying(true);
      });
    });

    ch.on('broadcast', { event: 'pause' }, ({ payload }) => {
      applyRemote(() => {
        const p = playerRef.current;
        if (p?.seekTo && payload?.time != null) p.seekTo(payload.time, true);
        if (p?.pauseVideo) p.pauseVideo();
        setIsPlaying(false);
      });
    });

    ch.on('broadcast', { event: 'seek' }, ({ payload }) => {
      applyRemote(() => {
        const p = playerRef.current;
        if (p?.seekTo && payload?.time != null) p.seekTo(payload.time, true);
        setCurrentTime(payload?.time ?? 0);
      });
    });

    ch.on('broadcast', { event: 'change' }, ({ payload }) => {
      applyRemote(() => {
        if (payload?.song) {
          setNowPlaying(payload.song);
          setIsPlaying(true);
          setCurrentTime(0);
        }
      });
    });

    ch.subscribe();
    return () => { supabase.removeChannel(ch); syncChannelRef.current = null; };
  }, [currentUser]);

  // Load playlist from listen_together history
  useEffect(() => {
    if (!currentUser) return;
    const loadPlaylist = async () => {
      const { data } = await supabase
        .from('listen_together')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        const items: NowPlaying[] = data
          .map((s: any) => {
            const ytId = extractYouTubeId(s.youtube_url);
            return ytId ? { id: s.id, youtube_url: s.youtube_url, song_title: s.song_title, started_by: s.started_by, youtube_id: ytId } : null;
          })
          .filter(Boolean) as NowPlaying[];
        setPlaylist(items);
        // Set nowPlaying to most recent if none
        if (items.length > 0 && !nowPlaying) {
          setNowPlaying(items[0]);
        }
      }
    };
    loadPlaylist();
  }, [currentUser]);

  // Listen for new songs via realtime
  useEffect(() => {
    const channel = supabase
      .channel('music-global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listen_together' }, (payload) => {
        const s = payload.new as any;
        const ytId = extractYouTubeId(s.youtube_url);
        if (ytId) {
          const newItem: NowPlaying = { id: s.id, youtube_url: s.youtube_url, song_title: s.song_title, started_by: s.started_by, youtube_id: ytId };
          setNowPlaying(newItem);
          setIsPlaying(true);
          setPlaylist(prev => [newItem, ...prev.filter(p => p.youtube_id !== ytId)]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Sync play/pause to YT player
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !player.getPlayerState) return;
    try {
      const state = player.getPlayerState();
      if (isPlaying && state !== 1) player.playVideo();
      else if (!isPlaying && state === 1) player.pauseVideo();
    } catch { /* player not ready */ }
  }, [isPlaying]);

  const playSong = useCallback((url: string, title: string, startedBy: string, id?: string) => {
    const ytId = extractYouTubeId(url);
    if (!ytId) return;
    const newItem: NowPlaying = { id: id || '', youtube_url: url, song_title: title, started_by: startedBy, youtube_id: ytId };
    setNowPlaying(newItem);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    broadcast('change', { song: newItem });
  }, [broadcast]);

  const stopSong = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const player = playerRef.current;
    if (player?.seekTo) {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
      broadcast('seek', { time: seconds });
    }
  }, [broadcast]);

  const onSeekStart = useCallback((value: number) => {
    isSeekingRef.current = true;
    setIsSeeking(true);
    setSeekingValue(value);
  }, []);

  const onSeekChange = useCallback((value: number) => {
    setSeekingValue(value);
  }, []);

  const onSeekEnd = useCallback((value: number) => {
    isSeekingRef.current = false;
    setIsSeeking(false);
    seekTo(value);
  }, [seekTo]);

  const seekForward = useCallback((seconds = 10) => {
    const player = playerRef.current;
    if (player?.getCurrentTime && player?.seekTo) {
      const t = player.getCurrentTime() + seconds;
      player.seekTo(t, true);
      setCurrentTime(t);
    }
  }, []);

  const seekBackward = useCallback((seconds = 10) => {
    const player = playerRef.current;
    if (player?.getCurrentTime && player?.seekTo) {
      const t = Math.max(0, player.getCurrentTime() - seconds);
      player.seekTo(t, true);
      setCurrentTime(t);
    }
  }, []);

  const getCurrentIndex = useCallback(() => {
    if (!nowPlaying || playlist.length === 0) return -1;
    return playlist.findIndex(p => p.youtube_id === nowPlaying.youtube_id);
  }, [nowPlaying, playlist]);

  const playNextInternal = useCallback(() => {
    const idx = getCurrentIndex();
    if (idx < 0 || playlist.length <= 1) return;
    const nextIdx = (idx + 1) % playlist.length;
    const next = playlist[nextIdx];
    setNowPlaying(next);
    setIsPlaying(true);
    setCurrentTime(0);
  }, [getCurrentIndex, playlist]);

  // Expose via window for the onStateChange callback
  useEffect(() => {
    (window as any).__musicPlayNext = playNextInternal;
    return () => { delete (window as any).__musicPlayNext; };
  }, [playNextInternal]);

  const playNext = useCallback(() => { playNextInternal(); }, [playNextInternal]);

  const playPrev = useCallback(() => {
    const idx = getCurrentIndex();
    if (idx < 0 || playlist.length <= 1) return;
    const prevIdx = (idx - 1 + playlist.length) % playlist.length;
    const prev = playlist[prevIdx];
    setNowPlaying(prev);
    setIsPlaying(true);
    setCurrentTime(0);
  }, [getCurrentIndex, playlist]);

  // Media Session API
  useEffect(() => {
    if (!nowPlaying || !('mediaSession' in navigator)) return;
    const thumb = `https://img.youtube.com/vi/${nowPlaying.youtube_id}/mqdefault.jpg`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlaying.song_title,
      artist: `Started by ${nowPlaying.started_by}`,
      album: 'Couple Stars 💕',
      artwork: [{ src: thumb, sizes: '320x180', type: 'image/jpeg' }],
    });
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
    navigator.mediaSession.setActionHandler('previoustrack', playPrev);
  }, [nowPlaying, playNext, playPrev]);

  const showMiniPlayer = !!nowPlaying;

  return (
    <MusicContext.Provider value={{
      nowPlaying, isPlaying, setIsPlaying, playSong, stopSong, showMiniPlayer,
      isFullPlayerOpen, setIsFullPlayerOpen,
      currentTime, duration, seekTo, seekForward, seekBackward,
      playNext, playPrev, playlist,
      isSeeking, seekingValue, onSeekStart, onSeekEnd, onSeekChange,
    }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error('useMusic must be used within MusicProvider');
  return ctx;
};
