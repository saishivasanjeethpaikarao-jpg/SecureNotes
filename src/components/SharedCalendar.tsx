import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Heart, Gift, Star, Cake, CalendarDays } from 'lucide-react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
  created_by: string;
  created_at: string;
}

const EVENT_TYPES = [
  { id: 'date', label: '💕 Date', icon: Heart },
  { id: 'birthday', label: '🎂 Birthday', icon: Cake },
  { id: 'anniversary', label: '💍 Anniversary', icon: Star },
  { id: 'gift', label: '🎁 Gift', icon: Gift },
  { id: 'event', label: '📅 Event', icon: CalendarDays },
];

const SharedCalendar = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('event');
  const [saving, setSaving] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true });
    if (data) setEvents(data as CalendarEvent[]);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleAdd = async () => {
    if (!title || !currentUser) return;
    setSaving(true);
    const { error } = await supabase.from('calendar_events').insert({
      title,
      description: description || null,
      event_date: format(selectedDate, 'yyyy-MM-dd'),
      event_type: eventType,
      created_by: currentUser,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add event'); return; }
    toast.success('📅 Event added!');
    setTitle(''); setDescription(''); setEventType('event'); setShowAdd(false);
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id);
    toast.success('Event removed');
    fetchEvents();
  };

  const selectedDayEvents = events.filter(e => isSameDay(new Date(e.event_date), selectedDate));
  
  const eventDates = events.map(e => new Date(e.event_date));

  const getTypeEmoji = (type: string) => {
    const t = EVENT_TYPES.find(et => et.id === type);
    return t ? t.label.split(' ')[0] : '📅';
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-romantic text-foreground">Shared Calendar 📅</h2>

      {/* Calendar */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => d && setSelectedDate(d)}
          className={cn("p-3 pointer-events-auto")}
          modifiers={{ hasEvent: eventDates }}
          modifiersClassNames={{ hasEvent: 'bg-primary/15 font-bold text-primary' }}
        />
      </div>

      {/* Selected Day */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {format(selectedDate, 'EEEE, MMMM d')}
        </h3>
        <Button variant="romantic" size="sm" className="rounded-xl" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>

      {/* Add Event Form */}
      {showAdd && (
        <div className="bg-card rounded-2xl p-4 border border-border/50 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-200">
          <Input placeholder="Event title..." value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl" />
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setEventType(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  eventType === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Button variant="romantic" className="w-full rounded-xl" onClick={handleAdd} disabled={saving || !title}>
            {saving ? 'Adding...' : '✨ Add Event'}
          </Button>
        </div>
      )}

      {/* Events List */}
      {selectedDayEvents.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 border border-border/50 text-center">
          <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nothing planned for this day</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedDayEvents.map(event => (
            <div key={event.id} className="bg-card rounded-2xl p-4 border border-border/50 flex items-center gap-3">
              <span className="text-2xl">{getTypeEmoji(event.event_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{event.title}</p>
                {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                <p className="text-[10px] text-muted-foreground/60">Added by {event.created_by}</p>
              </div>
              <button onClick={() => handleDelete(event.id)} className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Events */}
      {events.filter(e => new Date(e.event_date) >= new Date()).length > 0 && (
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Upcoming</p>
          <div className="space-y-2">
            {events
              .filter(e => new Date(e.event_date) >= new Date())
              .slice(0, 5)
              .map(event => (
                <button
                  key={event.id}
                  onClick={() => setSelectedDate(new Date(event.event_date))}
                  className="w-full bg-card rounded-2xl p-3 border border-border/50 flex items-center gap-3 text-left hover:shadow-sm active:scale-[0.98] transition-all"
                >
                  <span className="text-lg">{getTypeEmoji(event.event_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedCalendar;
