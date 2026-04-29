import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Image as ImageIcon, Trash2, Heart, X, Star, MessageCircle, Camera, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import PhotoLightbox from '@/components/PhotoLightbox';

interface Memory {
  id: string;
  created_at: string;
  created_at_date: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  icon: string;
  created_by: string;
  type: string;
}

type FilterType = 'all' | 'star' | 'photo' | 'message';

const ICON_OPTIONS = ['📸', '⭐', '🎂', '🎉', '💍', '✈️', '🎬', '🍽️', '🌹', '💌', '🏠', '🎁'];

const FILTERS: { id: FilterType; label: string; icon: typeof Star }[] = [
  { id: 'all', label: 'All', icon: Heart },
  { id: 'star', label: 'Stars', icon: Star },
  { id: 'photo', label: 'Photos', icon: Camera },
  { id: 'message', label: 'Messages', icon: MessageCircle },
];

const getTypeIcon = (type: string, icon: string) => {
  if (type === 'star') return '⭐';
  if (type === 'photo') return '📸';
  if (type === 'message') return '💌';
  if (type === 'celebration') return '🎉';
  return icon;
};

const MemoryTimeline = () => {
  const { currentUser } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [icon, setIcon] = useState('📸');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; caption: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMemories(data as Memory[]);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 8 * 1024 * 1024);
    if (valid.length < files.length) {
      toast({ title: 'Some photos skipped', description: 'Each photo must be an image under 8MB' });
    }
    setPhotoFiles(prev => [...prev, ...valid]);
    setPhotoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    // Reset so picking the same file again still triggers change
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!title.trim() || !currentUser) return;
    setSubmitting(true);

    const uploadedUrls: string[] = [];
    let memType = 'memory';

    for (const file of photoFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `memories/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('chat-media').upload(path, file);
      if (uploadErr) continue;
      const { data: signedData } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(path, 3153600000);
      if (signedData?.signedUrl) uploadedUrls.push(signedData.signedUrl);
    }
    if (uploadedUrls.length > 0) {
      memType = 'photo';
    }

    const { error } = await supabase.from('memories').insert({
      title: title.trim(),
      description: description.trim() || null,
      created_at_date: format(date, 'yyyy-MM-dd'),
      icon,
      image_url: uploadedUrls[0] ?? null,
      image_urls: uploadedUrls,
      created_by: currentUser,
      type: memType,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add memory', variant: 'destructive' });
    } else {
      toast({ title: 'Memory added! 💕', description: title.trim() });
      setTitle('');
      setDescription('');
      setDate(new Date());
      setIcon('📸');
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setShowForm(false);
      fetchMemories();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Filter and search memories
  const searchLower = search.toLowerCase();
  const filtered = memories.filter((m) => {
    const hasPhotos = (m.image_urls && m.image_urls.length > 0) || !!m.image_url;
    const matchesFilter =
      filter === 'all' ||
      (filter === 'star' && m.type === 'star') ||
      (filter === 'photo' && (m.type === 'photo' || hasPhotos)) ||
      (filter === 'message' && (m.type === 'message' || m.type === 'memory'));
    const matchesSearch =
      !search ||
      m.title.toLowerCase().includes(searchLower) ||
      (m.description && m.description.toLowerCase().includes(searchLower));
    return matchesFilter && matchesSearch;
  });

  // Group by month-year
  const grouped = filtered.reduce<Record<string, Memory[]>>((acc, m) => {
    const key = format(new Date(m.created_at), 'MMMM yyyy');
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-romantic flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" fill="currentColor" /> Our Memories
        </h2>
        <Button
          variant="romantic"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="rounded-full"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Memory'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              filter === f.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <f.icon className="w-3.5 h-3.5" />
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
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

      {/* Add Memory Form */}
      {showForm && (
        <Card className="border-primary/20 shadow-romantic animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="p-4 space-y-3">
            {/* Icon picker */}
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={cn(
                    'text-xl w-9 h-9 rounded-lg transition-all',
                    icon === ic
                      ? 'bg-primary/20 scale-110 ring-2 ring-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  {ic}
                </button>
              ))}
            </div>

            <Input
              placeholder="Memory title ✨"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-primary/20"
            />

            <Textarea
              placeholder="Describe this memory... 💭"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border-primary/20"
            />

            {/* Date picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start border-primary/20">
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Photo upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 shadow-sm"
                      type="button"
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
              <ImageIcon className="w-4 h-4 mr-2 text-primary" />
              {photoPreviews.length > 0 ? `Add more photos (${photoPreviews.length} selected)` : 'Add Photos (optional, multiple)'}
            </Button>

            <Button
              variant="romantic"
              className="w-full"
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
            >
              {submitting ? 'Saving...' : 'Save Memory 💕'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {filtered.length === 0 && !showForm && (
        <Card className="border-primary/10">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">📖</p>
            <p className="font-medium">
              {filter === 'all' ? 'No memories yet' : `No ${filter} memories found`}
            </p>
            <p className="text-sm">
              {filter === 'all'
                ? 'Start your love journal by adding your first memory!'
                : 'Try a different filter or add new memories.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {Object.entries(grouped).map(([monthYear, mems]) => (
        <div key={monthYear}>
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            {monthYear}
            <span className="h-px flex-1 bg-border" />
          </p>
          <div className="relative pl-7 border-l-2 border-primary/20 space-y-4">
            {mems.map((m, idx) => (
              <div
                key={m.id}
                className="relative group animate-in fade-in slide-in-from-left-3"
                style={{ animationDelay: `${idx * 60}ms`, animationFillMode: 'both' }}
              >
                {/* Timeline dot */}
                <span className="absolute -left-[calc(1.75rem+5px)] top-4 w-3.5 h-3.5 rounded-full bg-primary ring-[3px] ring-background shadow-sm" />

                <Card className={cn(
                  'border-primary/10 hover:shadow-romantic transition-all duration-300 overflow-hidden',
                  m.type === 'star' && 'border-l-4 border-l-[hsl(var(--star-gold))]'
                )}>
                  {(() => {
                    const imgs = (m.image_urls && m.image_urls.length > 0)
                      ? m.image_urls
                      : (m.image_url ? [m.image_url] : []);
                    if (imgs.length === 0) return null;
                    if (imgs.length === 1) {
                      return (
                        <button
                          type="button"
                          onClick={() => setLightbox({ images: imgs, index: 0, caption: m.title })}
                          className="block w-full bg-muted"
                        >
                          <img
                            src={imgs[0]}
                            alt={m.title}
                            className="w-full max-h-80 object-contain bg-black/5"
                            loading="lazy"
                          />
                        </button>
                      );
                    }
                    // Multi-photo grid (up to 4 visible, +N overlay)
                    const visible = imgs.slice(0, 4);
                    return (
                      <div className={cn(
                        'grid gap-0.5',
                        visible.length === 2 && 'grid-cols-2',
                        visible.length >= 3 && 'grid-cols-2',
                      )}>
                        {visible.map((src, i) => {
                          const isLast = i === visible.length - 1 && imgs.length > visible.length;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setLightbox({ images: imgs, index: i, caption: m.title })}
                              className="relative aspect-square overflow-hidden bg-muted"
                            >
                              <img
                                src={src}
                                alt={`${m.title} ${i + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {isLast && (
                                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                                  <span className="text-white text-2xl font-bold">+{imgs.length - visible.length}</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  <CardContent className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold flex items-center gap-2 text-foreground">
                          <span className="text-lg flex-shrink-0">{getTypeIcon(m.type, m.icon)}</span>
                          <span className="truncate">{m.title}</span>
                        </p>
                        {m.description && (
                          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                            {m.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className={cn(
                            'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
                            m.type === 'star'
                              ? 'bg-[hsl(var(--star-gold))]/15 text-[hsl(var(--star-gold))]'
                              : m.type === 'photo'
                              ? 'bg-accent/15 text-accent'
                              : 'bg-primary/10 text-primary'
                          )}>
                            {m.type === 'star' ? '⭐ Star' : m.type === 'photo' ? '📸 Photo' : m.type === 'celebration' ? '🎉 Celebration' : '💌 Memory'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(m.created_at), 'MMM d, yyyy · h:mm a')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          by {m.created_by} {m.created_by === 'Nani' ? '💙' : '💗'}
                        </p>
                      </div>
                      {m.created_by === currentUser && m.type !== 'star' && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}

      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
};

export default MemoryTimeline;
