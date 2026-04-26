import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatService } from "@/services/chat";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { EmptyState, LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { Send, Wifi, WifiOff } from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { data: rooms, isLoading } = useQuery({ queryKey: ["chat", "rooms"], queryFn: chatService.rooms });
  const roomCount = rooms?.results?.length ?? 0;
  const activeRoomId = roomId ?? (roomCount === 1 ? rooms?.results[0]?.id : undefined);

  useEffect(() => {
    if (!roomId && roomCount === 1 && rooms?.results[0]) {
      navigate(`/app/chat/${rooms.results[0].id}`, { replace: true });
    }
  }, [rooms, roomCount, roomId, navigate]);

  return (
    <div>
      <PageHeader title="Chat" description="Real-time messaging with your matched people." />
      <div className="grid lg:grid-cols-[320px,1fr] gap-4 h-[calc(100vh-260px)] min-h-[480px]">
        <GlassCard className="overflow-hidden p-0">
          <div className="p-4 border-b border-border/50">
            <h2 className="font-display font-semibold">Matched people</h2>
          </div>
          <div className="overflow-y-auto h-full scroll-area-thin">
            {isLoading ? <div className="p-4"><LoadingGrid count={3} /></div> :
              (rooms?.results ?? []).length === 0 ? <div className="p-4"><EmptyState title="No conversations yet" /></div> :
              (rooms?.results ?? []).map((r) => {
                const active = r.id === activeRoomId;
                return (
                  <button key={r.id} onClick={() => navigate(`/app/chat/${r.id}`)}
                    className={cn("w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 text-left", active && "bg-primary/10")}>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-sm">{r.participant?.username ?? "Matched user"}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.last_message?.content ?? "No messages yet"}</p>
                    </div>
                    {r.unread_count > 0 && <Badge className="bg-gradient-primary">{r.unread_count}</Badge>}
                  </button>
                );
              })}
          </div>
        </GlassCard>

        {activeRoomId ? <ChatThread key={activeRoomId} roomId={activeRoomId} /> : <GlassCard><EmptyState title="Pick a conversation" description="Choose the person you want to message from the list." /></GlassCard>}
      </div>
    </div>
  );
}

function ChatThread({ roomId }: { roomId: string }) {
  const me = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["chat", "messages", roomId],
    queryFn: () => chatService.messages(roomId),
  });
  const messages = [...(data?.results ?? [])].reverse();
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status, send: wsSend } = useChatWebSocket({
    roomId,
    onEvent: (e) => {
      if (e.type === "chat_message") {
        qc.invalidateQueries({ queryKey: ["chat", "messages", roomId] });
        qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
      }
      if (e.type === "read_receipt") {
        qc.invalidateQueries({ queryKey: ["chat", "messages", roomId] });
        qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
      }
      if (e.type === "typing") setTyping(Boolean(e.is_typing));
    },
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => {
    chatService.markRead(roomId)
      .then(() => qc.invalidateQueries({ queryKey: ["chat", "rooms"] }))
      .catch(() => {});
  }, [roomId, qc]);
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const send = useMutation({
    mutationFn: (content: string) => chatService.send(roomId, content),
    onSuccess: () => {
      setDraft("");
      qc.invalidateQueries({ queryKey: ["chat", "messages", roomId] });
      qc.invalidateQueries({ queryKey: ["chat", "rooms"] });
      wsSend({ type: "chat_message", room: roomId });
    },
  });

  return (
    <GlassCard className="flex flex-col p-0 overflow-hidden">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-display font-semibold">Conversation</h3>
        <Badge variant="secondary" className="text-xs">
          {status === "open" ? <><Wifi className="h-3 w-3 mr-1" /> Live</> :
           status === "reconnecting" ? "Reconnecting…" :
           status === "connecting" ? "Connecting…" :
           <><WifiOff className="h-3 w-3 mr-1" /> Offline</>}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto scroll-area-thin p-4 space-y-2">
        {isLoading ? <LoadingGrid count={3} /> : messages.map((m) => {
          const mine = m.sender === me?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm",
                mine ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "glass-subtle rounded-bl-sm",
              )}>
                {!mine && <p className="text-xs font-semibold mb-0.5">{m.sender_username}</p>}
                <p>{m.content}</p>
                <p className={cn("text-[10px] mt-0.5", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {dayjs(m.created_at).format("h:mm A")}
                </p>
              </div>
            </div>
          );
        })}
        {typing && <p className="text-xs text-muted-foreground">Typing…</p>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const content = draft.trim();
          if (!content) return;

          wsSend({ type: "typing", is_typing: false });
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }

          if (status === "open") {
            wsSend({ type: "chat_message", content });
            setDraft("");
            return;
          }

          send.mutate(content);
        }}
        className="p-3 border-t border-border/50 flex items-center gap-2"
      >
        <Input
          placeholder="Write a message…"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            wsSend({ type: "typing", is_typing: true });
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              wsSend({ type: "typing", is_typing: false });
            }, 1200);
          }}
          onBlur={() => {
            wsSend({ type: "typing", is_typing: false });
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = null;
            }
          }}
          aria-label="Message"
        />
        <Button type="submit" disabled={!draft.trim() || send.isPending} size="icon" className="shadow-glow">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </GlassCard>
  );
}
