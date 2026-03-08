import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended';
export type CallType = 'video' | 'audio';

interface IncomingCall {
  from: string;
  type: CallType;
}

interface UseWebRTCOptions {
  currentUser: string | null;
  partner: string;
  onMissedCall?: (type: CallType, direction: 'outgoing' | 'incoming') => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC({ currentUser, partner, onMissedCall }: UseWebRTCOptions) {
  const log = (msg: string, data?: any) => console.log(`[WebRTC] ${msg}`, data ?? '');
  const logError = (msg: string, err?: any) => console.error(`[WebRTC] ❌ ${msg}`, err ?? '');

  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [isPartnerMuted, setIsPartnerMuted] = useState(false);
  const [isPartnerCameraOff, setIsPartnerCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const CALL_TIMEOUT_MS = 30_000;

  const channelName = [currentUser, partner].sort().join('-') + '-call';

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    remoteStreamRef.current = new MediaStream();
    if (timerRef.current) clearInterval(timerRef.current);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    iceCandidateQueue.current = [];
    reconnectAttempts.current = 0;
  }, []);

  const broadcast = useCallback((event: string, payload: any) => {
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload: { ...payload, from: currentUser },
    });
  }, [currentUser]);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        broadcast('ice-candidate', { candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach(track => {
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.onconnectionstatechange = () => {
      log(`Connection state: ${pc.connectionState}`);
      switch (pc.connectionState) {
        case 'connected':
          log('✅ Call connected successfully');
          setCallStatus('connected');
          reconnectAttempts.current = 0;
          if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current);
            reconnectTimer.current = null;
          }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
          }
          break;
        case 'disconnected':
          log('⚠️ Connection disconnected — attempting reconnect');
          setCallStatus('reconnecting');
          reconnectTimer.current = setTimeout(async () => {
            if (pc.connectionState === 'disconnected' && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current++;
              log(`ICE restart attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}`);
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                broadcast('offer', { sdp: offer });
              } catch (err) {
                logError('ICE restart failed', err);
              }
            }
          }, 2000);
          break;
        case 'failed':
          logError(`Connection failed (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
          if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            setCallStatus('reconnecting');
            reconnectAttempts.current++;
            (async () => {
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                broadcast('offer', { sdp: offer });
              } catch (err) {
                logError('ICE restart on failure failed', err);
                setCallStatus('ended');
                setTimeout(() => setCallStatus('idle'), 1500);
                cleanup();
              }
            })();
          } else {
            logError('Max reconnect attempts reached — ending call');
            setCallStatus('ended');
            setTimeout(() => setCallStatus('idle'), 1500);
            cleanup();
          }
          break;
        case 'closed':
          log('Connection closed');
          setCallStatus('ended');
          setTimeout(() => setCallStatus('idle'), 1500);
          cleanup();
          break;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [broadcast, cleanup]);

  const checkPermission = useCallback(async (kind: 'camera' | 'microphone'): Promise<'granted' | 'denied' | 'prompt'> => {
    try {
      const name = kind === 'camera' ? 'camera' as PermissionName : 'microphone' as PermissionName;
      const result = await navigator.permissions.query({ name });
      return result.state;
    } catch {
      return 'prompt'; // browser doesn't support permissions API – proceed normally
    }
  }, []);

  const getLocalStream = useCallback(async (type: CallType) => {
    log(`Requesting ${type} media stream`);
    const micPerm = await checkPermission('microphone');
    log(`Microphone permission: ${micPerm}`);
    if (micPerm === 'denied') {
      logError('Microphone blocked');
      throw new Error('🎙️ Microphone access is blocked. Please allow it in your browser settings and reload.');
    }
    if (type === 'video') {
      const camPerm = await checkPermission('camera');
      log(`Camera permission: ${camPerm}`);
      if (camPerm === 'denied') {
        logError('Camera blocked');
        throw new Error('📷 Camera access is blocked. Please allow it in your browser settings and reload.');
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      log(`✅ Media stream acquired (tracks: ${stream.getTracks().map(t => t.kind).join(', ')})`);
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err: any) {
      logError(`Media access error: ${err.name}`, err.message);
      if (err.name === 'NotAllowedError') {
        throw new Error(
          type === 'video'
            ? '📷 Camera/microphone permission denied. Please allow access in your browser and try again.'
            : '🎙️ Microphone permission denied. Please allow access in your browser and try again.'
        );
      }
      if (err.name === 'NotFoundError') {
        throw new Error(
          type === 'video'
            ? '📷 No camera found. Please connect a camera and try again.'
            : '🎙️ No microphone found. Please connect a microphone and try again.'
        );
      }
      throw new Error('Could not access camera/microphone. Please check your device settings.');
    }
  }, [checkPermission]);

  const startCall = useCallback(async (type: CallType) => {
    if (!currentUser || callStatus !== 'idle') return;
    log(`Starting ${type} call to ${partner}`);
    setCallType(type);
    setCallStatus('calling');
    
    try {
      const stream = await getLocalStream(type);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      broadcast('call-invite', { type });
      log('Call invite sent — waiting for answer (30s timeout)');

      callTimeoutRef.current = setTimeout(() => {
        if (pcRef.current?.connectionState !== 'connected') {
          log('⏰ Call timeout — no answer');
          broadcast('call-end', { reason: 'missed' });
          onMissedCall?.(type, 'outgoing');
          setCallStatus('ended');
          setTimeout(() => setCallStatus('idle'), 1500);
          cleanup();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err: any) {
      logError('Failed to start call', err.message);
      setCallStatus('idle');
      throw err;
    }
  }, [currentUser, callStatus, getLocalStream, createPeerConnection, broadcast, cleanup]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const type = incomingCall.type;
    setCallType(type);
    setCallStatus('connecting');
    setIncomingCall(null);

    try {
      const stream = await getLocalStream(type);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      broadcast('call-accepted', { type });
    } catch (err: any) {
      setCallStatus('idle');
      broadcast('call-rejected', {});
      throw err;
    }
  }, [incomingCall, getLocalStream, createPeerConnection, broadcast]);

  const rejectCall = useCallback(() => {
    broadcast('call-rejected', {});
    setIncomingCall(null);
  }, [broadcast]);

  const endCall = useCallback(() => {
    broadcast('call-end', {});
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 1500);
    cleanup();
  }, [broadcast, cleanup]);

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => {
      broadcast('media-toggle', { kind: 'mic', enabled: m }); // m is prev value, so !m is new
      return !m;
    });
  }, [broadcast]);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(c => {
      broadcast('media-toggle', { kind: 'camera', enabled: c });
      return !c;
    });
  }, [broadcast]);

  const toggleScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    
    if (isScreenSharing) {
      // Stop screen share, restore camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        sender?.replaceTrack(videoTrack);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          pcRef.current.addTrack(screenTrack, screen);
        }
        screenTrack.onended = () => toggleScreenShare();
        setIsScreenSharing(true);
      } catch {
        // User cancelled screen share
      }
    }
  }, [isScreenSharing]);

  // Signaling channel
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'call-invite' }, async ({ payload }) => {
        if (payload.from === currentUser) return;
        if (callStatus !== 'idle') {
          broadcast('call-rejected', {});
          return;
        }
        setIncomingCall({ from: payload.from, type: payload.type });
      })
      .on('broadcast', { event: 'call-accepted' }, async ({ payload }) => {
        if (payload.from === currentUser) return;
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        setCallStatus('connecting');
        // Caller creates offer
        const pc = pcRef.current;
        if (!pc) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        broadcast('offer', { sdp: offer });
      })
      .on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        onMissedCall?.(callType, 'outgoing');
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 1500);
        cleanup();
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        if (payload.reason === 'missed') {
          onMissedCall?.(callType, 'incoming');
        }
        const reason = payload.reason === 'user-left' ? `${payload.from} disconnected` : null;
        setEndReason(reason);
        setCallStatus('ended');
        setTimeout(() => { setCallStatus('idle'); setEndReason(null); }, 2500);
        cleanup();
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (payload.from === currentUser) return;
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        // Process queued ICE candidates
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        iceCandidateQueue.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcast('answer', { sdp: answer });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (payload.from === currentUser) return;
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        for (const c of iceCandidateQueue.current) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
        iceCandidateQueue.current = [];
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (payload.from === currentUser) return;
        const pc = pcRef.current;
        if (pc?.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          iceCandidateQueue.current.push(payload.candidate);
        }
      })
      .on('broadcast', { event: 'media-toggle' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        if (payload.kind === 'mic') setIsPartnerMuted(!payload.enabled);
        if (payload.kind === 'camera') setIsPartnerCameraOff(!payload.enabled);
      })
      .subscribe();

    // Broadcast call-end when user closes/refreshes the tab
    const handleBeforeUnload = () => {
      if (pcRef.current) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'call-end',
          payload: { from: currentUser, reason: 'user-left' },
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.removeChannel(channel);
    };
  }, [currentUser, channelName]);

  // Pause video when tab is hidden to save resources
  useEffect(() => {
    const handleVisibility = () => {
      const videoTracks = localStreamRef.current?.getVideoTracks();
      if (!videoTracks?.length) return;
      if (document.hidden) {
        log('Tab hidden — pausing video track');
        videoTracks.forEach(t => { t.enabled = false; });
      } else if (!isCameraOff) {
        log('Tab visible — resuming video track');
        videoTracks.forEach(t => { t.enabled = true; });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isCameraOff]);

  // Stop camera when call is minimized, restore when expanded
  useEffect(() => {
    const videoTracks = localStreamRef.current?.getVideoTracks();
    if (!videoTracks?.length || callType !== 'video') return;
    if (isMinimized) {
      log('Call minimized — disabling camera');
      videoTracks.forEach(t => { t.enabled = false; });
    } else if (!isCameraOff) {
      log('Call expanded — enabling camera');
      videoTracks.forEach(t => { t.enabled = true; });
    }
  }, [isMinimized, isCameraOff, callType]);

  return {
    callStatus,
    callType,
    incomingCall,
    isMuted,
    isCameraOff,
    isScreenSharing,
    callDuration,
    isMinimized,
    endReason,
    isPartnerMuted,
    isPartnerCameraOff,
    localVideoRef,
    remoteVideoRef,
    remoteStream: remoteStreamRef.current,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    setIsMinimized,
  };
}
