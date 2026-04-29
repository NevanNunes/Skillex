import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "strong" | "subtle";
  as?: "div" | "section" | "article";
}

export function GlassCard({ children, className, variant = "default", as: Tag = "div" }: GlassCardProps) {
  const variantClass =
    variant === "strong" ? "glass-strong" : variant === "subtle" ? "glass-subtle" : "glass";
  return <Tag className={cn(variantClass, "p-6", className)}>{children}</Tag>;
}
