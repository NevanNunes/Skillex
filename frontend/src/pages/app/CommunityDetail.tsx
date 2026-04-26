import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communityService } from "@/services/community";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowBigUp, ArrowBigDown, Plus, MessageSquare } from "lucide-react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Comment, Paginated, Post, PostSort, PostType } from "@/types/api";
import { useAuthStore } from "@/stores/auth";

export default function CommunityDetail() {
  const { id } = useParams();
  const cid = id ?? "";
  const qc = useQueryClient();
  const [sort, setSort] = useState<PostSort>("new");
  const community = useQuery({ queryKey: ["community", cid], queryFn: () => communityService.detail(cid) });
  const posts = useQuery({ queryKey: ["community", cid, "posts", sort], queryFn: () => communityService.posts(cid, sort) });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<PostType>("discussion");
  const create = useMutation({
    mutationFn: () => communityService.createPost(cid, { title, body, post_type: type }),
    onSuccess: () => { toast.success("Posted"); setOpen(false); setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["community", cid, "posts"] }); },
  });

  return (
    <div>
      <PageHeader
        title={community.data?.name ?? "Community"}
        description={community.data?.description}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="shadow-glow"><Plus className="h-4 w-4 mr-1" />New post</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New post</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Select value={type} onValueChange={(v) => setType(v as PostType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="discussion">Discussion</SelectItem><SelectItem value="question">Question</SelectItem><SelectItem value="resource">Resource</SelectItem></SelectContent>
                </Select>
                <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
              </div>
              <DialogFooter><Button onClick={() => title && create.mutate()} disabled={!title || create.isPending}>Post</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Tabs value={sort} onValueChange={(v) => setSort(v as PostSort)}>
        <TabsList className="glass-subtle">
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="top">Top</TabsTrigger>
          <TabsTrigger value="hot">Hot</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4 space-y-3">
        {posts.isLoading ? <LoadingGrid /> : (posts.data?.results ?? []).length === 0 ? (
          <EmptyState title="No posts yet" description="Be the first to start a discussion." />
        ) : (posts.data?.results ?? []).map((p) => (
          <CommunityPostCard key={p.id} communityId={cid} post={p} />
        ))}
      </div>
    </div>
  );
}

function CommunityPostCard({ communityId, post }: { communityId: string; post: Post }) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const vote = useMutation({
    mutationFn: (vote_type: "upvote" | "downvote") => communityService.votePost(post.id, vote_type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", communityId, "posts"] }),
  });

  const comments = useQuery({
    queryKey: ["community", communityId, "posts", post.id, "comments"],
    queryFn: () => communityService.comments(post.id),
    enabled: commentsOpen,
    refetchInterval: commentsOpen ? 3000 : false,
    refetchOnWindowFocus: true,
  });

  const addComment = useMutation({
    mutationFn: () => communityService.createComment(post.id, { body: draft.trim() }),
    onMutate: async () => {
      const content = draft.trim();
      if (!content) return;

      await qc.cancelQueries({ queryKey: ["community", communityId, "posts", post.id, "comments"] });
      await qc.cancelQueries({ queryKey: ["community", communityId, "posts"] });

      const optimisticComment: Comment = {
        id: `optimistic-${Date.now()}`,
        post: post.id,
        author: me
          ? { id: me.id, username: me.username, avatar: me.avatar ?? null }
          : post.author,
        body: content,
        parent_comment: null,
        upvotes: 0,
        downvotes: 0,
        net_votes: 0,
        replies: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      qc.setQueryData<Paginated<Comment>>(
        ["community", communityId, "posts", post.id, "comments"],
        (prev) => {
          if (!prev) {
            return { count: 1, next: null, previous: null, results: [optimisticComment] };
          }
          return {
            ...prev,
            count: prev.count + 1,
            results: [optimisticComment, ...prev.results],
          };
        },
      );

      qc.setQueriesData<Paginated<Post>>(
        { queryKey: ["community", communityId, "posts"] },
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            results: prev.results.map((entry) =>
              entry.id === post.id ? { ...entry, comment_count: entry.comment_count + 1 } : entry,
            ),
          };
        },
      );
    },
    onSuccess: (newComment) => {
      toast.success("Comment posted");
      setDraft("");
      setCommentsOpen(true);

      qc.setQueryData<Paginated<Comment>>(
        ["community", communityId, "posts", post.id, "comments"],
        (prev) => {
          if (!prev) return { count: 1, next: null, previous: null, results: [newComment] };

          const withoutOptimistic = prev.results.filter((comment) => !comment.id.startsWith("optimistic-"));
          return {
            ...prev,
            count: withoutOptimistic.length + 1,
            results: [newComment, ...withoutOptimistic],
          };
        },
      );
    },
    onSettled: () => {
      // Keep server as source of truth while preserving instant local feedback.
      qc.invalidateQueries({ queryKey: ["community", communityId, "posts", post.id, "comments"] });
      qc.invalidateQueries({ queryKey: ["community", communityId, "posts"] });
    },
  });

  return (
    <GlassCard className="space-y-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <button aria-label="Upvote" onClick={() => vote.mutate("upvote")}>
            <ArrowBigUp className={post.user_vote === "upvote" ? "fill-primary text-primary" : "text-muted-foreground"} />
          </button>
          <span className="font-semibold text-sm">{post.net_votes}</span>
          <button aria-label="Downvote" onClick={() => vote.mutate("downvote")}>
            <ArrowBigDown className={post.user_vote === "downvote" ? "fill-destructive text-destructive" : "text-muted-foreground"} />
          </button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize">{post.post_type}</Badge>
            <span className="text-xs text-muted-foreground">{dayjs(post.created_at).format("MMM D")}</span>
          </div>
          <Link to={`/app/posts/${post.id}`} className="block mt-1">
            <h3 className="font-display font-semibold hover:text-primary">{post.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.body}</p>
          </Link>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <UserAvatar user={post.author} size="xs" />
            <span>{post.author.username}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.comment_count}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant={commentsOpen ? "secondary" : "outline"}
          size="sm"
          onClick={() => setCommentsOpen((value) => !value)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {commentsOpen ? "Hide comments" : `Show comments${(comments.data?.count ?? post.comment_count) ? ` (${comments.data?.count ?? post.comment_count})` : ""}`}
        </Button>
      </div>

      {commentsOpen && (
        <div className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
          <div className="space-y-3">
            <p className="font-semibold text-sm">Comments</p>
            <Textarea
              placeholder="Add a comment…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end">
              <Button onClick={() => draft.trim() && addComment.mutate()} disabled={!draft.trim() || addComment.isPending}>
                Comment
              </Button>
            </div>
          </div>

          {comments.isLoading ? (
            <LoadingGrid count={2} />
          ) : (comments.data?.results ?? []).length === 0 ? (
            <EmptyState title="No comments yet" description="Start the discussion with the first comment." />
          ) : (
            <div className="space-y-3">
              {(comments.data?.results ?? []).map((comment) => (
                <CommentNode key={comment.id} comment={comment} level={0} />
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function CommentNode({ comment, level }: { comment: Comment; level: number }) {
  return (
    <div className={cn("space-y-3 rounded-xl border border-border/60 bg-background/70 p-3", level > 0 && "ml-4") }>
      <div className="flex items-start gap-3">
        <UserAvatar user={comment.author} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold truncate">{comment.author.username}</p>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{dayjs(comment.created_at).format("MMM D, h:mm A")}</span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap text-foreground/90">{comment.body}</p>
        </div>
      </div>

      {comment.replies?.length > 0 && (
        <div className="space-y-3 border-l border-border/60 pl-4">
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
