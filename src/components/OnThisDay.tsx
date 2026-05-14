import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, ChevronRight } from 'lucide-react';

interface MemoryItem {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  image_urls: string[] | null;
  image_url: string | null;
  created_at_date: string;
  yearsAgo: number;
}

interface Props {
  onOpen?: () => void;
}

const OnThisDay = ({ onOpen }: Props) => {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const currentYear = today.getFullYear();

      // Fetch all memories — small dataset for a couple
      const { data, error } = await supabase
        .from('memories')
        .select('id, title, description, icon, image_urls, image_url, created_at_date')
        .order('created_at_date', { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const matches: MemoryItem[] = (data || [])
        .filter((m: any) => {
          if (!m.created_at_date) return false;
          const d = m.created_at_date as string; // yyyy-mm-dd
          const yr = parseInt(d.slice(0, 4), 10);
          return d.slice(5, 7) === mm && d.slice(8, 10) === dd && yr < currentYear;
        })
        .map((m: any) => ({
          ...m,
          yearsAgo: currentYear - parseInt(m.created_at_date.slice(0, 4), 10),
        }));

      setItems(matches);
      setLoading(false);
    };
    load();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="rounded-3xl p-4 border border-amber-300/40 bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-pink-950/30 shadow-romantic">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-amber-600" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
          On This Day
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {items.length} memor{items.length === 1 ? 'y' : 'ies'}
        </span>
      </div>
      <div className="space-y-2">
        {items.slice(0, 3).map((m) => {
          const photo = (m.image_urls && m.image_urls[0]) || m.image_url;
          return (
            <button
              key={m.id}
              onClick={onOpen}
              className="w-full flex items-center gap-3 p-2 rounded-2xl bg-white/70 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 transition-all active:scale-[0.98] text-left"
            >
              {photo ? (
                <img src={photo} alt={m.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-pink-200/60 flex items-center justify-center text-2xl shrink-0">
                  {m.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {m.yearsAgo} year{m.yearsAgo > 1 ? 's' : ''} ago today 💖
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OnThisDay;