import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Monitor, MonitorOff, Minimize2, Maximize2, Clock, MessageCircle, Send, X
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
  onSendMessage?: (msg: string) => void;
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
  onSendMessage,
}: CallOverlayProps) => {
  const [showChat, setShowChat] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 80 });
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

  const handleSendChat = () => {
    if (!chatMsg.trim()) return;
    onSendMessage?.(chatMsg.trim());
    setChatMsg('');
  };

  if (callStatus === 'idle') return null;

  // Minimized floating call card
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl border border-border bg-card cursor-grab active:cursor-grabbing animate-slide-down-scale"
        style={{ left: position.x, top: position.y, width: 200 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Video / Avatar preview */}
        <div className="relative w-full h-28 bg-muted">
          {callType === 'video' && callStatus === 'connected' ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 w-12 h-16 rounded-lg overflow-hidden border border-primary/30 shadow bg-muted">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{partnerName[0]}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">{partnerName}</span>
            </div>
          )}
          {/* Duration badge */}
          {callStatus === 'connected' && (
            <div className="absolute top-1.5 left-1.5 bg-background/70 backdrop-blur rounded-full px-2 py-0.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-mono text-foreground">{formatDuration(callDuration)}</span>
            </div>
          )}
          {callStatus !== 'connected' && (
            <div className="absolute top-1.5 left-1.5 bg-background/70 backdrop-blur rounded-full px-2 py-0.5">
              <span className="text-[10px] text-muted-foreground">{statusLabels[callStatus]}</span>
            </div>
          )}
        </div>

        {/* Inline controls */}
        <div className="flex items-center justify-between px-3 py-2 bg-card">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
              className={`p-1.5 rounded-full transition-colors ${isMuted ? 'bg-destructive/15 text-destructive' : 'bg-muted text-foreground'}`}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            {callType === 'video' && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleCamera(); }}
                className={`p-1.5 rounded-full transition-colors ${isCameraOff ? 'bg-destructive/15 text-destructive' : 'bg-muted text-foreground'}`}
              >
                {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEndCall(); }}
              className="p-1.5 rounded-full bg-destructive text-destructive-foreground"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSetMinimized(false); }}
            className="p-1.5 rounded-full bg-muted text-foreground hover:bg-accent"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full-screen call panel
  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col" onClick={() => setShowControls(v => !v)}>
      {/* Status bar - always visible */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-background/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            callStatus === 'connected' ? 'bg-green-500' :
            callStatus === 'reconnecting' ? 'bg-amber-500 animate-pulse' :
            callStatus === 'ended' ? 'bg-destructive' :
            'bg-primary animate-pulse'
          }`} />
          <span className="text-sm font-medium text-foreground">{partnerName}</span>
          <span className="text-xs text-muted-foreground">
            {callStatus === 'connected' ? formatDuration(callDuration) : statusLabels[callStatus]}
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onSetMinimized(true); }} className="text-muted-foreground hover:text-foreground p-1">
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Remote video / avatar - main area */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 relative">
        {callType === 'video' && callStatus === 'connected' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <span className="text-4xl font-bold text-primary">{partnerName[0]}</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{partnerName}</p>
            {callStatus !== 'connected' && (
              <p className="text-sm text-muted-foreground animate-pulse">{statusLabels[callStatus]}</p>
            )}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>
        )}

        {/* Local video preview - top right corner */}
        {callType === 'video' && (
          <div className="absolute top-16 right-4 w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-44 rounded-xl overflow-hidden border-2 border-primary/30 shadow-lg bg-muted">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <VideoOff className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar - bottom */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-background/90 to-transparent pt-12 pb-6" onClick={e => e.stopPropagation()}>
          {/* Floating chat input */}
          {showChat && (
            <div className="flex items-center gap-2 px-4 mb-4 max-w-md mx-auto">
              <Input
                placeholder="Send a message..."
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="rounded-full bg-card/90 backdrop-blur border-border text-sm"
                onClick={e => e.stopPropagation()}
              />
              <Button variant="romantic" size="icon" className="rounded-full shrink-0 h-9 w-9" onClick={handleSendChat}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-4 px-4">
            {/* Mute */}
            <button
              onClick={onToggleMute}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${
                isMuted ? 'bg-destructive/20 text-destructive' : 'bg-card/80 backdrop-blur text-foreground'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Camera */}
            {callType === 'video' && (
              <button
                onClick={onToggleCamera}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${
                  isCameraOff ? 'bg-destructive/20 text-destructive' : 'bg-card/80 backdrop-blur text-foreground'
                }`}
              >
                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                <span className="text-[10px] font-medium">{isCameraOff ? 'Camera On' : 'Camera'}</span>
              </button>
            )}

            {/* Screen Share */}
            {callType === 'video' && (
              <button
                onClick={onToggleScreenShare}
                className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${
                  isScreenSharing ? 'bg-primary/20 text-primary' : 'bg-card/80 backdrop-blur text-foreground'
                }`}
              >
                {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                <span className="text-[10px] font-medium">{isScreenSharing ? 'Stop' : 'Share'}</span>
              </button>
            )}

            {/* Chat toggle */}
            <button
              onClick={() => setShowChat(v => !v)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors ${
                showChat ? 'bg-primary/20 text-primary' : 'bg-card/80 backdrop-blur text-foreground'
              }`}
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-medium">Chat</span>
            </button>

            {/* End call */}
            <button
              onClick={onEndCall}
              className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-destructive text-destructive-foreground"
            >
              <PhoneOff className="w-6 h-6" />
              <span className="text-[10px] font-medium">End</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallOverlay;
