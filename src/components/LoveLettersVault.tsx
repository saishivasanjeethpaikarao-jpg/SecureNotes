import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Lock, Unlock, Plus, CalendarIcon, ArrowLeft, Trash2, Heart } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Letter {
  id: string;
  sender: string;
  receiver: string;
  title: string;
  content: string;
  unlock_date: string;
  created_at: string;
}

const LoveLettersVault = () => {
  const { currentUser } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [showWrite, setShowWrite] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<Letter | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState<Date>();
  const [saving, setSaving] = useState(false);

  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const today = startOfDay(new Date());

  const fetchLetters = async () => {
    const { data } = await supabase
      .from('love_letters')
      .select('*')
      .order('unlock_date', { ascending: true });
    if (data) setLetters(data as Letter[]);
  };

  useEffect(() => { fetchLetters(); }, []);

  const isUnlocked = (letter: Letter) => {
    return !isBefore(today, startOfDay(new Date(letter.unlock_date)));
  };

  const handleSave = async () => {
    if (!title || !content || !unlockDate || !currentUser) return;
    setSaving(true);
    const { error } = await supabase.from('love_letters').insert({
      sender: currentUser,
      receiver: partner,
      title,
      content,
      unlock_date: format(unlockDate, 'yyyy-MM-dd'),
    });
    setSaving(false);
    if (error) { toast.error('Failed to save letter'); return; }
    toast.success('💌 Letter sealed! It will unlock on ' + format(unlockDate, 'MMM d, yyyy'));
    setTitle(''); setContent(''); setUnlockDate(undefined); setShowWrite(false);
    fetchLetters();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('love_letters').delete().eq('id', id);
    toast.success('Letter deleted');
    setViewingLetter(null);
    fetchLetters();
  };

  if (viewingLetter) {
    const unlocked = isUnlocked(viewingLetter);
    return (
      <div className="space-y-4">
        <button onClick={() => setViewingLetter(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {unlocked ? <Unlock className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-muted-foreground" />}
              <h2 className="text-lg font-bold font-romantic text-foreground">{viewingLetter.title}</h2>
            </div>
            {viewingLetter.sender === currentUser && (
              <button onClick={() => handleDelete(viewingLetter.id)} className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            From {viewingLetter.sender} · {unlocked ? 'Unlocked' : `Unlocks ${format(new Date(viewingLetter.unlock_date), 'MMM d, yyyy')}`}
          </p>
          {unlocked ? (
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{viewingLetter.content}</p>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <Lock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">This letter is sealed until</p>
              <p className="text-lg font-bold font-romantic text-foreground mt-1">{format(new Date(viewingLetter.unlock_date), 'MMMM d, yyyy')}</p>
              <p className="text-xs text-muted-foreground/60 mt-2">Be patient... good things come to those who wait 💕</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showWrite) {
    return (
      <div className="space-y-4">
        <button onClick={() => setShowWrite(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm space-y-4">
          <h2 className="text-lg font-bold font-romantic text-foreground">Write a Love Letter 💌</h2>
          <p className="text-xs text-muted-foreground">To: {partner}</p>
          <Input placeholder="Letter title..." value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
          <Textarea placeholder="Write your heart out..." value={content} onChange={e => setContent(e.target.value)} className="rounded-xl min-h-[150px] resize-none" />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Unlock Date</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl", !unlockDate && "text-muted-foreground")}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {unlockDate ? format(unlockDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={unlockDate}
                  onSelect={setUnlockDate}
                  disabled={(date) => isBefore(date, today)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="romantic" className="w-full rounded-xl" onClick={handleSave} disabled={saving || !title || !content || !unlockDate}>
            {saving ? 'Sealing...' : '💌 Seal & Send'}
          </Button>
        </div>
      </div>
    );
  }

  const myLetters = letters.filter(l => l.sender === currentUser);
  const receivedLetters = letters.filter(l => l.receiver === currentUser);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-romantic text-foreground">Love Letters Vault 💌</h2>
        <Button variant="romantic" size="sm" className="rounded-xl" onClick={() => setShowWrite(true)}>
          <Plus className="w-4 h-4 mr-1" /> Write
        </Button>
      </div>

      {/* Received Letters */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">Letters for you</p>
        {receivedLetters.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <Heart className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No letters yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {receivedLetters.map(letter => (
              <button
                key={letter.id}
                onClick={() => setViewingLetter(letter)}
                className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.98] transition-all"
              >
                {isUnlocked(letter) ? (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Unlock className="w-5 h-5 text-primary" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{letter.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {isUnlocked(letter) ? '✨ Tap to read' : `Unlocks ${format(new Date(letter.unlock_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sent Letters */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">Letters you sent</p>
        {myLetters.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">You haven't written any letters yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myLetters.map(letter => (
              <button
                key={letter.id}
                onClick={() => setViewingLetter(letter)}
                className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-lg">✉️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{letter.title}</p>
                  <p className="text-xs text-muted-foreground">
                    To {letter.receiver} · {isUnlocked(letter) ? 'Opened' : `Unlocks ${format(new Date(letter.unlock_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoveLettersVault;
