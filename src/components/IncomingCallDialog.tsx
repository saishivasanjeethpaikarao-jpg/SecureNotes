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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-card rounded-3xl shadow-2xl border border-border p-8 flex flex-col items-center gap-5 max-w-xs w-full mx-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          {callType === 'video' ? (
            <Video className="w-10 h-10 text-primary" />
          ) : (
            <Phone className="w-10 h-10 text-primary" />
          )}
        </div>
        
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{callerName}</p>
          <p className="text-sm text-muted-foreground">
            Incoming {callType === 'video' ? 'video' : 'audio'} call...
          </p>
        </div>

        <div className="flex gap-6">
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-14 w-14 shadow-lg"
            onClick={onReject}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
          <Button
            className="rounded-full h-14 w-14 shadow-lg bg-green-500 hover:bg-green-600 text-white"
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
