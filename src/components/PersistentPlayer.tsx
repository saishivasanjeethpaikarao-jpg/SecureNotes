import { useEffect, useRef } from 'react';
import { useMusic } from '@/contexts/MusicContext';

/**
 * Uses the YouTube IFrame API for full playback control (seek, pause/resume, time tracking).
 * Rendered at root level so it never unmounts.
 */
const PersistentPlayer = () => {
  const { nowPlaying, isPlaying } = useMusic();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const currentVideoRef = useRef<string | null>(null);
  const timeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiLoadedRef = useRef(false);

  // Load YT IFrame API once
  useEffect(() => {
    if ((window as any).YT?.Player) {
      apiLoadedRef.current = true;
      return;
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {
      apiLoadedRef.current = true;
      // If a song is already waiting, create player
      if (nowPlaying) createPlayer(nowPlaying.youtube_id);
    };
  }, []);

  const startTimeUpdates = () => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p?.getCurrentTime && p?.getDuration) {
        const onUpdate = (window as any).__musicOnTimeUpdate;
        if (onUpdate) onUpdate(p.getCurrentTime(), p.getDuration());
      }
    }, 500);
  };

  const stopTimeUpdates = () => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  };

  const createPlayer = (videoId: string) => {
    if (!containerRef.current || !(window as any).YT?.Player) return;

    // Destroy existing
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
    }
    stopTimeUpdates();

    // Clear container and create a fresh div
    containerRef.current.innerHTML = '<div id="yt-persistent-player"></div>';

    playerRef.current = new (window as any).YT.Player('yt-persistent-player', {
      width: '1',
      height: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event: any) => {
          const setPlayer = (window as any).__musicSetPlayer;
          if (setPlayer) setPlayer(event.target);
          currentVideoRef.current = videoId;
          startTimeUpdates();
        },
        onStateChange: (event: any) => {
          const onState = (window as any).__musicOnStateChange;
          if (onState) onState(event.data);
          if (event.data === 1) startTimeUpdates();
          else if (event.data === 2 || event.data === 0) stopTimeUpdates();
        },
      },
    });
  };

  // When nowPlaying changes, load new video (or create player)
  useEffect(() => {
    if (!nowPlaying) return;
    const videoId = nowPlaying.youtube_id;

    if (!apiLoadedRef.current || !(window as any).YT?.Player) {
      // API not loaded yet; onYouTubeIframeAPIReady will handle it
      return;
    }

    if (playerRef.current?.loadVideoById && currentVideoRef.current !== videoId) {
      playerRef.current.loadVideoById(videoId);
      currentVideoRef.current = videoId;
      startTimeUpdates();
    } else if (!playerRef.current) {
      createPlayer(videoId);
    }
  }, [nowPlaying?.youtube_id]);

  // Sync play/pause state
  useEffect(() => {
    const p = playerRef.current;
    if (!p?.getPlayerState) return;
    try {
      const state = p.getPlayerState();
      if (isPlaying && state !== 1) { p.playVideo(); startTimeUpdates(); }
      else if (!isPlaying && state === 1) { p.pauseVideo(); stopTimeUpdates(); }
    } catch {}
  }, [isPlaying]);

  useEffect(() => () => stopTimeUpdates(), []);

  return (
    <div
      ref={containerRef}
      className="fixed -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default PersistentPlayer;
