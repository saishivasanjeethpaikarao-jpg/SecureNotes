import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CallType } from '@/hooks/useWebRTC';

interface IncomingCallDialogProps {
  callerName: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallDialog = ({ callerName, callType, onAccept, onReject }: IncomingCallDialogProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center call-space-bg animate-in fade-in">
      {/* Star field */}
      <div className="star-field">
        {Array.from({ length: 25 }).map((_, i) => (
          <span
            key={i}
            className="star-dot"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
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
            onClick={onReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            className="rounded-full h-14 w-14 shadow-lg bg-[rgba(34,197,94,0.2)] hover:bg-[rgba(34,197,94,0.35)] text-[#86efac] border-0 hover:shadow-[0_0_16px_rgba(34,197,94,0.3)] transition-all"
            size="icon"
            onClick={onAccept}
          >
            <Phone className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
