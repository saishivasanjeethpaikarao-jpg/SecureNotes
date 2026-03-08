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
import { CalendarIcon, Plus, Image, Trash2, Heart, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Memory {
  id: string;
  created_at: string;
  memory_date: string;
  title: string;
  message: string | null;
  photo_url: string | null;
  icon: string;
  added_by: string;
}

const ICON_OPTIONS = ['📸', '⭐', '🎂', '🎉', '💍', '✈️', '🎬', '🍽️', '🌹', '💌', '🏠', '🎁'];

const MemoryTimeline = () => {
  const { currentUser } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [icon, setIcon] = useState('📸');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMemories();
  }, []);

  const fetchMemories = async () => {
    const { data } = await supabase
      .from('memories')
      .select('*')
      .order('memory_date', { ascending: false });
    if (data) setMemories(data);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !currentUser) return;
    setSubmitting(true);

    let photo_url: string | null = null;

    if (photoFile) {
      const ext = photoFile.name.split('.').pop();
      const path = `memories/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-media')
        .upload(path, photoFile);
      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('memories').insert({
      title: title.trim(),
      message: message.trim() || null,
      memory_date: format(date, 'yyyy-MM-dd'),
      icon,
      photo_url,
      added_by: currentUser,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to add memory', variant: 'destructive' });
    } else {
      toast({ title: 'Memory added! 💕', description: title.trim() });
      setTitle('');
      setMessage('');
      setDate(new Date());
      setIcon('📸');
      setPhotoFile(null);
      setPhotoPreview(null);
      setShowForm(false);
      fetchMemories();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('memories').delete().eq('id', id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  // Group memories by year-month
  const grouped = memories.reduce<Record<string, Memory[]>>((acc, m) => {
    const key = format(new Date(m.memory_date), 'MMMM yyyy');
    (acc[key] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
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
          {showForm ? 'Cancel' : 'Add'}
        </Button>
      </div>

      {/* Add Memory Form */}
      {showForm && (
        <Card className="border-primary/20 shadow-romantic animate-in fade-in slide-in-from-top-2">
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
              placeholder="Write about this memory... 💭"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
              className="hidden"
              onChange={handlePhotoSelect}
            />
            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl" />
                <button
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed border-primary/30"
                onClick={() => fileRef.current?.click()}
              >
                <Image className="w-4 h-4 mr-2 text-primary" /> Add Photo
              </Button>
            )}

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

      {/* Timeline */}
      {memories.length === 0 && !showForm && (
        <Card className="border-primary/10">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-4xl mb-2">📖</p>
            <p className="font-medium">No memories yet</p>
            <p className="text-sm">Start your love journal by adding your first memory!</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(grouped).map(([monthYear, mems]) => (
        <div key={monthYear}>
          <p className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {monthYear}
          </p>
          <div className="relative pl-6 border-l-2 border-primary/20 space-y-4">
            {mems.map((m) => (
              <div key={m.id} className="relative group">
                {/* Timeline dot */}
                <span className="absolute -left-[calc(1.5rem+5px)] top-3 w-3 h-3 rounded-full bg-primary ring-2 ring-background" />

                <Card className="border-primary/10 hover:shadow-romantic transition-shadow overflow-hidden">
                  {m.photo_url && (
                    <img
                      src={m.photo_url}
                      alt={m.title}
                      className="w-full h-40 object-cover"
                      loading="lazy"
                    />
                  )}
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-1.5">
                          <span className="text-lg">{m.icon}</span> {m.title}
                        </p>
                        {m.message && (
                          <p className="text-sm text-muted-foreground mt-1">{m.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(m.memory_date), 'MMM d, yyyy')} · by {m.added_by}
                        </p>
                      </div>
                      {m.added_by === currentUser && (
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
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
    </div>
  );
};

export default MemoryTimeline;
