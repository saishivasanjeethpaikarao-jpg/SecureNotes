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
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC({ currentUser, partner }: UseWebRTCOptions) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callType, setCallType] = useState<CallType>('audio');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

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
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    iceCandidateQueue.current = [];
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
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
          break;
        case 'disconnected':
        case 'failed':
          setCallStatus('reconnecting');
          break;
        case 'closed':
          setCallStatus('ended');
          setTimeout(() => setCallStatus('idle'), 1500);
          cleanup();
          break;
      }
    };

    pcRef.current = pc;
    return pc;
  }, [broadcast, cleanup]);

  const getLocalStream = useCallback(async (type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch (err: any) {
      const msg = err.name === 'NotAllowedError' 
        ? 'Camera/microphone permission denied' 
        : 'Could not access camera/microphone';
      throw new Error(msg);
    }
  }, []);

  const startCall = useCallback(async (type: CallType) => {
    if (!currentUser || callStatus !== 'idle') return;
    setCallType(type);
    setCallStatus('calling');
    
    try {
      const stream = await getLocalStream(type);
      const pc = createPeerConnection();
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      broadcast('call-invite', { type });
      
      // Wait for answer, timeout after 30s
      setTimeout(() => {
        if (callStatus === 'calling') {
          endCall();
        }
      }, 30000);
    } catch (err: any) {
      setCallStatus('idle');
      throw err;
    }
  }, [currentUser, callStatus, getLocalStream, createPeerConnection, broadcast]);

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
    setIsMuted(m => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(c => !c);
  }, []);

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
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 1500);
        cleanup();
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 1500);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, channelName]);

  return {
    callStatus,
    callType,
    incomingCall,
    isMuted,
    isCameraOff,
    isScreenSharing,
    callDuration,
    isMinimized,
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
