import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, X } from 'lucide-react';
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

export default function CallHistory({ onClose }: { onClose: () => void }) {
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
  }, []);

  const getIcon = (call: CallRecord) => {
    const isOutgoing = call.caller === currentUser;
    if (call.status === 'missed' || call.status === 'rejected') {
      return <PhoneMissed className="w-4 h-4 text-destructive" />;
    }
    return isOutgoing
      ? <PhoneOutgoing className="w-4 h-4 text-primary" />
      : <PhoneIncoming className="w-4 h-4 text-green-500" />;
  };

  const getStatusLabel = (call: CallRecord) => {
    const isOutgoing = call.caller === currentUser;
    if (call.status === 'missed') return isOutgoing ? 'No answer' : 'Missed';
    if (call.status === 'rejected') return 'Declined';
    return formatDuration(call.duration_seconds);
  };

  const getPartner = (call: CallRecord) =>
    call.caller === currentUser ? call.receiver : call.caller;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <h2 className="text-base font-bold text-foreground">Call History</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No calls yet 📞</p>
        ) : (
          calls.map((call) => (
            <div key={call.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-muted/50 transition-colors">
              {/* Direction icon */}
              <div className="shrink-0 w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                {getIcon(call)}
              </div>

              {/* Info */}
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

              {/* Time */}
              <span className="text-[11px] text-muted-foreground shrink-0">
                {formatDate(call.created_at)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
