import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Image as ImageIcon, Upload, Trash2, X, Tag, Search, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import PhotoLightbox from '@/components/PhotoLightbox';
import PhotoFrame, { FramePicker, FrameId } from '@/components/PhotoFrame';

interface GalleryItem {
  id: string;
  created_at: string;
  created_by: string;
  title: string | null;
  tag: string | null;
  image_url: string;
  frame?: string | null;
}

const Gallery = () => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTag, setActiveTag] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [frame, setFrame] = useState<FrameId>('none');

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as GalleryItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel('realtime-gallery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const valid = selected.filter(f => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024);
    if (valid.length < selected.length) {
      toast({ title: 'Some photos skipped', description: 'Each photo must be an image under 8MB' });
    }
    setFiles(prev => [...prev, ...valid]);
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePreview = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (!currentUser || files.length === 0) return;
    setSubmitting(true);
    let successCount = 0;
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('chat-media').upload(path, file);
      if (uploadErr) continue;
      const { data: signedData } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(path, 3153600000);
      if (!signedData?.signedUrl) continue;
      const { error: insertErr } = await supabase.from('gallery').insert({
        created_by: currentUser,
        title: title.trim() || null,
        tag: tag.trim() || null,
        image_url: signedData.signedUrl,
        frame: frame === 'none' ? null : frame,
      });
      if (!insertErr) successCount++;
    }
    if (successCount > 0) {
      toast({ title: `Uploaded ${successCount} photo${successCount > 1 ? 's' : ''} 🎉` });
      previews.forEach(url => URL.revokeObjectURL(url));
      setFiles([]);
      setPreviews([]);
      setTitle('');
      setTag('');
      setFrame('none');
      setShowForm(false);
      fetchItems();
    } else {
      toast({ title: 'Upload failed', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    await supabase.from('gallery').delete().eq('id', id);
    setItems(prev => prev.filter(p => p.id !== id));
  };

  const updateItemFrame = async (id: string, newFrame: FrameId) => {
    await supabase.from('gallery').update({ frame: newFrame === 'none' ? null : newFrame }).eq('id', id);
    setItems(prev => prev.map(p => p.id === id ? { ...p, frame: newFrame === 'none' ? null : newFrame } : p));
    toast({ title: 'Frame updated ✨' });
  };

  const tags = Array.from(new Set(items.map(i => i.tag).filter(Boolean))) as string[];
  const searchLower = search.toLowerCase();
  const filtered = items.filter(i => {
    const matchesTag = activeTag === 'all' || i.tag === activeTag;
    const matchesSearch = !search ||
      (i.title && i.title.toLowerCase().includes(searchLower)) ||
      (i.tag && i.tag.toLowerCase().includes(searchLower));
    return matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-romantic flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" /> Gallery
        </h2>
        <Button
          variant="romantic"
          size="sm"
          onClick={() => setShowForm(v => !v)}
          className="rounded-full"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Photos'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search photos by title or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 border-primary/20 bg-muted/30"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tag filters */}
      {tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveTag('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              activeTag === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            All ({items.length})
          </button>
          {tags.map(t => {
            const count = items.filter(i => i.tag === t).length;
            return (
              <button
                key={t}
                onClick={() => setActiveTag(t)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                  activeTag === t
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <Tag className="w-3 h-3" /> {t} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Upload form */}
      {showForm && (
        <Card className="border-primary/20 shadow-romantic animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleSelect}
            />

            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePreview(i)}
                      type="button"
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full border-dashed border-primary/30"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <Upload className="w-4 h-4 mr-2 text-primary" />
              {previews.length > 0 ? `Add more photos (${previews.length} selected)` : 'Choose photos (multiple)'}
            </Button>

            <Input
              placeholder="Title / heading (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-primary/20"
            />

            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tag (e.g. trip, birthday, dates)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="pl-9 border-primary/20"
              />
            </div>

            {/* Frame picker */}
            <FramePicker value={frame} onChange={setFrame} />

            <Button
              variant="romantic"
              className="w-full"
              onClick={handleUpload}
              disabled={submitting || files.length === 0}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <>Save {files.length > 0 ? `${files.length} ` : ''}Photo{files.length !== 1 ? 's' : ''} 💕</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading / empty */}
      {loading && (
        <div className="text-center py-10 text-muted-foreground">
          <Loader2 className="w-6 h-6 mx-auto animate-spin opacity-60" />
        </div>
      )}

      {!loading && filtered.length === 0 && !showForm && (
        <Card className="border-primary/10">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">📷</p>
            <p className="font-medium">
              {items.length === 0 ? 'No photos yet' : 'No photos match your search'}
            </p>
            <p className="text-sm">
              {items.length === 0
                ? 'Tap "Add Photos" to start your shared album!'
                : 'Try a different tag or search.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              className="relative aspect-square bg-muted/40 group animate-in fade-in zoom-in-95 rounded-lg"
              style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
            >
              <button
                type="button"
                onClick={() => setLightbox({ images: filtered.map(f => f.image_url), index: idx })}
                className="block w-full h-full"
              >
                <PhotoFrame frame={item.frame} className="w-full h-full">
                  <img
                    src={item.image_url}
                    alt={item.title || 'Gallery photo'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </PhotoFrame>
              </button>

              {/* Title/tag overlay */}
              {(item.title || item.tag) && (
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
                  {item.title && (
                    <p className="text-white text-[10px] font-medium leading-tight truncate">{item.title}</p>
                  )}
                  {item.tag && (
                    <p className="text-white/80 text-[9px] truncate">#{item.tag}</p>
                  )}
                </div>
              )}

              {/* Owner controls */}
              {item.created_by === currentUser && (
                <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      const cur = (item.frame || 'none');
                      const ids: FrameId[] = ['none','soft-love','dreamy-glow','kawaii','festival','vintage','polaroid','film-strip','luxury','neon','nature','dark-mood'];
                      const next = ids[(ids.indexOf(cur as FrameId) + 1) % ids.length];
                      updateItemFrame(item.id, next);
                    }}
                    className="bg-primary/90 text-primary-foreground rounded-full p-1 shadow-sm"
                    title="Cycle frame style"
                  >
                    🖼️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="bg-destructive/90 text-destructive-foreground rounded-full p-1 shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};

export default Gallery;