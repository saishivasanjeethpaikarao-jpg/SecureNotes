import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart, Image, Mic, Square, Play, Pause, X, Trash2, Circle, Check, CheckCheck, Music, Headphones, Phone, Video } from 'lucide-react';
import { useWebRTC } from '@/hooks/useWebRTC';
import CallOverlay from '@/components/CallOverlay';
import IncomingCallDialog from '@/components/IncomingCallDialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import avatarNani from '@/assets/avatar-nani.png';
import avatarAmmu from '@/assets/avatar-ammu.png';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  created_at: string;
  type: 'text' | 'image' | 'voice' | 'song';
  media_url: string | null;
  read_at: string | null;
}

interface Reaction {
  id: string;
  message_id: string;
  user_name: string;
  emoji: string;
}

const QUICK_EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const USER_PROFILES: Record<string, { nickname: string; avatar: string }> = {
  Nani: { nickname: 'Nani', avatar: avatarNani },
  Ammu: { nickname: 'Ammu', avatar: avatarAmmu },
};

const VoiceMessage = ({ url }: { url: string }) => {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0); });
    return () => { audio.pause(); audio.remove(); };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={toggle} className="shrink-0">
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 rounded-full bg-current/20 overflow-hidden">
          <div className="h-full rounded-full bg-current/60 transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
        </div>
        <span className="text-[10px] opacity-60">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
};

const Chat = ({ onNavigateToListen }: { onNavigateToListen?: () => void }) => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [showSongShare, setShowSongShare] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [longPressedMsg, setLongPressedMsg] = useState<string | null>(null);
  const [reactionPickerMsg, setReactionPickerMsg] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const receiver = currentUser === 'Nani' ? 'Ammu' : 'Nani';
  const receiverProfile = USER_PROFILES[receiver] || { nickname: receiver, avatar: '' };
  const myProfile = USER_PROFILES[currentUser || ''] || { nickname: currentUser, avatar: '' };

  const webrtc = useWebRTC({ currentUser, partner: receiver });

  const fetchMessages = async () => {
    const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const fetchReactions = async () => {
    const { data } = await supabase.from('message_reactions').select('*');
    if (data) setReactions(data as Reaction[]);
  };

  const markAsRead = useCallback(async () => {
    if (!currentUser) return;
    const unread = messages.filter(m => m.receiver === currentUser && !m.read_at);
    if (unread.length === 0) return;
    const ids = unread.map(m => m.id);
    await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', ids);
    setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
  }, [currentUser, messages]);

  useEffect(() => {
    fetchMessages();
    fetchReactions();

    const msgChannel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== (payload.old as any).id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
      })
      .subscribe();

    const reactChannel = supabase
      .channel('realtime-reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => fetchReactions())
      .subscribe();

    const presenceChannel = supabase.channel('online-presence', {
      config: { presence: { key: currentUser || 'unknown' } },
    });
    presenceChannel
      .on('presence', { event: 'sync' }, () => setIsPartnerOnline(!!presenceChannel.presenceState()[receiver]))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await presenceChannel.track({ user: currentUser, online_at: new Date().toISOString() });
      });

    const typingChannel = supabase.channel('typing-indicator');
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.user === receiver) {
          setIsPartnerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsPartnerTyping(false), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(reactChannel);
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [currentUser, receiver]);

  useEffect(() => { markAsRead(); }, [messages.length]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isPartnerTyping]);

  const broadcastTyping = useCallback(() => {
    supabase.channel('typing-indicator').send({ type: 'broadcast', event: 'typing', payload: { user: currentUser } });
  }, [currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setNewMessage(e.target.value); broadcastTyping(); };

  const uploadFile = async (file: Blob, ext: string): Promise<string | null> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
    if (error) { toast.error('Upload failed'); return null; }
    return supabase.storage.from('chat-media').getPublicUrl(fileName).data.publicUrl;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setSending(true);
    await supabase.from('messages').insert({ sender: currentUser, receiver, content: newMessage.trim(), type: 'text' });
    setNewMessage('');
    setSending(false);
  };

  const handleUnsend = async (msgId: string) => {
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    setLongPressedMsg(null);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    const existing = reactions.find(r => r.message_id === messageId && r.user_name === currentUser && r.emoji === emoji);
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
      setReactions(prev => prev.filter(r => r.id !== existing.id));
    } else {
      const { data } = await supabase.from('message_reactions').insert({ message_id: messageId, user_name: currentUser, emoji }).select().single();
      if (data) setReactions(prev => [...prev, data as Reaction]);
    }
    setReactionPickerMsg(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setImagePreview({ file, url: URL.createObjectURL(file) });
  };

  const sendImage = async () => {
    if (!imagePreview || !currentUser) return;
    setSending(true);
    const url = await uploadFile(imagePreview.file, imagePreview.file.name.split('.').pop() || 'jpg');
    if (url) await supabase.from('messages').insert({ sender: currentUser, receiver, content: '📷 Photo', type: 'image', media_url: url });
    setImagePreview(null);
    setSending(false);
  };

  const handleSendSong = async () => {
    const url = songUrl.trim();
    const title = songTitle.trim();
    if (!url || !title || !currentUser) return;
    if (!extractYouTubeId(url)) { toast.error('Please enter a valid YouTube link'); return; }
    setSending(true);
    await supabase.from('messages').insert({ sender: currentUser, receiver, content: title, type: 'song', media_url: url });
    setSongUrl(''); setSongTitle(''); setShowSongShare(false);
    setSending(false);
  };

  const handleListenTogether = async (youtubeUrl: string, title: string) => {
    if (!currentUser) return;
    await supabase.from('listen_together').insert({ youtube_url: youtubeUrl, song_title: title, started_by: currentUser });
    await supabase.from('memories').insert({ title: `🎵 ${title}`, description: `Started by ${currentUser}`, icon: '🎶', created_by: currentUser, type: 'music' });
    toast.success('Song started in Listen Together! 🎶');
    onNavigateToListen?.();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setSending(true);
        const url = await uploadFile(blob, 'webm');
        if (url && currentUser) await supabase.from('messages').insert({ sender: currentUser, receiver, content: '🎤 Voice note', type: 'voice', media_url: url });
        setSending(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { toast.error('Could not access microphone'); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); if (timerRef.current) clearInterval(timerRef.current); };
  const cancelRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); mediaRecorderRef.current = null; }
    chunksRef.current = []; setRecording(false); if (timerRef.current) clearInterval(timerRef.current);
  };
  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getMessageReactions = (msgId: string) => {
    const msgReactions = reactions.filter(r => r.message_id === msgId);
    const grouped: Record<string, string[]> = {};
    msgReactions.forEach(r => { if (!grouped[r.emoji]) grouped[r.emoji] = []; grouped[r.emoji].push(r.user_name); });
    return grouped;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
        <div className="relative">
          <img src={receiverProfile.avatar} alt={receiver} className="w-11 h-11 rounded-full object-cover border-2 border-primary/30 shadow-sm" />
          <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${isPartnerOnline ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-foreground font-romantic truncate">{receiverProfile.nickname}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {isPartnerTyping ? (
              <span className="text-primary font-medium">typing...</span>
            ) : isPartnerOnline ? (
              <span className="text-green-600">Active now</span>
            ) : (
              <span>Offline</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => webrtc.startCall('audio').catch((e: Error) => toast.error(e.message))}
            disabled={webrtc.callStatus !== 'idle'}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Phone className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => webrtc.startCall('video').catch((e: Error) => toast.error(e.message))}
            disabled={webrtc.callStatus !== 'idle'}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            <Video className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Incoming call dialog */}
      {webrtc.incomingCall && (
        <IncomingCallDialog
          callerName={webrtc.incomingCall.from}
          callType={webrtc.incomingCall.type}
          onAccept={() => webrtc.acceptCall().catch((e: Error) => toast.error(e.message))}
          onReject={webrtc.rejectCall}
        />
      )}

      {/* Call overlay */}
      {webrtc.callStatus !== 'idle' && (
        <CallOverlay
          callStatus={webrtc.callStatus}
          callType={webrtc.callType}
          isMuted={webrtc.isMuted}
          isCameraOff={webrtc.isCameraOff}
          isScreenSharing={webrtc.isScreenSharing}
          callDuration={webrtc.callDuration}
          isMinimized={webrtc.isMinimized}
          partnerName={receiverProfile.nickname}
          localVideoRef={webrtc.localVideoRef}
          remoteVideoRef={webrtc.remoteVideoRef}
          onToggleMute={webrtc.toggleMute}
          onToggleCamera={webrtc.toggleCamera}
          onToggleScreenShare={webrtc.toggleScreenShare}
          onEndCall={webrtc.endCall}
          onSetMinimized={webrtc.setIsMinimized}
          onSendMessage={async (msg) => {
            if (!currentUser) return;
            await supabase.from('messages').insert({ sender: currentUser, receiver, content: msg, type: 'text' });
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2 pr-1" onClick={() => { setLongPressedMsg(null); setReactionPickerMsg(null); }}>
        {messages.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">No messages yet 💕 Say something sweet!</p>}
        {messages.map((msg) => {
          const isMine = msg.sender === currentUser;
          const msgReactions = getMessageReactions(msg.id);
          const hasReactions = Object.keys(msgReactions).length > 0;
          const senderProfile = USER_PROFILES[msg.sender];

          return (
            <div key={msg.id} className={`flex gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {/* Partner avatar on their messages */}
              {!isMine && (
                <img src={senderProfile?.avatar} alt={msg.sender} className="w-6 h-6 rounded-full object-cover self-end shrink-0" />
              )}
              <div className="flex flex-col max-w-[75%]">
                <div
                  className={`relative rounded-2xl px-3.5 py-2 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card text-foreground shadow-sm border border-border rounded-bl-sm'}`}
                  onDoubleClick={(e) => { e.stopPropagation(); setReactionPickerMsg(reactionPickerMsg === msg.id ? null : msg.id); setLongPressedMsg(null); }}
                  onContextMenu={(e) => { if (isMine) { e.preventDefault(); setLongPressedMsg(msg.id); setReactionPickerMsg(null); } }}
                >
                  {msg.type === 'image' && msg.media_url && (
                    <img src={msg.media_url} alt="Shared photo" className="rounded-xl max-w-full max-h-64 object-cover mb-1 cursor-pointer" onClick={() => window.open(msg.media_url!, '_blank')} />
                  )}
                  {msg.type === 'voice' && msg.media_url && <VoiceMessage url={msg.media_url} />}
                  {msg.type === 'song' && msg.media_url && (
                    <div className="min-w-[200px]">
                      {extractYouTubeId(msg.media_url) && (
                        <img src={`https://img.youtube.com/vi/${extractYouTubeId(msg.media_url)}/mqdefault.jpg`} alt={msg.content} className="rounded-lg w-full h-28 object-cover mb-2" />
                      )}
                      <div className="flex items-center gap-2 mb-1.5">
                        <Music className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium leading-tight">{msg.content}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleListenTogether(msg.media_url!, msg.content); }}
                        className={`w-full flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded-lg transition-colors ${isMine ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' : 'bg-primary/10 hover:bg-primary/20 text-primary'}`}
                      >
                        <Headphones className="w-3.5 h-3.5" /> Listen Together
                      </button>
                    </div>
                  )}
                  {msg.type === 'text' && <p className="text-sm leading-relaxed">{msg.content}</p>}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMine ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                    {/* WhatsApp-style ticks on all sent messages */}
                    {isMine && (
                      msg.read_at ? (
                        <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <CheckCheck className={`w-3.5 h-3.5 ${isMine ? 'text-primary-foreground/40' : 'text-muted-foreground/40'}`} />
                      )
                    )}
                  </div>

                  {/* Unsend popup */}
                  {longPressedMsg === msg.id && isMine && (
                    <button onClick={(e) => { e.stopPropagation(); handleUnsend(msg.id); }} className="absolute -top-8 right-0 flex items-center gap-1.5 bg-destructive text-destructive-foreground text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap z-10">
                      <Trash2 className="w-3 h-3" /> Unsend
                    </button>
                  )}

                  {/* Emoji reaction picker */}
                  {reactionPickerMsg === msg.id && (
                    <div className={`absolute -top-10 ${isMine ? 'right-0' : 'left-0'} flex gap-1 bg-card border border-border rounded-full px-2 py-1 shadow-lg z-20`} onClick={e => e.stopPropagation()}>
                      {QUICK_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-base hover:scale-125 transition-transform px-0.5">{emoji}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions display */}
                {hasReactions && (
                  <div className={`flex gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(msgReactions).map(([emoji, users]) => (
                      <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                        className={`flex items-center gap-0.5 text-xs rounded-full px-1.5 py-0.5 border transition-colors ${users.includes(currentUser || '') ? 'bg-primary/15 border-primary/30' : 'bg-muted/50 border-border'}`}>
                        <span>{emoji}</span>
                        {users.length > 1 && <span className="text-[10px] text-muted-foreground">{users.length}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isPartnerTyping && (
          <div className="flex items-end gap-1.5 justify-start">
            <img src={receiverProfile.avatar} alt={receiver} className="w-6 h-6 rounded-full object-cover shrink-0" />
            <div className="bg-card text-foreground shadow-sm border border-border rounded-2xl rounded-bl-sm px-4 py-2.5">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Song Share Panel */}
      {showSongShare && (
        <div className="border border-border rounded-xl p-3 mb-2 bg-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5"><Music className="w-4 h-4 text-primary" /> Share a Song</span>
            <button onClick={() => setShowSongShare(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="YouTube URL" value={songUrl} onChange={(e) => setSongUrl(e.target.value)} className="rounded-lg text-sm" />
          {songUrl && extractYouTubeId(songUrl) && (
            <img src={`https://img.youtube.com/vi/${extractYouTubeId(songUrl)}/mqdefault.jpg`} alt="Preview" className="rounded-lg w-full h-28 object-cover" />
          )}
          <Input placeholder="Song title" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="rounded-lg text-sm" />
          <Button variant="romantic" size="sm" className="w-full rounded-xl" onClick={handleSendSong} disabled={sending || !songUrl.trim() || !songTitle.trim()}>
            <Send className="w-3 h-3 mr-1" /> Send Song
          </Button>
        </div>
      )}

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative border border-border rounded-xl p-2 mb-2 bg-card">
          <img src={imagePreview.url} alt="Preview" className="max-h-32 rounded-lg object-cover" />
          <button onClick={() => setImagePreview(null)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3 h-3" /></button>
          <Button variant="romantic" size="sm" className="mt-2 w-full rounded-xl" onClick={sendImage} disabled={sending}><Send className="w-3 h-3 mr-1" /> Send Photo</Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {recording ? (
          <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">{formatRecTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
            <button onClick={stopRecording} className="bg-destructive text-destructive-foreground rounded-full p-1.5"><Square className="w-3 h-3" fill="currentColor" /></button>
          </div>
        ) : (
          <>
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageSelect} />
            <button onClick={() => fileInputRef.current?.click()} className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-2"><Image className="w-5 h-5" /></button>
            <button onClick={() => setShowSongShare(!showSongShare)} className={`shrink-0 transition-colors p-2 ${showSongShare ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}><Music className="w-5 h-5" /></button>
            <Input placeholder={`Message ${receiverProfile.nickname}...`} value={newMessage} onChange={handleInputChange} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} className="rounded-full bg-muted/50 border-none" />
            {newMessage.trim() ? (
              <Button variant="romantic" size="icon" className="rounded-full shrink-0 h-9 w-9" onClick={handleSend} disabled={sending}><Send className="w-4 h-4" /></Button>
            ) : (
              <button onClick={startRecording} className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-2"><Mic className="w-5 h-5" /></button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
