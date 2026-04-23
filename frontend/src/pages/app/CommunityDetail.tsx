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
import type { PostSort, PostType } from "@/types/api";

export default function CommunityDetail() {
  const { id } = useParams();
  const cid = Number(id);
  const qc = useQueryClient();
  const [sort, setSort] = useState<PostSort>("new");
  const community = useQuery({ queryKey: ["community", cid], queryFn: () => communityService.detail(cid) });
  const posts = useQuery({ queryKey: ["community", cid, "posts", sort], queryFn: () => communityService.posts(cid, sort) });
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<PostType>("discussion");
  const create = useMutation({
    mutationFn: () => communityService.createPost(cid, { title, body, type }),
    onSuccess: () => { toast.success("Posted"); setOpen(false); setTitle(""); setBody(""); qc.invalidateQueries({ queryKey: ["community", cid, "posts"] }); },
  });
  const vote = useMutation({
    mutationFn: ({ pid, value }: { pid: number; value: -1 | 0 | 1 }) => communityService.votePost(pid, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", cid, "posts"] }),
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
                  <SelectContent><SelectItem value="discussion">Discussion</SelectItem><SelectItem value="question">Question</SelectItem></SelectContent>
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
          <GlassCard key={p.id} className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <button aria-label="Upvote" onClick={() => vote.mutate({ pid: p.id, value: p.user_vote === 1 ? 0 : 1 })}>
                <ArrowBigUp className={p.user_vote === 1 ? "fill-primary text-primary" : "text-muted-foreground"} />
              </button>
              <span className="font-semibold text-sm">{p.score}</span>
              <button aria-label="Downvote" onClick={() => vote.mutate({ pid: p.id, value: p.user_vote === -1 ? 0 : -1 })}>
                <ArrowBigDown className={p.user_vote === -1 ? "fill-destructive text-destructive" : "text-muted-foreground"} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">{p.type}</Badge>
                <span className="text-xs text-muted-foreground">{dayjs(p.created_at).format("MMM D")}</span>
              </div>
              <Link to={`/app/posts/${p.id}`} className="block mt-1">
                <h3 className="font-display font-semibold hover:text-primary">{p.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.body}</p>
              </Link>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <UserAvatar user={p.author} size="xs" />
                <span>{p.author.full_name ?? p.author.username}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.comments_count}</span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
