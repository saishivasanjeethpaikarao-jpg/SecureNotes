import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface PhotoLightboxProps {
  images: string[];
  startIndex?: number;
  caption?: string;
  onClose: () => void;
}

const PhotoLightbox = ({ images, startIndex = 0, caption, onClose }: PhotoLightboxProps) => {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => { setIndex(startIndex); setZoom(1); }, [startIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);

  if (images.length === 0) return null;

  const next = () => { setIndex(i => (i + 1) % images.length); setZoom(1); };
  const prev = () => { setIndex(i => (i - 1 + images.length) % images.length); setZoom(1); };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center animate-in fade-in duration-200"
      onTouchStart={(e) => {
        if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          (e.currentTarget as any)._pinchStart = dist;
          (e.currentTarget as any)._zoomStart = zoom;
        }
      }}
      onTouchMove={(e) => {
        if (e.touches.length === 2 && (e.currentTarget as any)._pinchStart) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          const scale = dist / (e.currentTarget as any)._pinchStart;
          setZoom(Math.min(Math.max((e.currentTarget as any)._zoomStart * scale, 0.5), 5));
        }
      }}
      onTouchEnd={(e) => {
        if (e.touches.length < 2) (e.currentTarget as any)._pinchStart = null;
      }}
    >
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent safe-area-top">
        <span className="text-white/80 text-sm font-medium">{index + 1} / {images.length}</span>
        <div className="flex gap-2">
          <a
            href={images[index]}
            download
            onClick={(e) => e.stopPropagation()}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/30 transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/30 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div
        className="w-screen h-screen flex items-center justify-center overflow-hidden"
        onClick={() => { if (zoom <= 1) onClose(); }}
      >
        <img
          src={images[index]}
          alt={caption || `Photo ${index + 1}`}
          className="max-w-full max-h-full object-contain transition-transform duration-150 select-none"
          style={{ transform: `scale(${zoom})` }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => { e.stopPropagation(); setZoom(z => z > 1 ? 1 : 2.5); }}
          draggable={false}
        />
      </div>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/30 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {caption && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 py-4 bg-gradient-to-t from-black/70 to-transparent safe-area-bottom">
          <p className="text-white/90 text-sm text-center">{caption}</p>
        </div>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-16 left-0 right-0 z-10 px-4 overflow-x-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
          <div className="flex gap-2 justify-center">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setZoom(1); }}
                className={`shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${i === index ? 'border-white' : 'border-white/20 opacity-60'}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoLightbox;