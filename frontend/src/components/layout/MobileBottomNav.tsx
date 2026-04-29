import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Sparkles, CalendarDays, MessageCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app", end: true, label: "Home", icon: LayoutDashboard },
  { to: "/app/matching", label: "Match", icon: Sparkles },
  { to: "/app/sessions", label: "Sessions", icon: CalendarDays },
  { to: "/app/chat", label: "Chat", icon: MessageCircle },
  { to: "/app/gamification", label: "XP", icon: Trophy },
];

export function MobileBottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
      <div className="glass-strong flex items-center justify-around p-1.5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium",
              "text-muted-foreground hover:text-foreground transition-colors",
            )}
            activeClassName="!text-primary bg-primary/10"
          >
            <it.icon className="h-5 w-5" />
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
