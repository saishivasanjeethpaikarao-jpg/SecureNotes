import { useCallback, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, RotateCw, Crop as CropIcon, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoEditorProps {
  file: File;
  open: boolean;
  onCancel: () => void;
  onSave: (edited: File, previewUrl: string) => void;
}

const ASPECTS: { label: string; value: number | undefined }[] = [
  { label: 'Free', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
];

async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number,
  fileName: string,
  mime: string,
): Promise<{ file: File; url: string }> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bBoxW = image.width * cos + image.height * sin;
  const bBoxH = image.width * sin + image.height * cos;

  // Rotated full-image canvas
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = bBoxW;
  rotCanvas.height = bBoxH;
  const rctx = rotCanvas.getContext('2d')!;
  rctx.translate(bBoxW / 2, bBoxH / 2);
  rctx.rotate(rad);
  rctx.drawImage(image, -image.width / 2, -image.height / 2);

  // Crop from rotated canvas
  const out = document.createElement('canvas');
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  const ctx = out.getContext('2d')!;
  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  const outMime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob: Blob = await new Promise((resolve) =>
    out.toBlob((b) => resolve(b!), outMime, 0.92),
  );
  const url = URL.createObjectURL(blob);
  const ext = outMime === 'image/png' ? 'png' : 'jpg';
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'photo';
  const file = new File([blob], `${baseName}-edited.${ext}`, { type: outMime });
  return { file, url };
}

const PhotoEditor = ({ file, open, onCancel, onSave }: PhotoEditorProps) => {
  const [imageSrc] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, p: Area) => setPixels(p), []);

  const handleSave = async () => {
    if (!pixels) return;
    setSaving(true);
    try {
      const { file: f, url } = await getCroppedFile(
        imageSrc,
        pixels,
        rotation,
        file.name,
        file.type,
      );
      onSave(f, url);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CropIcon className="w-4 h-4 text-primary" /> Edit photo
          </DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[55vh] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
            restrictPosition={false}
          />
        </div>

        <div className="p-4 space-y-3 bg-background">
          {/* Aspect */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setAspect(a.value)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap',
                  aspect === a.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 text-muted-foreground border-border',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Zoom */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Zoom</p>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={(v) => setZoom(v[0])}
            />
          </div>

          {/* Rotate */}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
            >
              <RotateCcw className="w-4 h-4 mr-1" /> 90°
            </Button>
            <span className="text-xs text-muted-foreground">{rotation}°</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="w-4 h-4 mr-1" /> 90°
            </Button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button
              type="button"
              variant="romantic"
              className="flex-1"
              onClick={handleSave}
              disabled={saving || !pixels}
            >
              <Check className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Apply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoEditor;