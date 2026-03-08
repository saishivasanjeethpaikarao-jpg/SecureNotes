import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GiftTracker from '@/components/GiftTracker';
import StarHistory from '@/components/StarHistory';
import { Totals, StarRecord, Milestone } from '@/hooks/useStarData';

interface Props {
  totals: Totals;
  stars: StarRecord[];
  milestones: Milestone[];
}

const HistoryScreen = ({ totals, stars, milestones }: Props) => {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="history" className="rounded-xl py-2.5 text-sm font-semibold">
            ⭐ Star History
          </TabsTrigger>
          <TabsTrigger value="gifts" className="rounded-xl py-2.5 text-sm font-semibold">
            🎁 Gift Milestones
          </TabsTrigger>
        </TabsList>
        <TabsContent value="history" className="mt-4">
          <StarHistory stars={stars} />
        </TabsContent>
        <TabsContent value="gifts" className="mt-4">
          <GiftTracker totals={totals} milestones={milestones} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HistoryScreen;
