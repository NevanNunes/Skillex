import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { toast } from "sonner";
import { matchingService } from "@/services/matching";
import { integrationsService } from "@/services/integrations";
import { sessionsService } from "@/services/sessions";
import { usersService } from "@/services/users";
import { useAuthStore } from "@/stores/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Match, OverlapWindow, SessionStatus, SkillSession } from "@/types/api";
import { reviewsService } from "@/services/reviews";

const statuses: (SessionStatus | "all")[] = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function Sessions() {
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions", filter],
    queryFn: () => sessionsService.list(filter === "all" ? undefined : filter),
  });
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ["matches", "accepted"],
    queryFn: matchingService.accepted,
  });

  const list = sessionsData?.results ?? [];
  const acceptedMatches = matchesData?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Sessions" description="Manage your upcoming and past sessions." />
      <ScheduleSection matches={acceptedMatches} loading={matchesLoading} />
      <div className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as SessionStatus | "all")}>
          <TabsList className="glass-subtle flex-wrap">
            {statuses.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        {sessionsLoading ? <LoadingGrid /> : list.length === 0 ? (
          <EmptyState title="No sessions" description="Book one from your matches to get started." />
        ) : (
          <div className="grid gap-3">
            {list.map((s) => <SessionRow key={s.id} session={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSection({ matches, loading }: { matches: Match[]; loading: boolean }) {
  if (loading) return <LoadingGrid />;

  if (matches.length === 0) {
    return (
      <GlassCard variant="strong" className="space-y-3">
        <div>
          <h3 className="font-display font-semibold">Schedule a session</h3>
          <p className="text-sm text-muted-foreground">
            Accepted matches will appear here so you can pick a shared slot or add a custom time when needed.
          </p>
        </div>
        <EmptyState title="No accepted matches yet" description="Once both people accept, you can schedule directly from here." />
      </GlassCard>
    );
  }

  return (
    <GlassCard variant="strong" className="space-y-4">
      <div>
        <h3 className="font-display font-semibold">Schedule a session</h3>
        <p className="text-sm text-muted-foreground">
          Pick one of the shared profile availability windows, or add a custom time if there is no overlap.
        </p>
      </div>
      <div className="grid gap-4">
        {matches.map((match) => (
          <ScheduleMatchCard key={match.id} match={match} />
        ))}
      </div>
    </GlassCard>
  );
}

function ScheduleMatchCard({ match }: { match: Match }) {
  const me = useAuthStore((s) => s.user);
  const counterpart = match.counterpart ?? (match.teacher.id === me?.id ? match.learner : match.teacher);

  if (!counterpart) return null;

  return (
    <div className="glass-subtle p-4 space-y-4">
      <div className="flex items-center gap-3">
        <UserAvatar user={counterpart} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold truncate">{counterpart.username}</p>
          <p className="text-xs text-muted-foreground truncate">{match.teach_skill.skill.name}</p>
        </div>
        <Badge variant="secondary" className="shrink-0">Accepted match</Badge>
      </div>
      <BookSessionForm match={match} counterpartId={counterpart.id} />
    </div>
  );
}

function BookSessionForm({ match, counterpartId }: { match: Match; counterpartId: string }) {
  const qc = useQueryClient();
  const { data: overlap, isLoading: overlapLoading } = useQuery({
    queryKey: ["overlap", match.id, counterpartId],
    queryFn: () => usersService.overlap(counterpartId, 14),
    enabled: Boolean(counterpartId),
  });

  const windows = overlap?.windows ?? [];
  const [windowIdx, setWindowIdx] = useState("0");
  const [customSlot, setCustomSlot] = useState(() => dayjs().add(1, "hour").startOf("hour").format("YYYY-MM-DDTHH:mm"));
  const [duration, setDuration] = useState("60");

  useEffect(() => {
    setWindowIdx("0");
  }, [match.id, windows.length]);

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const selectedWindow = windows[Number(windowIdx)];
      const scheduledAt = selectedWindow
        ? dayjs(selectedWindow.start).toISOString()
        : dayjs(customSlot).toISOString();

      const session = await sessionsService.book({
        match_id: match.id,
        scheduled_at: scheduledAt,
        duration_minutes: Number(duration),
      });

      try {
        const room = await integrationsService.dailyRoom(session.id);
        return { session, room };
      } catch {
        return { session };
      }
    },
    onSuccess: ({ room }) => {
      toast.success(room?.meeting_url ? "Session booked and video room created" : "Session booked");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      qc.invalidateQueries({ queryKey: ["matches", "accepted"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? "Could not schedule session"),
  });

  const usingSharedWindow = windows.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm">Book a session</p>
        <Badge variant={usingSharedWindow ? "secondary" : "outline"} className="text-xs">
          {usingSharedWindow ? "Shared availability" : "Custom time slot"}
        </Badge>
      </div>

      {overlapLoading ? (
        <p className="text-sm text-muted-foreground">Checking shared availability...</p>
      ) : usingSharedWindow ? (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Shared time</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={windowIdx}
              onChange={(e) => setWindowIdx(e.target.value)}
            >
              {windows.map((window: OverlapWindow, index: number) => (
                <option key={`${window.date}-${window.start}-${index}`} value={String(index)}>
                  {dayjs(window.start).format("ddd, MMM D · h:mm A")} - {dayjs(window.end).format("h:mm A")}
                  {window.mode ? ` · ${window.mode}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {[30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor={`custom-slot-${match.id}`}>Custom time</Label>
            <Input
              id={`custom-slot-${match.id}`}
              type="datetime-local"
              value={customSlot}
              onChange={(e) => setCustomSlot(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Duration</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              {[30, 45, 60, 90].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {usingSharedWindow
          ? "The room will be created automatically after booking the selected shared slot."
          : "No matching slot was found, so you can choose a custom online time instead."}
      </p>

      <Button className="w-full" onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending}>
        {scheduleMutation.isPending ? "Scheduling…" : "Schedule online session"}
      </Button>
    </div>
  );
}

function SessionRow({ session }: { session: SkillSession }) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const iAmTeacher = session.teacher === me?.id;
  const role = iAmTeacher ? "Teaching" : "Learning";

  const confirm = useMutation({
    mutationFn: () => sessionsService.confirm(session.id),
    onSuccess: () => { toast.success("Session confirmed"); qc.invalidateQueries({ queryKey: ["sessions"] }); },
  });
  const cancel = useMutation({
    mutationFn: () => sessionsService.cancel(session.id),
    onSuccess: () => { toast.message("Session cancelled"); qc.invalidateQueries({ queryKey: ["sessions"] }); },
  });
  const complete = useMutation({
    mutationFn: () => sessionsService.complete(session.id),
    onSuccess: () => { toast.success("Marked complete"); qc.invalidateQueries({ queryKey: ["sessions"] }); },
  });
  const joinRoom = useMutation({
    mutationFn: () => integrationsService.dailyRoom(session.id),
    onSuccess: ({ meeting_url }) => {
      if (meeting_url) {
        window.open(meeting_url, "_blank", "noopener,noreferrer");
      }
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.detail ?? "Could not open room"),
  });

  const variant: Record<SessionStatus, "default" | "secondary" | "destructive"> = {
    pending: "secondary", confirmed: "default", completed: "secondary", cancelled: "destructive",
  };

  return (
    <GlassCard className="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold truncate">Session on {dayjs(session.scheduled_at).format("MMM D")}</p>
          <Badge variant={variant[session.status]} className="capitalize">{session.status}</Badge>
          <Badge variant="secondary" className="text-xs">{role}</Badge>
          {session.meeting_url && <Badge variant="outline" className="text-xs">Video ready</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{dayjs(session.scheduled_at).format("ddd, MMM D · h:mm A")} · {session.duration_minutes} min</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline"><Link to={`/app/sessions/${session.id}`}>Open</Link></Button>
        {session.meeting_url && (
          <Button size="sm" variant="secondary" onClick={() => joinRoom.mutate()} disabled={joinRoom.isPending}>
            {joinRoom.isPending ? "Opening..." : "Join room"}
          </Button>
        )}
        {session.status === "pending" && <Button size="sm" onClick={() => confirm.mutate()}>Confirm</Button>}
        {(session.status === "pending" || session.status === "confirmed") && (
          <Button size="sm" variant="ghost" onClick={() => cancel.mutate()}>Cancel</Button>
        )}
        {session.status === "confirmed" && <Button size="sm" variant="secondary" onClick={() => complete.mutate()}>Complete</Button>}
        {session.status === "completed" && <ReviewDialog sessionId={session.id} />}
      </div>
    </GlassCard>
  );
}

function ReviewDialog({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submit = useMutation({
    mutationFn: () => reviewsService.create({ session_id: sessionId, rating, comment }),
    onSuccess: () => { toast.success("Review submitted"); setOpen(false); setComment(""); },
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm">Leave review</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>How was the session?</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
                className={n <= rating ? "text-warning text-2xl" : "text-muted-foreground/40 text-2xl"}
              >
                ★
              </button>
            ))}
          </div>
          <Textarea placeholder="What worked well?" value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
