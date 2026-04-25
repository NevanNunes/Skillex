import { Bell, LogOut, Menu, MessageCircle, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { notificationsService } from "@/services/notifications";
import { chatService } from "@/services/chat";
import { authService } from "@/services/auth";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Logo } from "@/components/brand/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { user, tokens, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count", "matching"],
    queryFn: notificationsService.matchingUnreadCount,
    refetchInterval: 30000,
  });
  const { data: rooms } = useQuery({
    queryKey: ["chat", "rooms", "topbar-unread"],
    queryFn: chatService.rooms,
    refetchInterval: 10000,
  });
  const unreadChat = (rooms?.results ?? []).reduce((sum, room) => sum + (room.unread_count ?? 0), 0);

  const handleLogout = async () => {
    try { if (tokens?.refresh) await authService.logout(tokens.refresh); } catch { /* ignore */ }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
      <div className="glass-strong flex items-center gap-3 px-3 sm:px-4 py-2.5">
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="lg:hidden p-2 rounded-lg hover:bg-muted/60"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Logo withText={false} />
        </div>
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
          <div className="flex items-center gap-2 w-full glass-subtle px-3 py-1.5 rounded-xl">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search skills, people, communities…"
              className="bg-transparent outline-none text-sm w-full"
              aria-label="Search"
            />
            <kbd className="hidden lg:inline text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => navigate("/app/chat")}
            className="relative p-2 rounded-lg hover:bg-muted/60"
            aria-label={`Chats${unreadChat ? `, ${unreadChat} unread` : ""}`}
          >
            <MessageCircle className="h-5 w-5" />
            {!!unreadChat && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground shadow-glow">
                {unreadChat}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/app/notifications")}
            className="relative p-2 rounded-lg hover:bg-muted/60"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          >
            <Bell className="h-5 w-5" />
            {!!unread && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-gradient-primary text-[10px] font-bold text-primary-foreground shadow-glow">
                {unread}
              </span>
            )}
          </button>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                  <UserAvatar user={user} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.username}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/app/profile")}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="default" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/app/matching")}>
            Find a match
          </Button>
        </div>
      </div>
    </header>
  );
}
