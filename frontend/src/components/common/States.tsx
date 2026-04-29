import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass-subtle p-10 text-center flex flex-col items-center gap-3", className)}>
      <div className="h-12 w-12 rounded-2xl bg-gradient-primary/10 grid place-items-center">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-subtle h-40 animate-pulse" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="glass p-6 border-destructive/30">
      <p className="text-destructive font-medium">Something went wrong.</p>
      {message && <p className="text-sm text-muted-foreground mt-1">{message}</p>}
      {onRetry && (
        <button onClick={onRetry} className="text-sm underline mt-3 text-primary">
          Try again
        </button>
      )}
    </div>
  );
}
