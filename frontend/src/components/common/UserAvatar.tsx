import { cn } from "@/lib/utils";
import type { User } from "@/types/api";

function initials(u: Pick<User, "first_name" | "last_name" | "username" | "full_name">) {
  const name = u.full_name ?? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ?? u.username;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || u.username.slice(0, 2).toUpperCase();
}

const palette = [
  "from-[hsl(184_78%_55%)] to-[hsl(210_95%_60%)]",
  "from-[hsl(168_76%_55%)] to-[hsl(184_78%_50%)]",
  "from-[hsl(38_95%_60%)] to-[hsl(0_78%_60%)]",
  "from-[hsl(210_95%_60%)] to-[hsl(260_85%_65%)]",
  "from-[hsl(152_65%_50%)] to-[hsl(184_78%_50%)]",
];

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<User, "id" | "username" | "first_name" | "last_name" | "full_name" | "avatar_url">;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-xl",
  } as const;
  const grad = palette[user.id % palette.length];
  return (
    <div
      className={cn(
        "rounded-full grid place-items-center font-display font-semibold text-white shadow-glass",
        "bg-gradient-to-br",
        grad,
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}
