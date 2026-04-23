import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gamificationService } from "@/services/gamification";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { LoadingGrid } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const [scope, setScope] = useState<"global" | "campus">("global");
  const { data, isLoading } = useQuery({ queryKey: ["leaderboard"], queryFn: gamificationService.leaderboard });

  return (
    <div>
      <PageHeader title="Leaderboard" description="Top contributors across SkillEX." />
      <Tabs value={scope} onValueChange={(v) => setScope(v as "global" | "campus")}>
        <TabsList className="glass-subtle">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="campus">My campus</TabsTrigger>
        </TabsList>
      </Tabs>
      <GlassCard className="mt-4 divide-y divide-border/50">
        {isLoading ? <LoadingGrid count={4} /> : (data ?? []).map((e) => (
          <div key={e.user.id} className={cn("flex items-center gap-3 py-3 first:pt-0 last:pb-0", e.is_me && "bg-primary/10 -mx-2 px-2 rounded-xl")}>
            <span className="font-display font-bold w-6 text-center text-muted-foreground">#{e.rank}</span>
            <UserAvatar user={e.user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{e.user.full_name ?? e.user.username} {e.is_me && <span className="text-primary text-xs">(you)</span>}</p>
              <p className="text-xs text-muted-foreground">Level {e.level}</p>
            </div>
            <span className="font-display font-bold">{e.xp} XP</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
