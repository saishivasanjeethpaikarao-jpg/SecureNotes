import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Heart, Music, Video, MessageCircle, Play, Pause, SkipForward, Plus, Send, Star, Sparkles, BookHeart, X } from 'lucide-react';
import avatarAmmu from '@/assets/avatar-ammu.png';
import avatarNani from '@/assets/avatar-nani.png';

interface PlaylistItem {
  id: string;
  youtube_url: string;
  title: string;
  added_by: string;
  media_type: string;
  played: boolean;
  created_at: string;
}

interface RoomState {
  id: string;
  current_youtube_url: string | null;
  current_title: string | null;
  media_type: string | null;
  is_playing: boolean;
  current_time_seconds: number;
  updated_by: string | null;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  created_at: string;
}

type RoomActivity = 'idle' | 'music' | 'video' | 'chat';

const extractYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
  return match ? match[1] : null;
};

const TogetherRoom = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const partner = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [addType, setAddType] = useState<'music' | 'video'>('music');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [activity, setActivity] = useState<RoomActivity>('idle');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const ignoreNextUpdate = useRef(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const [stateRes, playlistRes, chatRes] = await Promise.all([
        supabase.from('together_room_state').select('*').limit(1).single(),
        supabase.from('together_playlist').select('*').order('created_at', { ascending: true }),
        supabase.from('together_chat').select('*').order('created_at', { ascending: true }).limit(50),
      ]);
      if (stateRes.data) {
        setRoomState(stateRes.data as RoomState);
        if (stateRes.data.current_youtube_url) {
          setActivity(stateRes.data.media_type === 'video' ? 'video' : 'music');
        }
      }
      if (playlistRes.data) setPlaylist(playlistRes.data as PlaylistItem[]);
      if (chatRes.data) setChatMessages(chatRes.data as ChatMessage[]);
    };
    fetchData();
  }, []);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('together-room')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'together_room_state' }, (payload) => {
        if (ignoreNextUpdate.current) {
          ignoreNextUpdate.current = false;
          return;
        }
        const newState = payload.new as RoomState;
        setRoomState(newState);
        if (newState.current_youtube_url) {
          setActivity(newState.media_type === 'video' ? 'video' : 'music');
        } else {
          setActivity('idle');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'together_chat' }, (payload) => {
        setChatMessages(prev => [...prev, payload.new as ChatMessage]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'together_playlist' }, () => {
        supabase.from('together_playlist').select('*').order('created_at', { ascending: true }).then(({ data }) => {
          if (data) setPlaylist(data as PlaylistItem[]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const updateRoomState = async (updates: Partial<RoomState>) => {
    if (!roomState) return;
    ignoreNextUpdate.current = true;
    const { error } = await supabase
      .from('together_room_state')
      .update({ ...updates, updated_by: currentUser, updated_at: new Date().toISOString() })
      .eq('id', roomState.id);
    if (error) {
      ignoreNextUpdate.current = false;
      toast({ title: 'Error', description: 'Failed to update room state', variant: 'destructive' });
    } else {
      setRoomState(prev => prev ? { ...prev, ...updates, updated_by: currentUser } as RoomState : prev);
    }
  };

  const handlePlayPause = () => {
    if (!roomState) return;
    updateRoomState({ is_playing: !roomState.is_playing });
  };

  const handlePlayItem = async (item: PlaylistItem) => {
    await updateRoomState({
      current_youtube_url: item.youtube_url,
      current_title: item.title,
      media_type: item.media_type,
      is_playing: true,
      current_time_seconds: 0,
    });
    setActivity(item.media_type === 'video' ? 'video' : 'music');
  };

  const handleSkip = async () => {
    const unplayed = playlist.filter(p => !p.played && p.youtube_url !== roomState?.current_youtube_url);
    if (unplayed.length > 0) {
      // Mark current as played
      if (roomState?.current_youtube_url) {
        const current = playlist.find(p => p.youtube_url === roomState.current_youtube_url);
        if (current) await supabase.from('together_playlist').update({ played: true }).eq('id', current.id);
      }
      await handlePlayItem(unplayed[0]);
    } else {
      toast({ title: 'No more songs', description: 'Add more to the playlist! 🎵' });
    }
  };

  const handleAddToPlaylist = async () => {
    if (!urlInput.trim() || !titleInput.trim()) return;
    const videoId = extractYouTubeId(urlInput);
    if (!videoId) {
      toast({ title: 'Invalid URL', description: 'Please enter a valid YouTube link', variant: 'destructive' });
      return;
    }
    await supabase.from('together_playlist').insert({
      youtube_url: urlInput.trim(),
      title: titleInput.trim(),
      added_by: currentUser!,
      media_type: addType,
    });
    setUrlInput('');
    setTitleInput('');
    setShowAddForm(false);
    toast({ title: 'Added! ✨', description: `${titleInput.trim()} added to playlist` });
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    await supabase.from('together_chat').insert({ sender: currentUser!, content: chatInput.trim() });
    setChatInput('');
  };

  const handleSaveMemory = async () => {
    if (!roomState?.current_title) return;
    const icon = activity === 'video' ? '🎬' : '🎵';
    const title = activity === 'video'
      ? `Watched "${roomState.current_title}" together`
      : `Listened to "${roomState.current_title}" together`;
    await supabase.from('memories').insert({
      title,
      icon,
      created_by: currentUser!,
      type: 'together',
      description: `${currentUser} & ${partner} in Together Room 💕`,
    });
    toast({ title: 'Memory saved! 💕', description: 'Added to your timeline' });
  };

  const youtubeId = roomState?.current_youtube_url ? extractYouTubeId(roomState.current_youtube_url) : null;
  const embedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=${roomState?.is_playing ? 1 : 0}&enablejsapi=1`
    : null;

  const activityLabels: Record<RoomActivity, { icon: string; label: string }> = {
    idle: { icon: '❤️', label: 'Together Room' },
    music: { icon: '🎧', label: 'Listening to music' },
    video: { icon: '🎬', label: 'Watching a video' },
    chat: { icon: '💬', label: 'Chatting' },
  };

  const currentActivity = activityLabels[showChat && activity === 'idle' ? 'chat' : activity];

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* Room Header */}
      <Card className="border-none shadow-card overflow-hidden">
        <div className="gradient-romantic p-4 relative overflow-hidden">
          {/* Floating decorations */}
          <div className="absolute top-2 right-4 animate-float opacity-50">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="absolute bottom-2 left-6 animate-float opacity-40" style={{ animationDelay: '1s' }}>
            <Star className="w-4 h-4 text-star" fill="currentColor" />
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <Avatar className="w-10 h-10 border-2 border-primary-foreground/50">
                  <AvatarImage src={avatarNani} alt="Nani" />
                  <AvatarFallback>N</AvatarFallback>
                </Avatar>
                <Avatar className="w-10 h-10 border-2 border-primary-foreground/50">
                  <AvatarImage src={avatarAmmu} alt="Ammu" />
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h2 className="text-lg font-bold text-primary-foreground font-romantic">
                  {currentActivity.icon} {currentActivity.label}
                </h2>
                <p className="text-primary-foreground/70 text-xs">Nani & Ammu 💕</p>
              </div>
            </div>
            {roomState?.current_title && (
              <Button size="sm" variant="ghost" onClick={handleSaveMemory} className="text-primary-foreground hover:bg-primary-foreground/10">
                <BookHeart className="w-4 h-4 mr-1" /> Save
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Controls */}
      <div className="flex gap-2">
        <Button
          variant={showAddForm && addType === 'music' ? 'romantic' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => { setAddType('music'); setShowAddForm(v => addType === 'music' ? !v : true); }}
        >
          <Music className="w-4 h-4 mr-1" /> Add Song
        </Button>
        <Button
          variant={showAddForm && addType === 'video' ? 'romantic' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => { setAddType('video'); setShowAddForm(v => addType === 'video' ? !v : true); }}
        >
          <Video className="w-4 h-4 mr-1" /> Watch Video
        </Button>
        <Button
          variant={showChat ? 'romantic' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setShowChat(v => !v)}
        >
          <MessageCircle className="w-4 h-4 mr-1" /> Chat
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="shadow-card border-primary/20 animate-in slide-in-from-top-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                {addType === 'music' ? '🎵 Add a Song' : '🎬 Add a Video'}
              </p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Input
              placeholder="YouTube URL"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Title"
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              className="text-sm"
            />
            <Button variant="romantic" size="sm" className="w-full" onClick={handleAddToPlaylist}>
              <Plus className="w-4 h-4 mr-1" /> Add to Playlist
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Player */}
      {youtubeId && (
        <Card className="shadow-card border-primary/20 overflow-hidden">
          <div className="aspect-video bg-foreground/5">
            <iframe
              ref={playerRef}
              key={youtubeId + (roomState?.is_playing ? '-play' : '-pause')}
              src={embedUrl!}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={roomState?.current_title || 'YouTube Player'}
            />
          </div>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{roomState?.current_title}</p>
                <p className="text-xs text-muted-foreground">
                  {roomState?.updated_by && `Controlled by ${roomState.updated_by}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handlePlayPause}>
                  {roomState?.is_playing
                    ? <Pause className="w-5 h-5 text-primary" fill="currentColor" />
                    : <Play className="w-5 h-5 text-primary" fill="currentColor" />
                  }
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleSkip}>
                  <SkipForward className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Playlist */}
      {playlist.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <Music className="w-4 h-4 text-primary" /> Shared Playlist ({playlist.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {playlist.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handlePlayItem(item)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm ${
                      roomState?.current_youtube_url === item.youtube_url
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {item.media_type === 'video' ? <Video className="w-3 h-3 shrink-0" /> : <Music className="w-3 h-3 shrink-0" />}
                    <span className="truncate flex-1">{item.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{item.added_by}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Chat */}
      {showChat && (
        <Card className="shadow-card border-primary/20">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-foreground">
              <MessageCircle className="w-4 h-4 text-primary" /> Room Chat 💬
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <ScrollArea className="h-48 mb-3">
              <div className="space-y-2 pr-2">
                {chatMessages.length === 0 && (
                  <p className="text-center text-muted-foreground text-xs py-8">
                    Start chatting while you enjoy together! 💕
                  </p>
                )}
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === currentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${
                      msg.sender === currentUser
                        ? 'gradient-romantic text-primary-foreground rounded-br-sm'
                        : 'bg-secondary text-secondary-foreground rounded-bl-sm'
                    }`}>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Say something sweet... 💕"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                className="text-sm"
              />
              <Button variant="romantic" size="icon" onClick={handleSendChat}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!youtubeId && playlist.length === 0 && (
        <Card className="shadow-card border-dashed border-primary/30">
          <CardContent className="p-8 text-center">
            <Heart className="w-12 h-12 text-primary mx-auto mb-3 animate-pulse" fill="currentColor" />
            <p className="font-romantic text-xl text-gradient-romantic mb-2">Welcome to Together Room</p>
            <p className="text-muted-foreground text-sm">
              Add a song or video to start your shared experience! 🎶
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TogetherRoom;
