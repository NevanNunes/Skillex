import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, MessageCircle, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth";
import { notificationsService } from "@/services/notifications";
import { chatService } from "@/services/chat";
import { authService } from "@/services/auth";
import { usersService } from "@/services/users";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Logo } from "@/components/brand/Logo";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: unread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: notificationsService.unreadCount,
    refetchInterval: 30000,
  });
  const { data: rooms } = useQuery({
    queryKey: ["chat", "rooms", "topbar-unread"],
    queryFn: chatService.rooms,
    refetchInterval: 10000,
  });
  const unreadChat = (rooms?.results ?? []).reduce((sum, room) => sum + (room.unread_count ?? 0), 0);
  const trimmedQuery = searchQuery.trim();

  const { data: people, isLoading, isError } = useQuery({
    queryKey: ["users", "search", trimmedQuery],
    queryFn: () => usersService.search(trimmedQuery, 6),
    enabled: searchOpen && trimmedQuery.length >= 2,
  });

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      setSearchQuery("");
    }
  }, [searchOpen]);

  const handlePersonSelect = (username: string) => {
    setSearchOpen(false);
    navigate(`/u/${username}`);
  };

  const handleLogout = async () => {
    try { if (tokens?.refresh) await authService.logout(tokens.refresh); } catch { /* ignore */ }
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-30 px-3 sm:px-4 pt-3">
        <div className="glass-strong flex items-center gap-3 px-3 sm:px-4 py-2.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-muted/60"
            aria-label="Search people"
          >
            <Search className="h-5 w-5" />
          </button>
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
          {user?.role === 'admin' && (
             <div className="hidden lg:flex items-center ml-2 mr-2 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold uppercase tracking-wider border border-primary/30">
               Admin Mode
             </div>
          )}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden md:flex items-center gap-2 flex-1 max-w-md glass-subtle px-3 py-1.5 rounded-xl text-left hover:bg-muted/60 transition"
            aria-label="Search people"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">Search people by name, college, or bio</span>
            <kbd className="hidden lg:inline text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
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
                  <DropdownMenuItem onClick={() => navigate("/app/profile") }>
                    <Settings className="h-4 w-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {user?.role !== 'admin' && (
              <Button variant="default" size="sm" className="hidden sm:inline-flex" onClick={() => navigate("/app/matching")}>
                Find a match
              </Button>
            )}
          </div>
        </div>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Search people</DialogTitle>
            <DialogDescription>
              Find classmates, mentors, and collaborators by name, college, or bio.
            </DialogDescription>
          </DialogHeader>
          <Command shouldFilter={false} className="border-0 rounded-none">
            <hr></hr>
            <br></br>
            <CommandInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search people..."
              className="h-10 py-2"
            />
            <CommandList className="max-h-[420px]">
              
              {trimmedQuery.length < 2 ? (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </div>
              ) : isLoading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/3 rounded bg-muted" />
                        <div className="h-3 w-2/3 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="px-4 py-6 text-sm text-destructive">
                  Unable to load people right now.
                </div>
              ) : (people?.results ?? []).length > 0 ? (
                <CommandGroup heading="People">
                  {(people?.results ?? []).map((person) => (
                    <CommandItem
                      key={person.id}
                      value={person.username}
                      onSelect={() => handlePersonSelect(person.username)}
                      className="px-4 py-3"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <UserAvatar user={person} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{person.username}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {person.college ?? "Campus member"}
                          </div>
                        </div>
                        {typeof person.reputation_score === "number" && (
                          <div className="text-xs text-muted-foreground">
                            {person.reputation_score.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>No people found.</CommandEmpty>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
