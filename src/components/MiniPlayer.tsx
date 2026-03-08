import { useMusic } from '@/contexts/MusicContext';
import { Play, Pause, ChevronUp, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const MiniPlayer = ({ onOpenListen }: { onOpenListen: () => void }) => {
  const { nowPlaying, isPlaying, setIsPlaying, showMiniPlayer, currentTime, duration, playNext, playPrev, playlist, isSeeking, seekingValue, onSeekStart, onSeekEnd, onSeekChange } = useMusic();

  if (!showMiniPlayer || !nowPlaying) return null;

  const thumb = `https://img.youtube.com/vi/${nowPlaying.youtube_id}/mqdefault.jpg`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="shrink-0 z-40 border-t border-primary/10">
      <div className="max-w-lg mx-auto">
        <div className="bg-card/95 backdrop-blur-xl overflow-hidden">
          {/* Seek slider with dot */}
          <div className="px-2 pt-0.5">
            <Slider
              value={[isSeeking ? seekingValue : (duration > 0 ? currentTime : 0)]}
              max={duration > 0 ? duration : 100}
              step={0.5}
              onValueChange={([v]) => { if (!isSeeking) onSeekStart(v); else onSeekChange(v); }}
              onValueCommit={([v]) => onSeekEnd(v)}
              onPointerDown={() => onSeekStart(isSeeking ? seekingValue : currentTime)}
              className="w-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-primary [&_[role=slider]]:bg-primary [&_[data-orientation=horizontal]>.relative]:h-[3px]"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2">
            {/* Thumbnail */}
            <button onClick={onOpenListen} className="relative shrink-0">
              <img
                src={thumb}
                alt={nowPlaying.song_title}
                className="w-10 h-10 rounded-xl object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-[2px] items-end h-3.5">
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0s' }} />
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '100%', animationDelay: '0.15s' }} />
                    <span className="w-[2px] bg-primary-foreground rounded-full animate-bounce" style={{ height: '40%', animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
            </button>

            {/* Song info */}
            <button onClick={onOpenListen} className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-foreground truncate">{nowPlaying.song_title}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {duration > 0 ? `${formatTime(isSeeking ? seekingValue : currentTime)} / ${formatTime(duration)}` : nowPlaying.started_by}
              </p>
            </button>

            {/* Controls */}
            <button
              onClick={playPrev}
              disabled={playlist.length <= 1}
              className="w-7 h-7 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors active:scale-90"
            >
              <SkipBack className="w-3.5 h-3.5" fill="currentColor" />
            </button>

            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 active:scale-90 transition-all"
            >
              {isPlaying
                ? <Pause className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" />
                : <Play className="w-3.5 h-3.5 text-primary-foreground ml-0.5" fill="currentColor" />
              }
            </button>

            <button
              onClick={playNext}
              disabled={playlist.length <= 1}
              className="w-7 h-7 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors active:scale-90"
            >
              <SkipForward className="w-3.5 h-3.5" fill="currentColor" />
            </button>

            <button onClick={onOpenListen} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniPlayer;
