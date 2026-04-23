import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  UserCircle,
  Sparkles,
  CalendarDays,
  MessageCircle,
  Users,
  Trophy,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export const navItems = [
  { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/profile", label: "Profile", icon: UserCircle },
  { to: "/app/matching", label: "Matching", icon: Sparkles },
  { to: "/app/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/app/chat", label: "Chat", icon: MessageCircle },
  { to: "/app/community", label: "Community", icon: Users },
  { to: "/app/gamification", label: "XP & Badges", icon: Trophy },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ collapsed }: { collapsed?: boolean }) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col gap-2 p-4 sticky top-0 h-screen",
        collapsed ? "w-[78px]" : "w-[260px]",
      )}
    >
      <div className="glass-strong h-full p-4 flex flex-col gap-2">
        <div className="px-2 py-2">
          {collapsed ? <Logo withText={false} /> : <Logo />}
        </div>
        <nav className="flex flex-col gap-1 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                "text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
              )}
              activeClassName="!text-primary bg-primary/10 hover:bg-primary/15"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto p-3 rounded-xl bg-gradient-primary/10 border border-primary/20">
          {!collapsed ? (
            <>
              <p className="text-xs font-semibold text-primary">Pro tip</p>
              <p className="text-xs text-muted-foreground mt-1">
                Update your availability to unlock more matches.
              </p>
            </>
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
        </div>
      </div>
    </aside>
  );
}
