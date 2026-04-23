import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsService } from "@/services/notifications";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", tab],
    queryFn: () => notificationsService.list(tab === "unread" ? false : undefined),
  });
  const markOne = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: notificationsService.markAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div>
      <PageHeader title="Notifications" description="Stay on top of matches, sessions, and chats."
        actions={<Button variant="outline" onClick={() => markAll.mutate()}><CheckCheck className="h-4 w-4 mr-1" />Mark all read</Button>} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
        <TabsList className="glass-subtle"><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="unread">Unread</TabsTrigger></TabsList>
      </Tabs>
      <div className="mt-4">
        {isLoading ? <LoadingGrid count={3} /> : (data?.results ?? []).length === 0 ? (
          <EmptyState icon={Bell} title="You're all caught up" />
        ) : (
          <GlassCard className="divide-y divide-border/50">
            {(data?.results ?? []).map((n) => {
              const inner = (
                <div className={cn("flex items-start gap-3 py-3 first:pt-0 last:pb-0", !n.read && "")}>
                  <div className={cn("h-2 w-2 mt-2 rounded-full", n.read ? "bg-muted" : "bg-primary")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{dayjs(n.created_at).format("MMM D · h:mm A")}</p>
                  </div>
                  {!n.read && (
                    <Button size="icon" variant="ghost" aria-label="Mark read" onClick={(e) => { e.preventDefault(); markOne.mutate(n.id); }}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
              return n.link ? <Link key={n.id} to={n.link} className="block hover:bg-muted/40 -mx-2 px-2 rounded-xl">{inner}</Link> : <div key={n.id}>{inner}</div>;
            })}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
