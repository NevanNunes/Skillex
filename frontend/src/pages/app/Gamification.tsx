import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { gamificationService } from "@/services/gamification";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { ScoreRing } from "@/components/common/ScoreRing";
import { LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Award, Trophy } from "lucide-react";
import dayjs from "dayjs";

export default function Gamification() {
  const me = useQuery({ queryKey: ["gamification", "me"], queryFn: gamificationService.me });
  const history = useQuery({ queryKey: ["gamification", "xp-history"], queryFn: gamificationService.xpHistory });
  const badges = useQuery({ queryKey: ["gamification", "badges"], queryFn: gamificationService.badges });

  if (me.isLoading || !me.data) return <LoadingGrid />;

  const xp = me.data.xp;
  const nextLevelXp = (me.data.teacher_level + 1) * 500; // approximate
  const pct = xp / nextLevelXp;

  return (
    <div className="space-y-6">
      <PageHeader title="XP & Badges" description="Track your progress, milestones, and reputation."
        actions={<Button asChild variant="outline"><Link to="/app/leaderboard">Leaderboard</Link></Button>} />
      <GlassCard variant="strong" className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing value={pct} size={120} label={`L${me.data.teacher_level}`} />
        <div className="flex-1 space-y-1">
          <p className="font-display text-2xl font-bold">{xp} XP</p>
          <p className="text-sm text-muted-foreground">Teacher Lv {me.data.teacher_level} · Learner Lv {me.data.learner_level}</p>
          <p className="text-sm text-muted-foreground">~{nextLevelXp - xp} XP to next level</p>
        </div>
      </GlassCard>

      <section>
        <h2 className="font-display font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Badges</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-3 stagger">
          {(badges.data ?? []).map((ub) => (
            <GlassCard key={ub.id} className="text-center space-y-2">
              <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-accent grid place-items-center text-accent-foreground">
                <Trophy className="h-6 w-6" />
              </div>
              <p className="font-display font-semibold">{ub.badge.name}</p>
              <p className="text-xs text-muted-foreground">{ub.badge.description}</p>
              <p className="text-[10px] text-muted-foreground">{dayjs(ub.awarded_at).format("MMM D, YYYY")}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">XP history</h2>
        <GlassCard className="divide-y divide-border/50">
          {(history.data?.results ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{e.action}</p>
                <p className="text-xs text-muted-foreground">{dayjs(e.created_at).format("MMM D · h:mm A")}</p>
              </div>
              <span className="font-display font-bold text-primary">+{e.xp_amount}</span>
            </div>
          ))}
        </GlassCard>
      </section>
    </div>
  );
}
