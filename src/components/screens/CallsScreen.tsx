import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface CallRecord {
  id: string;
  caller: string;
  receiver: string;
  call_type: string;
  status: string;
  duration_seconds: number;
  created_at: string;
  ended_at: string | null;
}

const formatDuration = (s: number) => {
  if (s === 0) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
};

export default function CallsScreen() {
  const { currentUser } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      const { data } = await supabase
        .from('call_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setCalls(data as CallRecord[]);
      setLoading(false);
    };
    fetchCalls();

    const channel = supabase
      .channel('calls-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_history' }, () => fetchCalls())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getIcon = (call: CallRecord) => {
    const isOutgoing = call.caller === currentUser;
    if (call.status === 'missed' || call.status === 'rejected') {
      return <PhoneMissed className="w-5 h-5 text-destructive" />;
    }
    return isOutgoing
      ? <PhoneOutgoing className="w-5 h-5 text-primary" />
      : <PhoneIncoming className="w-5 h-5 text-green-500" />;
  };

  const getStatusLabel = (call: CallRecord) => {
    const isOutgoing = call.caller === currentUser;
    if (call.status === 'missed') return isOutgoing ? 'No answer' : 'Missed';
    if (call.status === 'rejected') return 'Declined';
    return formatDuration(call.duration_seconds);
  };

  const getPartner = (call: CallRecord) =>
    call.caller === currentUser ? call.receiver : call.caller;

  // Group calls by date
  const grouped = calls.reduce<Record<string, CallRecord[]>>((acc, call) => {
    const d = new Date(call.created_at);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
    (acc[key] ??= []).push(call);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold font-romantic text-foreground flex items-center gap-2">
        <Phone className="w-5 h-5 text-primary" /> Call History
      </h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📞</p>
          <p className="text-muted-foreground font-medium">No calls yet</p>
          <p className="text-sm text-muted-foreground">Start a call from the chat screen!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, dateCalls]) => (
          <div key={dateLabel}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">{dateLabel}</p>
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden divide-y divide-border/30">
              {dateCalls.map((call) => (
                <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors active:bg-muted/50">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    {getIcon(call)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground truncate">{getPartner(call)}</span>
                      {call.call_type === 'video' ? (
                        <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs ${call.status === 'missed' || call.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {getStatusLabel(call)}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {format(new Date(call.created_at), 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
