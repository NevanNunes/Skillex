import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { sessionsService } from "@/services/sessions";
import { useAuthStore } from "@/stores/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import dayjs from "dayjs";
import { toast } from "sonner";
import type { SessionStatus, SkillSession } from "@/types/api";
import { reviewsService } from "@/services/reviews";

const statuses: (SessionStatus | "all")[] = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function Sessions() {
  const [filter, setFilter] = useState<SessionStatus | "all">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["sessions", filter],
    queryFn: () => sessionsService.list(filter === "all" ? undefined : filter),
  });
  const list = data?.results ?? [];
  return (
    <div>
      <PageHeader title="Sessions" description="Manage your upcoming and past sessions." />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as SessionStatus | "all")}>
        <TabsList className="glass-subtle flex-wrap">
          {statuses.map((s) => <TabsTrigger key={s} value={s} className="capitalize">{s}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <div className="mt-4">
        {isLoading ? <LoadingGrid /> : list.length === 0 ? (
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

function SessionRow({ session }: { session: SkillSession }) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const other = session.teacher.id === me?.id ? session.learner : session.teacher;
  const role = session.teacher.id === me?.id ? "Teaching" : "Learning";

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

  const variant: Record<SessionStatus, "default" | "secondary" | "destructive"> = {
    pending: "secondary", confirmed: "default", completed: "secondary", cancelled: "destructive",
  };

  return (
    <GlassCard className="flex flex-col sm:flex-row sm:items-center gap-4">
      <UserAvatar user={other} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold truncate">{session.skill.name} with {other.full_name ?? other.username}</p>
          <Badge variant={variant[session.status]} className="capitalize">{session.status}</Badge>
          <Badge variant="secondary" className="text-xs">{role}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{dayjs(session.start).format("ddd, MMM D · h:mm A")} – {dayjs(session.end).format("h:mm A")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline"><Link to={`/app/sessions/${session.id}`}>Open</Link></Button>
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

function ReviewDialog({ sessionId }: { sessionId: number }) {
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
            {[1,2,3,4,5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}
                className={n <= rating ? "text-warning text-2xl" : "text-muted-foreground/40 text-2xl"}>★</button>
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
