import { useQuery } from "@tanstack/react-query";
import { gamificationService } from "@/services/gamification";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { LoadingGrid } from "@/components/common/States";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { useAuthStore } from "@/stores/auth";

export default function Leaderboard() {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: () => gamificationService.leaderboard() });

  if (isLoading) return <LoadingGrid />;
  const entries = data?.leaderboard ?? [];
  const myRank = data?.current_user_rank;

  return (
    <div>
      <PageHeader title="Leaderboard" description="See who's leading the campus skill exchange." />
      {myRank && (
        <GlassCard variant="strong" className="mb-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-primary" />
          <p className="font-display font-semibold">Your rank: #{myRank}</p>
        </GlassCard>
      )}
      <GlassCard className="divide-y divide-border/50">
        {entries.map((entry) => {
          const isMe = me?.id === entry.user.id;
          return (
            <div key={entry.rank} className={`flex items-center gap-4 py-3 first:pt-0 last:pb-0 ${isMe ? "bg-primary/5 -mx-4 px-4 rounded-xl" : ""}`}>
              <span className="font-display font-bold text-lg w-8 text-center">{entry.rank}</span>
              <UserAvatar user={{ id: entry.user.id, username: entry.user.username, avatar: entry.user.avatar }} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.user.username}{isMe && <Badge className="ml-2">You</Badge>}</p>
                <p className="text-xs text-muted-foreground">Level {entry.level}</p>
              </div>
              <div className="text-right">
                <p className="font-display font-bold text-primary">{entry.xp}</p>
                <p className="text-[10px] text-muted-foreground">XP</p>
              </div>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
}
