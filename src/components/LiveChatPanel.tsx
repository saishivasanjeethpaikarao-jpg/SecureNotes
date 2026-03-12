import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Send, X, MessageCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  created_at: string;
  type: string;
}

interface LiveChatPanelProps {
  currentUser: string;
  partner: string;
  visible: boolean;
  onClose: () => void;
}

const LiveChatPanel = ({ currentUser, partner, visible, onClose }: LiveChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data as Message[]);
    };

    fetchMessages();

    const channel = supabase
      .channel('live-chat-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message;
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [messages.length, visible]);

  const handleSend = useCallback(async () => {
    const text = newMsg.trim();
    if (!text || sending) return;
    setSending(true);
    setNewMsg('');

    await supabase.from('messages').insert({
      sender: currentUser,
      receiver: partner,
      content: text,
      type: 'text',
    });

    setSending(false);
  }, [newMsg, sending, currentUser, partner]);

  if (!visible) return null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 z-20 flex flex-col animate-in slide-in-from-right duration-300"
      style={{
        width: '300px',
        maxWidth: '80vw',
        background: 'rgba(11, 15, 42, 0.95)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: '#93b4f8' }} />
          <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Live Chat</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
          <X className="w-4 h-4" style={{ color: '#7b8ab8' }} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.filter(m => m.type === 'text' || m.type === 'system').slice(-30).map((msg) => {
          const isMe = msg.sender === currentUser;
          const isSystem = msg.type === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: '#7b8ab8', background: 'rgba(255,255,255,0.05)' }}>
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] px-3 py-1.5 rounded-2xl text-xs"
                style={{
                  background: isMe ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  borderBottomRightRadius: isMe ? '4px' : undefined,
                  borderBottomLeftRadius: !isMe ? '4px' : undefined,
                }}
              >
                {!isMe && (
                  <span className="text-[10px] font-semibold block mb-0.5" style={{ color: '#93b4f8' }}>
                    {msg.sender}
                  </span>
                )}
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Message..."
            className="flex-1 bg-transparent border rounded-full px-3 py-1.5 text-xs outline-none"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              color: '#e2e8f0',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMsg.trim() || sending}
            className="p-2 rounded-full transition-colors"
            style={{
              background: newMsg.trim() ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.05)',
              color: newMsg.trim() ? '#fff' : '#4a5580',
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChatPanel;
