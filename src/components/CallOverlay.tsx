import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Monitor, Minimize2, Maximize2, Clock
} from 'lucide-react';
import type { CallStatus, CallType } from '@/hooks/useWebRTC';

interface CallOverlayProps {
  callStatus: CallStatus;
  callType: CallType;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  callDuration: number;
  isMinimized: boolean;
  partnerName: string;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onSetMinimized: (v: boolean) => void;
}

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const statusLabels: Record<string, string> = {
  calling: 'Calling...',
  ringing: 'Ringing...',
  connecting: 'Connecting...',
  connected: 'Connected',
  reconnecting: 'Reconnecting...',
  ended: 'Call Ended',
};

const CallOverlay = ({
  callStatus, callType, isMuted, isCameraOff, isScreenSharing,
  callDuration, isMinimized, partnerName,
  localVideoRef, remoteVideoRef,
  onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall, onSetMinimized,
}: CallOverlayProps) => {
  const [position, setPosition] = useState({ x: 16, y: 16 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMinimized) return;
    dragging.current = true;
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 160, e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 120, e.clientY - offset.current.y)),
    });
  };

  const handlePointerUp = () => { dragging.current = false; };

  if (callStatus === 'idle') return null;

  // Minimized floating pip
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/30 bg-card cursor-grab active:cursor-grabbing"
        style={{ left: position.x, top: position.y, width: 150, height: 110 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {callType === 'video' && callStatus === 'connected' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-muted/80">
            <Phone className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-xs text-muted-foreground mt-1">{formatDuration(callDuration)}</span>
          </div>
        )}
        <div className="absolute bottom-1 right-1 flex gap-1">
          <button onClick={() => onSetMinimized(false)} className="bg-card/80 backdrop-blur rounded-full p-1">
            <Maximize2 className="w-3 h-3 text-foreground" />
          </button>
          <button onClick={onEndCall} className="bg-destructive rounded-full p-1">
            <PhoneOff className="w-3 h-3 text-destructive-foreground" />
          </button>
        </div>
      </div>
    );
  }

  // Full call panel
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none md:items-start md:justify-end md:p-4">
      <div className="relative w-full max-w-sm md:max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              callStatus === 'connected' ? 'bg-green-500' :
              callStatus === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
              callStatus === 'ended' ? 'bg-destructive' :
              'bg-primary animate-pulse'
            }`} />
            <span className="text-xs font-medium text-muted-foreground">
              {statusLabels[callStatus] || callStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {callStatus === 'connected' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDuration(callDuration)}
              </span>
            )}
            <button onClick={() => onSetMinimized(true)} className="text-muted-foreground hover:text-foreground">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video area */}
        <div className="relative bg-foreground/5 flex-1 min-h-[200px] flex items-center justify-center">
          {callType === 'video' && callStatus === 'connected' ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover max-h-[50vh]" />
              {/* Local preview pip */}
              <div className="absolute top-3 right-3 w-24 h-32 md:w-28 md:h-36 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl font-bold text-primary">{partnerName[0]}</span>
              </div>
              <p className="text-foreground font-semibold">{partnerName}</p>
              <p className="text-sm text-muted-foreground">{statusLabels[callStatus]}</p>
              {callStatus === 'connected' && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDuration(callDuration)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 px-4 py-4 bg-card border-t border-border">
          <Button
            variant={isMuted ? 'destructive' : 'outline'}
            size="icon"
            className="rounded-full h-11 w-11"
            onClick={onToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {callType === 'video' && (
            <Button
              variant={isCameraOff ? 'destructive' : 'outline'}
              size="icon"
              className="rounded-full h-11 w-11"
              onClick={onToggleCamera}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}

          {callType === 'video' && (
            <Button
              variant={isScreenSharing ? 'secondary' : 'outline'}
              size="icon"
              className="rounded-full h-11 w-11"
              onClick={onToggleScreenShare}
            >
              <Monitor className="w-5 h-5" />
            </Button>
          )}

          <Button
            variant="destructive"
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={onEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;
