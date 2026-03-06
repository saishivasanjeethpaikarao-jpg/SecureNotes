import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface StarRecord {
  id: string;
  giver: string;
  receiver: string;
  value: number;
  reason: string;
  message?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  username: string;
  milestone_value: number;
  reached_at: string;
  gift_given: boolean;
}

export interface Totals {
  nani_total: number;
  ammu_total: number;
}

export const useStarData = () => {
  const [totals, setTotals] = useState<Totals>({ nani_total: 0, ammu_total: 0 });
  const [stars, setStars] = useState<StarRecord[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [totalsRes, starsRes, milestonesRes] = await Promise.all([
      supabase.from('totals').select('*').single(),
      supabase.from('stars').select('*').order('created_at', { ascending: false }),
      supabase.from('milestones').select('*').order('milestone_value', { ascending: true }),
    ]);
    if (totalsRes.data) setTotals(totalsRes.data);
    if (starsRes.data) setStars(starsRes.data);
    if (milestonesRes.data) setMilestones(milestonesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    const channel = supabase
      .channel('realtime-stars')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stars' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'totals' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones' }, () => fetchAll())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const giveStar = async (giver: string, receiver: string, value: number, reason: string, message?: string) => {
    // Insert star record
    const { error: starErr } = await supabase.from('stars').insert({
      giver, receiver, value, reason, message,
    });
    if (starErr) throw starErr;

    // Update totals
    const column = receiver === 'Nani' ? 'nani_total' : 'ammu_total';
    const newTotal = (receiver === 'Nani' ? totals.nani_total : totals.ammu_total) + value;
    const { error: totalErr } = await supabase
      .from('totals')
      .update({ [column]: newTotal })
      .eq('id', (await supabase.from('totals').select('id').single()).data?.id);
    if (totalErr) throw totalErr;

    // Check milestones
    if (newTotal > 0) {
      const nextMilestone = Math.floor(newTotal / 50) * 50;
      if (nextMilestone >= 50 && newTotal >= nextMilestone) {
        // Check all milestones up to current
        for (let m = 50; m <= nextMilestone; m += 50) {
          const existing = milestones.find(ms => ms.username === receiver && ms.milestone_value === m);
          if (!existing) {
            await supabase.from('milestones').insert({
              username: receiver,
              milestone_value: m,
            });
          }
        }
      }
    }

    await fetchAll();
    return newTotal;
  };

  return { totals, stars, milestones, loading, giveStar, fetchAll };
};
