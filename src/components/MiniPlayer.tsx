import { useMusic } from '@/contexts/MusicContext';
import { Play, Pause, ChevronUp, X } from 'lucide-react';

const MiniPlayer = ({ onOpenListen }: { onOpenListen: () => void }) => {
  const { nowPlaying, isPlaying, setIsPlaying, stopSong, showMiniPlayer } = useMusic();

  if (!showMiniPlayer || !nowPlaying) return null;

  const thumb = `https://img.youtube.com/vi/${nowPlaying.youtube_id}/mqdefault.jpg`;

  return (
    <div className="fixed bottom-[56px] left-0 right-0 z-40">
      <div className="max-w-lg mx-auto">
        <div className="mx-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/20 shadow-romantic overflow-hidden">
          {/* Progress bar mock */}
          {isPlaying && (
            <div className="h-0.5 bg-muted overflow-hidden">
              <div className="h-full bg-primary animate-pulse w-full" />
            </div>
          )}
          <div className="flex items-center gap-3 p-2.5">
            {/* Thumbnail */}
            <button onClick={onOpenListen} className="relative shrink-0">
              <img
                src={thumb}
                alt={nowPlaying.song_title}
                className="w-11 h-11 rounded-xl object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-[2px] items-end h-4">
                    <span className="w-[3px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0s' }} />
                    <span className="w-[3px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '100%', animationDelay: '0.15s' }} />
                    <span className="w-[3px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '40%', animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
            </button>

            {/* Song info */}
            <button onClick={onOpenListen} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.song_title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{nowPlaying.started_by} · Couple Stars</p>
            </button>

            {/* Controls */}
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 transition-colors"
            >
              {isPlaying
                ? <Pause className="w-4 h-4 text-primary-foreground" fill="currentColor" />
                : <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
              }
            </button>

            <button onClick={onOpenListen} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
