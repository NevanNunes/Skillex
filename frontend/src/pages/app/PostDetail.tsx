import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communityService } from "@/services/community";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowBigUp, ArrowBigDown, Check } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";

export default function PostDetail() {
  const { id } = useParams();
  const pid = Number(id);
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const post = useQuery({ queryKey: ["post", pid], queryFn: () => communityService.post(pid) });
  const comments = useQuery({ queryKey: ["post", pid, "comments"], queryFn: () => communityService.comments(pid) });
  const [draft, setDraft] = useState("");

  const votePost = useMutation({
    mutationFn: (value: -1 | 0 | 1) => communityService.votePost(pid, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", pid] }),
  });
  const addComment = useMutation({
    mutationFn: () => communityService.createComment(pid, { body: draft }),
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["post", pid, "comments"] }); },
  });
  const voteComment = useMutation({
    mutationFn: ({ cid, value }: { cid: number; value: -1 | 0 | 1 }) => communityService.voteComment(pid, cid, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", pid, "comments"] }),
  });
  const accept = useMutation({
    mutationFn: (cid: number) => communityService.acceptComment(pid, cid),
    onSuccess: () => { toast.success("Marked as accepted answer"); qc.invalidateQueries({ queryKey: ["post", pid] }); qc.invalidateQueries({ queryKey: ["post", pid, "comments"] }); },
  });

  if (post.isLoading || !post.data) return <LoadingGrid count={2} />;
  const p = post.data;
  const isAuthor = p.author.id === me?.id;

  return (
    <div className="space-y-4">
      <PageHeader title={p.title} description={p.community_name} />
      <GlassCard className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <button aria-label="Upvote" onClick={() => votePost.mutate(p.user_vote === 1 ? 0 : 1)}>
            <ArrowBigUp className={p.user_vote === 1 ? "fill-primary text-primary" : "text-muted-foreground"} />
          </button>
          <span className="font-semibold">{p.score}</span>
          <button aria-label="Downvote" onClick={() => votePost.mutate(p.user_vote === -1 ? 0 : -1)}>
            <ArrowBigDown className={p.user_vote === -1 ? "fill-destructive text-destructive" : "text-muted-foreground"} />
          </button>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="capitalize">{p.type}</Badge>
            <span className="text-xs text-muted-foreground">{dayjs(p.created_at).format("MMM D, YYYY")}</span>
          </div>
          <p className="whitespace-pre-wrap">{p.body}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <UserAvatar user={p.author} size="xs" />
            <span>{p.author.full_name ?? p.author.username}</span>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3">
        <h2 className="font-display font-semibold">{(comments.data?.results ?? []).length} comments</h2>
        <GlassCard className="space-y-2">
          <Textarea placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
          <div className="flex justify-end">
            <Button onClick={() => draft.trim() && addComment.mutate()} disabled={!draft.trim() || addComment.isPending}>Comment</Button>
          </div>
        </GlassCard>
        {(comments.data?.results ?? []).map((c) => (
          <GlassCard key={c.id} className={c.is_accepted ? "border-success/40" : undefined}>
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <button aria-label="Upvote" onClick={() => voteComment.mutate({ cid: c.id, value: c.user_vote === 1 ? 0 : 1 })}>
                  <ArrowBigUp className={c.user_vote === 1 ? "fill-primary text-primary" : "text-muted-foreground"} />
                </button>
                <span className="text-sm font-semibold">{c.score}</span>
                <button aria-label="Downvote" onClick={() => voteComment.mutate({ cid: c.id, value: c.user_vote === -1 ? 0 : -1 })}>
                  <ArrowBigDown className={c.user_vote === -1 ? "fill-destructive text-destructive" : "text-muted-foreground"} />
                </button>
              </div>
              <div className="flex-1">
                {c.is_accepted && <Badge className="bg-success/15 text-success mb-2"><Check className="h-3 w-3 mr-1" />Accepted answer</Badge>}
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={c.author} size="xs" />
                    <span>{c.author.full_name ?? c.author.username}</span>
                    <span>· {dayjs(c.created_at).fromNow()}</span>
                  </div>
                  {isAuthor && p.type === "question" && !c.is_accepted && (
                    <Button size="sm" variant="ghost" onClick={() => accept.mutate(c.id)}>Mark as answer</Button>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
