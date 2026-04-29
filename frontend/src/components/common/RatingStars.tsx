import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function RatingStars({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className={cn("flex items-center gap-0.5 text-warning", className)} aria-label={`Rating ${value} of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full || (i === full && half);
        return (
          <Star
            key={i}
            width={size}
            height={size}
            className={filled ? "fill-warning stroke-warning" : "stroke-muted-foreground/40"}
          />
        );
      })}
    </div>
  );
}
