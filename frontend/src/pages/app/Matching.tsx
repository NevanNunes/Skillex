import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchingService } from "@/services/matching";
import { sessionsService } from "@/services/sessions";
import { usersService } from "@/services/users";
import { skillsService } from "@/services/skills";
import { GlassCard } from "@/components/common/GlassCard";
import { PageHeader } from "@/components/common/PageHeader";
import { UserAvatar } from "@/components/common/UserAvatar";
import { ScoreRing } from "@/components/common/ScoreRing";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import type { Match } from "@/types/api";

export default function Matching() {
  return (
    <div>
      <PageHeader title="Matching" description="Find peers to teach and learn with." />
      <Tabs defaultValue="rule">
        <TabsList className="glass-subtle">
          <TabsTrigger value="rule">Rule-based</TabsTrigger>
          <TabsTrigger value="semantic">Semantic</TabsTrigger>
        </TabsList>
        <TabsContent value="rule" className="mt-4"><RuleMatches /></TabsContent>
        <TabsContent value="semantic" className="mt-4"><SemanticMatches /></TabsContent>
      </Tabs>
    </div>
  );
}

function RuleMatches() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["matches"], queryFn: matchingService.list });
  const refresh = useMutation({
    mutationFn: matchingService.refresh,
    onSuccess: () => { toast.success("Matches refreshed"); qc.invalidateQueries({ queryKey: ["matches"] }); refetch(); },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      <MatchGrid matches={data?.results ?? []} loading={isLoading} />
    </div>
  );
}

function SemanticMatches() {
  const [threshold, setThreshold] = useState(0.7);
  const { data, isLoading } = useQuery({
    queryKey: ["matches", "semantic", threshold],
    queryFn: () => matchingService.semantic(threshold),
  });
  const fellBack = (data?.results ?? []).length === 0;
  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="font-semibold">Similarity threshold: {threshold.toFixed(2)}</p>
          <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={0.5} max={0.95} step={0.05} className="mt-2" />
        </div>
        {fellBack && <Badge variant="secondary" className="bg-warning/15 text-warning">Fallback: lower threshold</Badge>}
      </GlassCard>
      <MatchGrid matches={data?.results ?? []} loading={isLoading} />
    </div>
  );
}

function MatchGrid({ matches, loading }: { matches: Match[]; loading: boolean }) {
  if (loading) return <LoadingGrid />;
  if (matches.length === 0) return <EmptyState title="No matches yet" description="Try refreshing or expand your skills." />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
      {matches.map((m) => <MatchCard key={m.id} match={m} />)}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const qc = useQueryClient();
  const accept = useMutation({
    mutationFn: () => matchingService.accept(match.id),
    onSuccess: () => { toast.success("Match accepted"); qc.invalidateQueries({ queryKey: ["matches"] }); },
  });
  const reject = useMutation({
    mutationFn: () => matchingService.reject(match.id),
    onSuccess: () => { toast.message("Match dismissed"); qc.invalidateQueries({ queryKey: ["matches"] }); },
  });
  return (
    <GlassCard className="space-y-4 hover:shadow-elevated transition-shadow">
      <div className="flex items-center gap-3">
        <UserAvatar user={match.user} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold truncate">{match.user.full_name ?? match.user.username}</p>
          <p className="text-xs text-muted-foreground truncate">{match.user.university}</p>
        </div>
        <ScoreRing value={match.score} size={52} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {match.shared_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
      </div>
      <div className="flex items-center gap-2">
        <MentorPreviewSheet match={match}>
          <Button variant="outline" size="sm" className="flex-1">View profile</Button>
        </MentorPreviewSheet>
        {match.status === "pending" ? (
          <>
            <Button size="sm" className="flex-1" onClick={() => accept.mutate()}><Check className="h-4 w-4 mr-1" />Accept</Button>
            <Button size="sm" variant="ghost" onClick={() => reject.mutate()} aria-label="Reject"><X className="h-4 w-4" /></Button>
          </>
        ) : (
          <Badge>{match.status}</Badge>
        )}
      </div>
    </GlassCard>
  );
}

function MentorPreviewSheet({ match, children }: { match: Match; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Mentor preview</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <UserAvatar user={match.user} size="lg" />
            <div>
              <p className="font-display font-semibold">{match.user.full_name ?? match.user.username}</p>
              <p className="text-xs text-muted-foreground">{match.user.university}</p>
            </div>
          </div>
          <p className="text-sm">{match.user.bio}</p>
          <div className="flex flex-wrap gap-1.5">
            {match.shared_skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
          </div>
          <BookSessionForm match={match} onDone={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BookSessionForm({ match, onDone }: { match: Match; onDone: () => void }) {
  const qc = useQueryClient();
  const { data: overlap } = useQuery({
    queryKey: ["overlap", match.user.id],
    queryFn: () => usersService.overlap(match.user.id),
  });
  const { data: skills } = useQuery({ queryKey: ["skills", "all"], queryFn: () => skillsService.search() });
  const [windowIdx, setWindowIdx] = useState("0");
  const [duration, setDuration] = useState("60");
  const [skillId, setSkillId] = useState("");

  const book = useMutation({
    mutationFn: () => {
      const w = (overlap ?? [])[Number(windowIdx)];
      const start = dayjs(w.start).toISOString();
      const end = dayjs(start).add(Number(duration), "minute").toISOString();
      return sessionsService.book({ teacher_id: match.user.id, skill_id: Number(skillId), start, end });
    },
    onSuccess: () => {
      toast.success("Session booked");
      qc.invalidateQueries({ queryKey: ["sessions"] });
      onDone();
    },
  });

  return (
    <div className="glass-subtle p-4 space-y-3">
      <p className="font-semibold text-sm">Book a session</p>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Skill</p>
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger><SelectValue placeholder="Pick a skill" /></SelectTrigger>
          <SelectContent>{(skills ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">When</p>
        <Select value={windowIdx} onValueChange={setWindowIdx}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(overlap ?? []).map((w, i) => (
              <SelectItem key={i} value={String(i)}>{dayjs(w.start).format("ddd MMM D, h:mm A")} – {dayjs(w.end).format("h:mm A")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Duration</p>
        <Select value={duration} onValueChange={setDuration}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["30","45","60","90"].map((m) => <SelectItem key={m} value={m}>{m} min</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button className="w-full" onClick={() => skillId && book.mutate()} disabled={!skillId || book.isPending}>
        {book.isPending ? "Booking…" : "Book session"}
      </Button>
    </div>
  );
}
