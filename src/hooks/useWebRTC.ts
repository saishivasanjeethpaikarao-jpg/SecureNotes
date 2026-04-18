import { useState, useEffect, useRef, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyEventObjectParticipant } from '@daily-co/daily-js';
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
  onCallEnd?: (type: CallType, durationSeconds: number, status: 'completed' | 'missed' | 'rejected') => void;
}

const SUPABASE_FUNCTIONS_URL = 'https://gewxvkxkrszvtcabxkdd.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdld3h2a3hrcnN6dnRjYWJ4a2RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDIxMzgsImV4cCI6MjA4ODM3ODEzOH0.Y7Tlxu6gd-kf6erLqR5Njf-H9973FtR1ShIK_6a_lV4';
const CALL_TIMEOUT_MS = 30_000;

export function useWebRTC({ currentUser, partner, onMissedCall, onCallEnd }: UseWebRTCOptions) {
  const log = (msg: string, data?: any) => console.log(`[Daily] ${msg}`, data ?? '');
  const logError = (msg: string, err?: any) => console.error(`[Daily] ❌ ${msg}`, err ?? '');

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
  const [videoQuality] = useState<'high' | 'medium' | 'low'>('high');

  // Refs — avoid stale closures in async callbacks
  const callStatusRef = useRef<CallStatus>('idle');
  const callTypeRef = useRef<CallType>('audio');
  callStatusRef.current = callStatus;
  callTypeRef.current = callType;

  const callObjectRef = useRef<DailyCall | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const channelName = [currentUser, partner].sort().join('-') + '-call';

  // ----- Helpers -----
  const broadcast = useCallback((event: string, payload: any) => {
    log(`Broadcasting: ${event}`);
    channelRef.current?.send({
      type: 'broadcast',
      event,
      payload: { ...payload, from: currentUser },
    });
  }, [currentUser]);

  const attachStreamToVideo = useCallback((
    videoEl: HTMLVideoElement | null,
    track: MediaStreamTrack | null,
  ) => {
    if (!videoEl) return;
    if (!track) {
      videoEl.srcObject = null;
      return;
    }
    const existing = videoEl.srcObject as MediaStream | null;
    const stream = existing instanceof MediaStream ? existing : new MediaStream();
    // Replace any existing track of same kind
    stream.getTracks().filter(t => t.kind === track.kind).forEach(t => stream.removeTrack(t));
    stream.addTrack(track);
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});
  }, []);

  const cleanup = useCallback(async () => {
    log('Cleanup');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setIsMinimized(false);
    setIsPartnerMuted(false);
    setIsPartnerCameraOff(false);

    // Detach streams
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (callObjectRef.current) {
      try {
        await callObjectRef.current.leave();
      } catch (e) { logError('leave failed', e); }
      try {
        await callObjectRef.current.destroy();
      } catch (e) { logError('destroy failed', e); }
      callObjectRef.current = null;
    }
  }, []);

  // ----- Daily setup -----
  const fetchRoomCredentials = useCallback(async (type: CallType): Promise<{ url: string; token: string }> => {
    const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/daily-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ username: currentUser, callType: type }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to set up call: ${text}`);
    }
    return res.json();
  }, [currentUser]);

  const handleParticipantUpdate = useCallback((participant: any) => {
    if (!callObjectRef.current) return;
    const isLocal = participant.local;

    if (isLocal) {
      const videoTrack = participant.tracks?.video?.persistentTrack as MediaStreamTrack | undefined;
      if (videoTrack && localVideoRef.current) {
        attachStreamToVideo(localVideoRef.current, videoTrack);
      }
    } else {
      const videoTrack = participant.tracks?.video?.persistentTrack as MediaStreamTrack | undefined;
      const audioTrack = participant.tracks?.audio?.persistentTrack as MediaStreamTrack | undefined;
      if (remoteVideoRef.current) {
        // Build a fresh stream with both tracks
        const stream = new MediaStream();
        if (videoTrack && participant.tracks.video.state !== 'off') stream.addTrack(videoTrack);
        if (audioTrack && participant.tracks.audio.state !== 'off') stream.addTrack(audioTrack);
        if (stream.getTracks().length > 0) {
          remoteVideoRef.current.srcObject = stream;
          remoteVideoRef.current.play().catch(() => {});
        }
      }
      setIsPartnerMuted(participant.tracks?.audio?.state === 'off');
      setIsPartnerCameraOff(participant.tracks?.video?.state === 'off');
    }
  }, [attachStreamToVideo]);

  const setupCallObjectListeners = useCallback((co: DailyCall) => {
    co.on('joined-meeting', () => {
      log('✅ joined-meeting');
      // If partner is already in the room, mark as connected
      const participants = co.participants();
      const others = Object.values(participants).filter((p: any) => !p.local);
      if (others.length > 0) {
        setCallStatus('connected');
        callStatusRef.current = 'connected';
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
        }
        // Sync existing participant tracks
        others.forEach((p: any) => handleParticipantUpdate(p));
      }
      // Sync local video
      const local = participants.local;
      if (local) handleParticipantUpdate(local);
    });

    co.on('participant-joined', (e: DailyEventObjectParticipant | undefined) => {
      log('👋 participant-joined', e?.participant?.user_name);
      setCallStatus('connected');
      callStatusRef.current = 'connected';
      if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      }
      if (e?.participant) handleParticipantUpdate(e.participant);
    });

    co.on('participant-updated', (e: DailyEventObjectParticipant | undefined) => {
      if (e?.participant) handleParticipantUpdate(e.participant);
    });

    co.on('participant-left', () => {
      log('👋 partner left');
      setEndReason(`${partner} left the call`);
      const duration = callDurationFromTimer();
      onCallEnd?.(callTypeRef.current, duration, duration > 0 ? 'completed' : 'missed');
      setCallStatus('ended');
      callStatusRef.current = 'ended';
      setTimeout(() => {
        setCallStatus('idle');
        callStatusRef.current = 'idle';
        setEndReason(null);
      }, 5000);
      cleanup();
    });

    co.on('error', (e: any) => {
      logError('Daily error', e);
    });

    co.on('camera-error', (e: any) => {
      logError('Camera error', e);
    });
  }, [cleanup, handleParticipantUpdate, onCallEnd, partner]);

  const callDurationFromTimer = () => {
    // Read current value via setter — closure-safe
    let value = 0;
    setCallDuration(v => { value = v; return v; });
    return value;
  };

  const joinDailyRoom = useCallback(async (type: CallType) => {
    const { url, token } = await fetchRoomCredentials(type);
    log(`Joining room: ${url}`);

    // Destroy any leftover call object first
    if (callObjectRef.current) {
      try { await callObjectRef.current.destroy(); } catch {}
      callObjectRef.current = null;
    }

    const co = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: type === 'video',
    });
    callObjectRef.current = co;
    setupCallObjectListeners(co);

    await co.join({
      url,
      token,
      userName: currentUser ?? 'guest',
      startVideoOff: type === 'audio',
      startAudioOff: false,
    });
    log('join() resolved');
  }, [currentUser, fetchRoomCredentials, setupCallObjectListeners]);

  // ----- Public actions -----
  const startCall = useCallback(async (type: CallType) => {
    if (!currentUser || callStatusRef.current !== 'idle') return;
    log(`Starting ${type} call to ${partner}`);
    setCallType(type);
    callTypeRef.current = type;
    setCallStatus('calling');
    callStatusRef.current = 'calling';

    try {
      // Ring the partner via Supabase signaling
      broadcast('call-invite', { type });

      // Join the Daily room (we'll be alone until they accept)
      await joinDailyRoom(type);
      setCallStatus('connecting');
      callStatusRef.current = 'connecting';

      // 30s no-answer timeout
      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current !== 'connected') {
          log('⏰ No answer');
          broadcast('call-end', { reason: 'missed' });
          onMissedCall?.(type, 'outgoing');
          onCallEnd?.(type, 0, 'missed');
          setCallStatus('ended');
          callStatusRef.current = 'ended';
          setTimeout(() => { setCallStatus('idle'); callStatusRef.current = 'idle'; }, 5000);
          cleanup();
        }
      }, CALL_TIMEOUT_MS);
    } catch (err: any) {
      logError('startCall failed', err.message);
      setCallStatus('idle');
      callStatusRef.current = 'idle';
      cleanup();
      throw new Error(err.message || 'Could not start call. Check camera/mic permissions.');
    }
  }, [currentUser, partner, broadcast, joinDailyRoom, cleanup, onMissedCall, onCallEnd]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const type = incomingCall.type;
    log(`Accepting ${type} call from ${incomingCall.from}`);
    setCallType(type);
    callTypeRef.current = type;
    setCallStatus('connecting');
    callStatusRef.current = 'connecting';
    setIncomingCall(null);

    try {
      broadcast('call-accepted', { type });
      await joinDailyRoom(type);
    } catch (err: any) {
      logError('acceptCall failed', err.message);
      broadcast('call-rejected', {});
      setCallStatus('idle');
      callStatusRef.current = 'idle';
      cleanup();
      throw new Error(err.message || 'Could not join call. Check camera/mic permissions.');
    }
  }, [incomingCall, broadcast, joinDailyRoom, cleanup]);

  const rejectCall = useCallback(() => {
    broadcast('call-rejected', {});
    setIncomingCall(null);
  }, [broadcast]);

  const endCall = useCallback(() => {
    const duration = callDurationFromTimer();
    broadcast('call-end', {});
    onCallEnd?.(callTypeRef.current, duration, duration > 0 ? 'completed' : 'missed');
    setCallStatus('ended');
    callStatusRef.current = 'ended';
    setTimeout(() => { setCallStatus('idle'); callStatusRef.current = 'idle'; }, 5000);
    cleanup();
  }, [broadcast, cleanup, onCallEnd]);

  const toggleMute = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const newMuted = !isMuted;
    co.setLocalAudio(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const co = callObjectRef.current;
    if (!co) return;
    const newOff = !isCameraOff;
    co.setLocalVideo(!newOff);
    setIsCameraOff(newOff);
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    const co = callObjectRef.current;
    if (!co) return;
    try {
      if (isScreenSharing) {
        co.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await co.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (e) {
      logError('Screen share toggle failed', e);
    }
  }, [isScreenSharing]);

  // ----- Signaling channel (incoming-call ringing only) -----
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        log(`📞 Incoming ${payload.type} call from ${payload.from}`);
        if (callStatusRef.current !== 'idle') {
          log('Busy — auto-rejecting');
          broadcast('call-rejected', {});
          return;
        }
        setIncomingCall({ from: payload.from, type: payload.type });
        if (document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            const n = new Notification(`${payload.from} is calling...`, {
              body: `Incoming ${payload.type} call`,
              icon: '/favicon.ico',
              tag: 'incoming-call',
              requireInteraction: true,
            });
            n.onclick = () => { window.focus(); n.close(); };
            setTimeout(() => n.close(), CALL_TIMEOUT_MS);
          } catch {}
        }
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        log(`✅ ${payload.from} accepted`);
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        // Daily's participant-joined event will mark us 'connected'
      })
      .on('broadcast', { event: 'call-rejected' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        log('Call rejected');
        onMissedCall?.(callTypeRef.current, 'outgoing');
        onCallEnd?.(callTypeRef.current, 0, 'rejected');
        setCallStatus('ended');
        callStatusRef.current = 'ended';
        setTimeout(() => { setCallStatus('idle'); callStatusRef.current = 'idle'; }, 5000);
        cleanup();
      })
      .on('broadcast', { event: 'call-end' }, ({ payload }) => {
        if (payload.from === currentUser) return;
        log(`Partner ended call (reason: ${payload.reason})`);
        if (payload.reason === 'missed') onMissedCall?.(callTypeRef.current, 'incoming');
        setEndReason(payload.reason === 'user-left' ? `${payload.from} disconnected` : null);
        setCallStatus('ended');
        callStatusRef.current = 'ended';
        setTimeout(() => {
          setCallStatus('idle');
          callStatusRef.current = 'idle';
          setEndReason(null);
        }, 5000);
        cleanup();
      })
      .subscribe();

    const handleBeforeUnload = () => {
      if (callObjectRef.current) {
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
  }, [currentUser, channelName, broadcast, cleanup, onMissedCall, onCallEnd]);

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
    videoQuality,
    localVideoRef,
    remoteVideoRef,
    remoteStream: null as MediaStream | null,
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
