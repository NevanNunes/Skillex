import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-xl bg-gradient-primary shadow-glow" />
        <div className="absolute inset-[3px] rounded-[10px] bg-background/60 backdrop-blur-md grid place-items-center">
          <span className="font-display text-sm font-bold text-gradient">Sx</span>
        </div>
      </div>
      {withText && (
        <span className="font-display text-lg font-bold tracking-tight">
          Skill<span className="text-gradient">EX</span>
        </span>
      )}
    </div>
  );
}
