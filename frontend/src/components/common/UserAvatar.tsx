import { cn } from "@/lib/utils";
import type { User, AuthorMini } from "@/types/api";

type AvatarUser = Pick<User, "id" | "username" | "first_name" | "last_name" | "avatar"> | AuthorMini;

function initials(u: AvatarUser) {
  const fn = "first_name" in u ? u.first_name : undefined;
  const ln = "last_name" in u ? u.last_name : undefined;
  const name = `${fn ?? ""} ${ln ?? ""}`.trim() || u.username;
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

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: AvatarUser;
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
  const grad = palette[hashStr(user.id) % palette.length];
  const avatarUrl = "avatar" in user ? user.avatar : undefined;
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
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}
