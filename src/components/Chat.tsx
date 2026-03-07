import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Heart } from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  content: string;
  created_at: string;
}

const Chat = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const receiver = currentUser === 'Nani' ? 'Ammu' : 'Nani';

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
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

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return;
    setSending(true);
    await supabase.from('messages').insert({
      sender: currentUser,
      receiver,
      content: newMessage.trim(),
    });
    setNewMessage('');
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-5 h-5 text-primary" fill="currentColor" />
        <h2 className="text-xl font-bold text-foreground">Chat with {receiver}</h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-2 pr-1">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No messages yet 💕 Say something sweet!</p>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender === currentUser;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-card text-foreground shadow-card rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-3 border-t border-border">
        <Input
          placeholder={`Message ${receiver}... 💕`}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="rounded-xl"
        />
        <Button
          variant="romantic"
          size="icon"
          className="rounded-xl shrink-0"
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default Chat;
