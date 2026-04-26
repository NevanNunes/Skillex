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
import type { Comment, Paginated, Post } from "@/types/api";

export default function PostDetail() {
  const { id } = useParams();
  const pid = id ?? "";
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const post = useQuery({ queryKey: ["post", pid], queryFn: () => communityService.post(pid) });
  const comments = useQuery({
    queryKey: ["post", pid, "comments"],
    queryFn: () => communityService.comments(pid),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });
  const [draft, setDraft] = useState("");

  const votePost = useMutation({
    mutationFn: (vt: "upvote" | "downvote") => communityService.votePost(pid, vt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", pid] }),
  });
  const addComment = useMutation({
    mutationFn: () => communityService.createComment(pid, { body: draft }),
    onMutate: async () => {
      const content = draft.trim();
      if (!content || !me) return;

      await qc.cancelQueries({ queryKey: ["post", pid, "comments"] });
      await qc.cancelQueries({ queryKey: ["post", pid] });

      const optimisticComment: Comment = {
        id: `optimistic-${Date.now()}`,
        post: pid,
        author: { id: me.id, username: me.username, avatar: me.avatar ?? null },
        body: content,
        parent_comment: null,
        upvotes: 0,
        downvotes: 0,
        net_votes: 0,
        replies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      qc.setQueryData<Paginated<Comment>>(["post", pid, "comments"], (prev) => {
        if (!prev) {
          return { count: 1, next: null, previous: null, results: [optimisticComment] };
        }
        return {
          ...prev,
          count: prev.count + 1,
          results: [optimisticComment, ...prev.results],
        };
      });

      qc.setQueryData<Post>(["post", pid], (prev) => {
        if (!prev) return prev;
        return { ...prev, comment_count: prev.comment_count + 1 };
      });
    },
    onSuccess: (newComment) => {
      setDraft("");

      qc.setQueryData<Paginated<Comment>>(["post", pid, "comments"], (prev) => {
        if (!prev) return { count: 1, next: null, previous: null, results: [newComment] };

        const withoutOptimistic = prev.results.filter((comment) => !comment.id.startsWith("optimistic-"));
        return {
          ...prev,
          count: withoutOptimistic.length + 1,
          results: [newComment, ...withoutOptimistic],
        };
      });
    },
    onSettled: () => {
      // Background sync to ensure consistency with backend ordering/rules.
      qc.invalidateQueries({ queryKey: ["post", pid, "comments"] });
      qc.invalidateQueries({ queryKey: ["post", pid] });
    },
  });
  const voteComment = useMutation({
    mutationFn: ({ cid, vt }: { cid: string; vt: "upvote" | "downvote" }) => communityService.voteComment(pid, cid, vt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post", pid, "comments"] }),
  });
  const accept = useMutation({
    mutationFn: (cid: string) => communityService.acceptComment(pid, cid),
    onSuccess: () => { toast.success("Accepted"); qc.invalidateQueries({ queryKey: ["post", pid] }); },
  });

  if (post.isLoading || !post.data) return <LoadingGrid count={2} />;
  const p = post.data;
  const isAuthor = p.author.id === me?.id;

  return (
    <div className="space-y-4">
      <PageHeader title={p.title} />
      <GlassCard className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => votePost.mutate("upvote")}><ArrowBigUp className={p.user_vote === "upvote" ? "fill-primary text-primary" : "text-muted-foreground"} /></button>
          <span className="font-semibold">{p.net_votes}</span>
          <button onClick={() => votePost.mutate("downvote")}><ArrowBigDown className={p.user_vote === "downvote" ? "fill-destructive text-destructive" : "text-muted-foreground"} /></button>
        </div>
        <div className="flex-1">
          <Badge variant="secondary" className="capitalize mb-2">{p.post_type}</Badge>
          <p className="whitespace-pre-wrap">{p.body}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <UserAvatar user={p.author} size="xs" /><span>{p.author.username}</span>
            <span>{dayjs(p.created_at).format("MMM D, YYYY")}</span>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="space-y-2">
        <Textarea placeholder="Add a comment…" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
        <div className="flex justify-end"><Button onClick={() => draft.trim() && addComment.mutate()} disabled={!draft.trim()}>Comment</Button></div>
      </GlassCard>

      {(comments.data?.results ?? []).map((c) => {
        const accepted = p.accepted_comment === c.id;
        return (
          <GlassCard key={c.id} className={accepted ? "border-success/40" : undefined}>
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <button onClick={() => voteComment.mutate({ cid: c.id, vt: "upvote" })}><ArrowBigUp className="text-muted-foreground" /></button>
                <span className="text-sm font-semibold">{c.net_votes}</span>
                <button onClick={() => voteComment.mutate({ cid: c.id, vt: "downvote" })}><ArrowBigDown className="text-muted-foreground" /></button>
              </div>
              <div className="flex-1">
                {accepted && <Badge className="bg-success/15 text-success mb-2"><Check className="h-3 w-3 mr-1" />Accepted</Badge>}
                <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <UserAvatar user={c.author} size="xs" /><span>{c.author.username}</span>
                  </div>
                  {isAuthor && p.post_type === "question" && !accepted && (
                    <Button size="sm" variant="ghost" onClick={() => accept.mutate(c.id)}>Mark answer</Button>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
