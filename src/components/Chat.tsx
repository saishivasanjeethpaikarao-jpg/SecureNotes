import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart, Image, Mic, Square, Play, Pause, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  created_at: string;
  type: 'text' | 'image' | 'voice';
  media_url: string | null;
}

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <button onClick={toggle} className="shrink-0">
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <div className="flex-1">
        <div className="h-1 rounded-full bg-current/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-current/60 transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] opacity-60">{formatTime(currentTime)} / {formatTime(duration)}</span>
      </div>
    </div>
  );
};

const Chat = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const receiver = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const uploadFile = async (file: Blob, ext: string): Promise<string | null> => {
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('chat-media').upload(fileName, file);
    if (error) { toast.error('Upload failed'); return null; }
    const { data } = supabase.storage.from('chat-media').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setSending(true);
    await supabase.from('messages').insert({
      sender: currentUser,
      receiver,
      content: newMessage.trim(),
      type: 'text',
    });
    setNewMessage('');
    setSending(false);
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
    if (url) {
      await supabase.from('messages').insert({
        sender: currentUser,
        receiver,
        content: '📷 Photo',
        type: 'image',
        media_url: url,
      });
    }
    setImagePreview(null);
    setSending(false);
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
        if (url && currentUser) {
          await supabase.from('messages').insert({
            sender: currentUser,
            receiver,
            content: '🎤 Voice note',
            type: 'voice',
            media_url: url,
          });
        }
        setSending(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
    }
    chunksRef.current = [];
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-full gradient-romantic flex items-center justify-center text-primary-foreground font-bold text-sm">
          {receiver[0]}
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-foreground">{receiver}</h2>
          <p className="text-xs text-muted-foreground">Active now 💚</p>
        </div>
        <Heart className="w-5 h-5 text-primary" fill="currentColor" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">No messages yet 💕 Say something sweet!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender === currentUser;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card text-foreground shadow-sm border border-border rounded-bl-sm'
                }`}
              >
                {msg.type === 'image' && msg.media_url && (
                  <img
                    src={msg.media_url}
                    alt="Shared photo"
                    className="rounded-xl max-w-full max-h-64 object-cover mb-1 cursor-pointer"
                    onClick={() => window.open(msg.media_url!, '_blank')}
                  />
                )}
                {msg.type === 'voice' && msg.media_url && (
                  <VoiceMessage url={msg.media_url} />
                )}
                {msg.type === 'text' && (
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-0.5 ${isMine ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="relative border border-border rounded-xl p-2 mb-2 bg-card">
          <img src={imagePreview.url} alt="Preview" className="max-h-32 rounded-lg object-cover" />
          <button onClick={() => setImagePreview(null)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
            <X className="w-3 h-3" />
          </button>
          <Button variant="romantic" size="sm" className="mt-2 w-full rounded-xl" onClick={sendImage} disabled={sending}>
            <Send className="w-3 h-3 mr-1" /> Send Photo
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        {recording ? (
          <div className="flex-1 flex items-center gap-2 bg-destructive/10 rounded-xl px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-medium text-destructive">{formatRecTime(recordingTime)}</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
            <button onClick={stopRecording} className="bg-destructive text-destructive-foreground rounded-full p-1.5">
              <Square className="w-3 h-3" fill="currentColor" />
            </button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-2"
            >
              <Image className="w-5 h-5" />
            </button>
            <Input
              placeholder={`Message ${receiver}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="rounded-full bg-muted/50 border-none"
            />
            {newMessage.trim() ? (
              <Button
                variant="romantic"
                size="icon"
                className="rounded-full shrink-0 h-9 w-9"
                onClick={handleSend}
                disabled={sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <button
                onClick={startRecording}
                className="shrink-0 text-muted-foreground hover:text-primary transition-colors p-2"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
