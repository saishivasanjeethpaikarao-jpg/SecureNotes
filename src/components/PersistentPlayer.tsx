import { useMusic } from '@/contexts/MusicContext';

/**
 * Hidden persistent YouTube iframe that keeps playing across tab changes.
 * Rendered at the root level so it never unmounts.
 */
const PersistentPlayer = () => {
  const { nowPlaying, isPlaying } = useMusic();

  if (!nowPlaying) return null;

  return (
    <div className="fixed -top-[9999px] -left-[9999px] w-1 h-1 overflow-hidden" aria-hidden="true">
      <iframe
        key={nowPlaying.youtube_id}
        src={`https://www.youtube.com/embed/${nowPlaying.youtube_id}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        title={nowPlaying.song_title}
        width="1"
        height="1"
      />
    </div>
  );
};

export default PersistentPlayer;
