import { useState } from 'react';
import { StarRecord } from '@/hooks/useStarData';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  stars: StarRecord[];
}

const StarHistory = ({ stars }: Props) => {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...stars].sort((a, b) =>
    sortAsc
      ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" /> Star History
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setSortAsc(!sortAsc)}>
          {sortAsc ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
          {sortAsc ? 'Oldest' : 'Newest'}
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.map((star) => (
          <div key={star.id} className="bg-card rounded-2xl p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className={`text-2xl mt-0.5 ${star.value > 0 ? '' : ''}`}>
                {star.value > 0 ? '⭐' : '💔'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-sm">
                  <span className="font-semibold text-foreground">{star.giver}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold text-foreground">{star.receiver}</span>
                  <span className={`ml-auto font-bold ${star.value > 0 ? 'text-star' : 'text-destructive'}`}>
                    {star.value > 0 ? '+1' : '-1'}
                  </span>
                </div>
                <p className="text-foreground mt-1">{star.reason}</p>
                {star.message && (
                  <p className="text-muted-foreground text-sm mt-1 italic">"{star.message}"</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(star.created_at), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No history yet 💕</p>
        )}
      </div>
    </div>
  );
};

export default StarHistory;
