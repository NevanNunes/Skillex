import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { sessionsService } from "@/services/sessions";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { LoadingGrid } from "@/components/common/States";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, MessageCircle, Info } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import dayjs from "dayjs";

export default function SessionDetail() {
  const { id } = useParams();
  const sid = Number(id);
  const me = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["session", sid],
    queryFn: async () => (await sessionsService.list()).results.find((s) => s.id === sid) ?? null,
  });
  if (isLoading) return <LoadingGrid count={2} />;
  if (!data) return <div className="glass p-6">Session not found. <Link to="/app/sessions" className="text-primary">Back</Link></div>;
  const other = data.teacher.id === me?.id ? data.learner : data.teacher;

  return (
    <div className="space-y-4">
      <PageHeader title={`${data.skill.name} session`} description={`${dayjs(data.start).format("ddd, MMM D · h:mm A")} – ${dayjs(data.end).format("h:mm A")}`}
        actions={<Badge className="capitalize">{data.status}</Badge>} />
      <GlassCard className="flex items-center gap-3">
        <UserAvatar user={other} size="lg" />
        <div className="flex-1">
          <p className="font-display font-semibold">{other.full_name ?? other.username}</p>
          <p className="text-sm text-muted-foreground">{other.university}</p>
        </div>
      </GlassCard>

      <Tabs defaultValue="video">
        <TabsList className="glass-subtle">
          <TabsTrigger value="video"><Video className="h-4 w-4 mr-1" />Video</TabsTrigger>
          <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-1" />Chat</TabsTrigger>
          <TabsTrigger value="details"><Info className="h-4 w-4 mr-1" />Details</TabsTrigger>
        </TabsList>
        <TabsContent value="video" className="mt-4">
          <GlassCard className="aspect-video grid place-items-center">
            <div className="text-center space-y-3">
              <Video className="h-10 w-10 text-primary mx-auto" />
              <p className="font-display font-semibold">Ready when you are</p>
              <p className="text-sm text-muted-foreground">Powered by Daily.co</p>
              <Button size="lg" asChild className="shadow-glow">
                <a href={data.meeting_url ?? "#"} target="_blank" rel="noreferrer">Join video</a>
              </Button>
            </div>
          </GlassCard>
        </TabsContent>
        <TabsContent value="chat" className="mt-4">
          <GlassCard><p className="text-sm text-muted-foreground">Open the dedicated chat thread for this session.</p>
            <Button asChild variant="outline" className="mt-3"><Link to="/app/chat">Open chat</Link></Button>
          </GlassCard>
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <GlassCard className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Skill:</span> {data.skill.name}</p>
            <p><span className="text-muted-foreground">Teacher:</span> {data.teacher.full_name ?? data.teacher.username}</p>
            <p><span className="text-muted-foreground">Learner:</span> {data.learner.full_name ?? data.learner.username}</p>
            <p><span className="text-muted-foreground">Created:</span> {dayjs(data.created_at).format("MMM D, YYYY h:mm A")}</p>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
