import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Monitor, MonitorOff, Minimize2, Maximize2, Clock, MessageCircle, Send,
  Camera, Star, Wifi, WifiOff, Signal
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
  isPartnerTyping?: boolean;
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

// Floating star reaction
interface FloatingStar {
  id: number;
  x: number;
}

const StarField = () => {
  const stars = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 3,
    })),
  []);

  return (
    <div className="star-field">
      {stars.map(s => (
        <div
          key={s.id}
          className="star-dot"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// Network quality indicator
const NetworkQuality = ({ pc }: { pc?: RTCPeerConnection | null }) => {
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor'>('good');

  useEffect(() => {
    if (!pc) return;
    const interval = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });
        if (rtt > 0.3) setQuality('poor');
        else if (rtt > 0.15) setQuality('fair');
        else setQuality('good');
      } catch {
        // ignore
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pc]);

  const colors = { good: '#4ade80', fair: '#fbbf24', poor: '#f87171' };
  const labels = { good: 'Good', fair: 'Fair', poor: 'Poor' };

  return (
    <div className="flex items-center gap-1 call-glass rounded-full px-2 py-0.5">
      <Signal className="w-3 h-3" style={{ color: colors[quality] }} />
      <span className="text-[10px]" style={{ color: colors[quality] }}>{labels[quality]}</span>
    </div>
  );
};

const CallOverlay = ({
  callStatus, callType, isMuted, isCameraOff, isScreenSharing,
  callDuration, isMinimized, partnerName,
  localVideoRef, remoteVideoRef,
  onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall, onSetMinimized,
  onSendMessage, isPartnerTyping,
}: CallOverlayProps) => {
  const [chatMsg, setChatMsg] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [floatingStars, setFloatingStars] = useState<FloatingStar[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const starIdRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isMinimized) return;
    dragging.current = true;
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 200, e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 160, e.clientY - offset.current.y)),
    });
  };
  const handlePointerUp = () => { dragging.current = false; };

  const handleSendChat = () => {
    if (!chatMsg.trim()) return;
    onSendMessage?.(chatMsg.trim());
    setChatMsg('');
  };

  const handleStarReaction = useCallback(() => {
    const id = starIdRef.current++;
    const x = 30 + Math.random() * 40; // 30-70% from left
    setFloatingStars(prev => [...prev, { id, x }]);
    setTimeout(() => setFloatingStars(prev => prev.filter(s => s.id !== id)), 2000);
  }, []);

  const handleScreenshot = useCallback(() => {
    const video = remoteVideoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const link = document.createElement('a');
    link.download = `call-screenshot-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [remoteVideoRef]);

  if (callStatus === 'idle') return null;

  // Minimized floating PiP
  if (isMinimized) {
    return (
      <div
        className="fixed z-50 rounded-2xl overflow-hidden shadow-2xl call-space-bg cursor-grab active:cursor-grabbing animate-slide-down-scale"
        style={{ left: position.x, top: position.y, width: 200, border: '1px solid rgba(255,255,255,0.08)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <StarField />
        <div className="relative w-full h-28">
          {callType === 'video' && callStatus === 'connected' ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute top-1.5 right-1.5 w-12 h-16 rounded-lg overflow-hidden shadow" style={{ border: '1px solid rgba(59,130,246,0.3)' }}>
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <span className="text-lg font-bold" style={{ color: '#93b4f8' }}>{partnerName[0]}</span>
              </div>
              <span className="text-xs mt-1" style={{ color: '#7b8ab8' }}>{partnerName}</span>
            </div>
          )}
          {callStatus === 'connected' && (
            <div className="absolute top-1.5 left-1.5 call-glass rounded-full px-2 py-0.5 flex items-center gap-1 z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] font-mono" style={{ color: '#d1d5db' }}>{formatDuration(callDuration)}</span>
            </div>
          )}
          {callStatus !== 'connected' && (
            <div className="absolute top-1.5 left-1.5 call-glass rounded-full px-2 py-0.5 z-10">
              <span className="text-[10px]" style={{ color: '#7b8ab8' }}>{statusLabels[callStatus]}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(11,15,42,0.9)' }}>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className={`p-1.5 rounded-full ${isMuted ? 'call-control-active' : 'call-control'}`}>
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            {callType === 'video' && (
              <button onClick={(e) => { e.stopPropagation(); onToggleCamera(); }} className={`p-1.5 rounded-full ${isCameraOff ? 'call-control-active' : 'call-control'}`}>
                {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onEndCall(); }} className="p-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.8)', color: '#fff' }}>
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onSetMinimized(false); }} className="call-control p-1.5 rounded-full">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full-screen dark space call panel
  return (
    <div className="fixed inset-0 z-40 call-space-bg flex flex-col animate-expand-in" onClick={() => setShowControls(v => !v)}>
      <StarField />

      {/* Floating star reactions */}
      {floatingStars.map(s => (
        <div
          key={s.id}
          className="absolute z-30 pointer-events-none animate-reaction-float"
          style={{ left: `${s.x}%`, bottom: '20%' }}
        >
          <Star className="w-8 h-8" style={{ color: '#facc15', filter: 'drop-shadow(0 0 8px rgba(250,204,21,0.6))' }} fill="currentColor" />
        </div>
      ))}

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: 'linear-gradient(to bottom, rgba(11,15,42,0.9), transparent)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            callStatus === 'connected' ? 'bg-green-400' :
            callStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
            callStatus === 'ended' ? 'bg-red-400' :
            'animate-pulse'
          }`} style={callStatus !== 'connected' && callStatus !== 'reconnecting' && callStatus !== 'ended' ? { background: '#3b82f6' } : {}} />
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{partnerName}</span>
          <span className="text-xs" style={{ color: '#7b8ab8' }}>
            {callStatus === 'connected' ? formatDuration(callDuration) : statusLabels[callStatus]}
          </span>
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1 call-glass rounded-full px-2 py-0.5 ml-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-medium" style={{ color: '#f87171' }}>REC</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Network quality */}
          {callStatus === 'connected' && <NetworkQuality />}
          <button onClick={(e) => { e.stopPropagation(); onSetMinimized(true); }} className="call-control p-1.5 rounded-full">
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Typing indicator overlay */}
      {isPartnerTyping && callStatus === 'connected' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 call-glass rounded-full px-4 py-1.5 flex items-center gap-2 animate-fade-in" onClick={e => e.stopPropagation()}>
          <span className="text-xs" style={{ color: '#93b4f8' }}>{partnerName} is typing</span>
          <div className="flex gap-0.5 items-center">
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#93b4f8', animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#93b4f8', animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#93b4f8', animationDelay: '300ms' }} />
          </div>
        </div>
      )}

      {/* Main video/avatar area */}
      <div className="flex-1 flex items-center justify-center relative">
        {callType === 'video' && callStatus === 'connected' ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)', border: '2px solid rgba(59,130,246,0.25)', boxShadow: '0 0 40px rgba(59,130,246,0.15)' }}>
              <span className="text-4xl font-bold" style={{ color: '#93b4f8' }}>{partnerName[0]}</span>
            </div>
            <p className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>{partnerName}</p>
            {callStatus !== 'connected' && (
              <p className="text-sm animate-pulse" style={{ color: '#7b8ab8' }}>{statusLabels[callStatus]}</p>
            )}
            {callStatus === 'connected' && (
              <div className="flex items-center gap-1.5" style={{ color: '#7b8ab8' }}>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>
        )}

        {/* Local video PiP */}
        {callType === 'video' && (
          <div className="absolute top-16 right-4 w-24 h-32 sm:w-28 sm:h-36 md:w-32 md:h-44 rounded-xl overflow-hidden shadow-lg call-glass">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {isCameraOff && (
              <div className="absolute inset-0 flex items-center justify-center call-space-bg">
                <VideoOff className="w-6 h-6" style={{ color: '#7b8ab8' }} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 pt-8 pb-4" style={{ background: 'linear-gradient(to top, rgba(11,15,42,0.95), rgba(11,15,42,0.6), transparent)' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-3 px-4 mb-3 flex-wrap">
            {/* Mute */}
            <button onClick={onToggleMute} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${isMuted ? 'call-control-active' : 'call-control'}`}>
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            {/* Camera */}
            {callType === 'video' && (
              <button onClick={onToggleCamera} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${isCameraOff ? 'call-control-active' : 'call-control'}`}>
                {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                <span className="text-[10px] font-medium">{isCameraOff ? 'On' : 'Camera'}</span>
              </button>
            )}

            {/* Screen Share */}
            {callType === 'video' && (
              <button onClick={onToggleScreenShare} className="flex flex-col items-center gap-1 p-3 rounded-2xl call-control" style={isScreenSharing ? { background: 'rgba(250,204,21,0.15)', color: '#facc15' } : {}}>
                {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
                <span className="text-[10px] font-medium">{isScreenSharing ? 'Stop' : 'Share'}</span>
              </button>
            )}

            {/* Screenshot */}
            {callType === 'video' && callStatus === 'connected' && (
              <button onClick={handleScreenshot} className="flex flex-col items-center gap-1 p-3 rounded-2xl call-control">
                <Camera className="w-6 h-6" />
                <span className="text-[10px] font-medium">Shot</span>
              </button>
            )}

            {/* Star reaction */}
            <button onClick={handleStarReaction} className="flex flex-col items-center gap-1 p-3 rounded-2xl call-control" style={{ color: '#facc15' }}>
              <Star className="w-6 h-6" fill="currentColor" />
              <span className="text-[10px] font-medium">Star</span>
            </button>

            {/* End call */}
            <button onClick={onEndCall} className="flex flex-col items-center gap-1 p-3 rounded-2xl" style={{ background: 'rgba(239,68,68,0.8)', color: '#fff' }}>
              <PhoneOff className="w-6 h-6" />
              <span className="text-[10px] font-medium">End</span>
            </button>
          </div>

          {/* Chat input */}
          <div className="flex items-center gap-2 px-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 flex-1 call-glass rounded-full px-3 py-1.5">
              <MessageCircle className="w-4 h-4 shrink-0" style={{ color: '#7b8ab8' }} />
              <input
                placeholder="Type a message..."
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                onClick={e => e.stopPropagation()}
                className="bg-transparent border-none outline-none text-sm flex-1 h-8 placeholder:text-[#4a5580]"
                style={{ color: '#e2e8f0' }}
              />
            </div>
            <button onClick={handleSendChat} className="call-control rounded-full p-2.5 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallOverlay;
