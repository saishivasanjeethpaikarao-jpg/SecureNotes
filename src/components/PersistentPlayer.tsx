import { useEffect, useRef, useCallback } from 'react';
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
  const apiReadyRef = useRef(false);
  const pendingVideoRef = useRef<string | null>(null);

  const startTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
    timeIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (p?.getCurrentTime && p?.getDuration) {
        const onUpdate = (window as any).__musicOnTimeUpdate;
        if (onUpdate) onUpdate(p.getCurrentTime(), p.getDuration());
      }
    }, 500);
  }, []);

  const stopTimeUpdates = useCallback(() => {
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
  }, []);

  const createPlayer = useCallback((videoId: string) => {
    if (!containerRef.current || !(window as any).YT?.Player) return;

    // Destroy existing
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }
    stopTimeUpdates();

    // Clear container and create a fresh div
    containerRef.current.innerHTML = '<div id="yt-persistent-player"></div>';

    playerRef.current = new (window as any).YT.Player('yt-persistent-player', {
      width: '320',
      height: '180',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          const setPlayer = (window as any).__musicSetPlayer;
          if (setPlayer) setPlayer(event.target);
          currentVideoRef.current = videoId;
          event.target.playVideo();
          startTimeUpdates();
        },
        onStateChange: (event: any) => {
          const onState = (window as any).__musicOnStateChange;
          if (onState) onState(event.data);
          if (event.data === 1) startTimeUpdates();
          else if (event.data === 2 || event.data === 0) stopTimeUpdates();
        },
        onError: (event: any) => {
          console.warn('YT Player error:', event.data);
        },
      },
    });
  }, [startTimeUpdates, stopTimeUpdates]);

  // Load YT IFrame API once
  useEffect(() => {
    if ((window as any).YT?.Player) {
      apiReadyRef.current = true;
      // If there's a pending video, create player now
      if (pendingVideoRef.current) {
        createPlayer(pendingVideoRef.current);
        pendingVideoRef.current = null;
      }
      return;
    }

    // Check if script already loading
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    (window as any).onYouTubeIframeAPIReady = () => {
      apiReadyRef.current = true;
      // Create player for any pending video
      if (pendingVideoRef.current) {
        createPlayer(pendingVideoRef.current);
        pendingVideoRef.current = null;
      }
    };
  }, [createPlayer]);

  // When nowPlaying changes, load new video (or queue it)
  useEffect(() => {
    if (!nowPlaying) return;
    const videoId = nowPlaying.youtube_id;

    if (!apiReadyRef.current) {
      // API not loaded yet; store pending
      pendingVideoRef.current = videoId;
      return;
    }

    if (playerRef.current?.loadVideoById && currentVideoRef.current !== videoId) {
      playerRef.current.loadVideoById(videoId);
      currentVideoRef.current = videoId;
      startTimeUpdates();
    } else if (!playerRef.current) {
      createPlayer(videoId);
    }
    // Same video — do nothing (no double play)
  }, [nowPlaying?.youtube_id, createPlayer, startTimeUpdates]);

  // Sync play/pause state
  useEffect(() => {
    const p = playerRef.current;
    if (!p?.getPlayerState) return;
    try {
      const state = p.getPlayerState();
      if (isPlaying && state !== 1 && state !== 3) {
        p.playVideo();
        startTimeUpdates();
      } else if (!isPlaying && state === 1) {
        p.pauseVideo();
        stopTimeUpdates();
      }
    } catch {}
  }, [isPlaying, startTimeUpdates, stopTimeUpdates]);

  useEffect(() => () => stopTimeUpdates(), [stopTimeUpdates]);

  return (
    <div
      ref={containerRef}
      className="fixed overflow-hidden pointer-events-none"
      style={{ width: '1px', height: '1px', opacity: 0.01, top: 0, left: 0 }}
      aria-hidden="true"
    />
  );
};

export default PersistentPlayer;
