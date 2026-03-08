import { useEffect, useRef, useMemo } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallType } from '@/hooks/useWebRTC';

interface IncomingCallDialogProps {
  callerName: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

// Generate ringtone using Web Audio API
const createRingtone = () => {
  const ctx = new AudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.value = 440;
  osc2.type = 'sine';
  osc2.frequency.value = 480;

  gain.gain.value = 0.15;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  // Ring pattern: 1s on, 2s off
  const scheduleRing = (startTime: number) => {
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.setValueAtTime(0, startTime + 1);
    gain.gain.setValueAtTime(0.15, startTime + 3);
    gain.gain.setValueAtTime(0, startTime + 4);
    gain.gain.setValueAtTime(0.15, startTime + 6);
    gain.gain.setValueAtTime(0, startTime + 7);
    gain.gain.setValueAtTime(0.15, startTime + 9);
    gain.gain.setValueAtTime(0, startTime + 10);
  };

  return {
    start: () => {
      osc1.start();
      osc2.start();
      scheduleRing(ctx.currentTime);
    },
    stop: () => {
      try {
        gain.gain.cancelScheduledValues(0);
        gain.gain.value = 0;
        osc1.stop();
        osc2.stop();
        ctx.close();
      } catch {
        // already stopped
      }
    },
  };
};

const IncomingCallDialog = ({ callerName, callType, onAccept, onReject }: IncomingCallDialogProps) => {
  const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null);

  const stars = useMemo(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      dur: `${2 + Math.random() * 3}s`,
      delay: `${Math.random() * 3}s`,
    })),
  []);

  useEffect(() => {
    const ring = createRingtone();
    ringtoneRef.current = ring;
    ring.start();
    return () => ring.stop();
  }, []);

  const handleAccept = () => {
    ringtoneRef.current?.stop();
    onAccept();
  };

  const handleReject = () => {
    ringtoneRef.current?.stop();
    onReject();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center call-space-bg animate-in fade-in">
      {/* Star field */}
      <div className="star-field">
        {stars.map(s => (
          <span
            key={s.id}
            className="star-dot"
            style={{ top: s.top, left: s.left, animationDuration: s.dur, animationDelay: s.delay }}
          />
        ))}
      </div>

      <div className="call-glass rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-5 max-w-xs w-full mx-4">
        <div className="w-20 h-20 rounded-full bg-[rgba(59,130,246,0.15)] flex items-center justify-center animate-pulse-glow">
          {callType === 'video' ? (
            <Video className="w-10 h-10 text-[#93b4f8]" />
          ) : (
            <Phone className="w-10 h-10 text-[#93b4f8]" />
          )}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-white">{callerName}</p>
          <p className="text-sm text-[#93b4f8]/70">
            Incoming {callType === 'video' ? 'video' : 'audio'} call...
          </p>
        </div>

        <div className="flex gap-6">
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14 shadow-lg call-control-active border-0"
            onClick={handleReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            className="rounded-full h-14 w-14 shadow-lg bg-[rgba(34,197,94,0.2)] hover:bg-[rgba(34,197,94,0.35)] text-[#86efac] border-0 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)] transition-all"
            size="icon"
            onClick={handleAccept}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
