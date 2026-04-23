import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { sessionsService } from "@/services/sessions";
import { matchingService } from "@/services/matching";
import { gamificationService } from "@/services/gamification";
import { notificationsService } from "@/services/notifications";
import { useAuthStore } from "@/stores/auth";
import { GlassCard } from "@/components/common/GlassCard";
import { PageHeader } from "@/components/common/PageHeader";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ScoreRing } from "@/components/common/ScoreRing";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CalendarDays, Sparkles, Trophy, Bell } from "lucide-react";
import dayjs from "dayjs";

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => sessionsService.list() });
  const matches = useQuery({ queryKey: ["matches"], queryFn: matchingService.list });
  const game = useQuery({ queryKey: ["gamification", "me"], queryFn: gamificationService.me });
  const notifs = useQuery({ queryKey: ["notifications"], queryFn: () => notificationsService.list() });

  const upcoming = (sessions.data?.results ?? [])
    .filter((s) => s.status === "confirmed" || s.status === "pending")
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);

  const pendingMatches = (matches.data?.results ?? []).filter((m) => m.status === "pending").slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.first_name ?? user?.username ?? ""} 👋`}
        description="Here's what's happening on your campus skill exchange."
        actions={
          <Button asChild className="shadow-glow"><Link to="/app/matching">Find a match <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard className="flex items-center gap-4">
          <ScoreRing value={(game.data?.xp ?? 0) / (game.data?.next_level_xp ?? 1)} size={68} label={`L${game.data?.level ?? "—"}`} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
            <p className="font-display text-xl font-bold">{game.data?.xp ?? 0} XP</p>
            <p className="text-xs text-muted-foreground">Next: {game.data?.next_level_xp ?? "—"} XP</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-accent grid place-items-center text-accent-foreground">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Reputation</p>
            <p className="font-display text-xl font-bold">{(game.data?.reputation ?? 0).toFixed(2)} ★</p>
            <p className="text-xs text-muted-foreground">{game.data?.badges.length ?? 0} badges</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary grid place-items-center text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending matches</p>
            <p className="font-display text-xl font-bold">{pendingMatches.length}</p>
            <p className="text-xs text-muted-foreground">Review and respond</p>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Upcoming sessions</h2>
            <Link to="/app/sessions" className="text-sm text-primary">See all</Link>
          </div>
          {sessions.isLoading ? (
            <LoadingGrid count={3} />
          ) : upcoming.length === 0 ? (
            <EmptyState title="No upcoming sessions" description="Book one from your matches." />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((s) => {
                const other = s.teacher.id === user?.id ? s.learner : s.teacher;
                return (
                  <li key={s.id}>
                    <Link to={`/app/sessions/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors">
                      <UserAvatar user={other} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{s.skill.name} with {other.full_name ?? other.username}</p>
                        <p className="text-xs text-muted-foreground">{dayjs(s.start).format("ddd, MMM D · h:mm A")}</p>
                      </div>
                      <Badge variant={s.status === "confirmed" ? "default" : "secondary"}>{s.status}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</h2>
            <Link to="/app/notifications" className="text-sm text-primary">All</Link>
          </div>
          {(notifs.data?.results ?? []).slice(0, 4).map((n) => (
            <div key={n.id} className="text-sm">
              <p className={n.read ? "text-muted-foreground" : "font-semibold"}>{n.title}</p>
              <p className="text-xs text-muted-foreground">{dayjs(n.created_at).fromNow()}</p>
            </div>
          ))}
          {(notifs.data?.results ?? []).length === 0 && <p className="text-sm text-muted-foreground">All caught up.</p>}
        </GlassCard>
      </div>

      <GlassCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Pending matches</h2>
          <Link to="/app/matching" className="text-sm text-primary">Browse all</Link>
        </div>
        {matches.isLoading ? (
          <LoadingGrid count={3} />
        ) : pendingMatches.length === 0 ? (
          <EmptyState title="No pending matches" description="Refresh matches to see new suggestions." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {pendingMatches.map((m) => (
              <div key={m.id} className="glass-subtle p-4 flex items-center gap-3">
                <UserAvatar user={m.user} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{m.user.full_name ?? m.user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.shared_skills.join(" · ")}</p>
                </div>
                <ScoreRing value={m.score} size={44} />
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
