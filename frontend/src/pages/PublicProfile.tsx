import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users";
import { reviewsService } from "@/services/reviews";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { RatingStars } from "@/components/common/RatingStars";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingGrid, EmptyState } from "@/components/common/States";

export default function PublicProfile() {
  const { username = "" } = useParams();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", username],
    queryFn: () => usersService.byUsername(username),
  });
  const { data: reviews } = useQuery({
    queryKey: ["reviews", username],
    queryFn: () => reviewsService.forUser(username),
  });

  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-8 py-4 max-w-5xl mx-auto flex items-center justify-between">
        <Link to="/"><Logo /></Link>
        <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {isLoading || !user ? (
          <LoadingGrid count={3} />
        ) : (
          <>
            <GlassCard variant="strong" className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <UserAvatar user={user} size="xl" />
              <div className="flex-1">
                <h1 className="font-display text-2xl font-bold">{user.username}</h1>
                <p className="text-muted-foreground">@{user.username} · {user.college}</p>
                <p className="mt-2 max-w-prose">{user.bio}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="font-display text-2xl font-bold">{(user.reputation_score ?? 0).toFixed(1)}</div>
                  <RatingStars value={user.reputation_score ?? 0} />
                </div>
                <Button asChild><Link to="/login">Connect</Link></Button>
              </div>
            </GlassCard>

            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Stats</h2>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="text-sm py-1.5 px-3">XP: {user.xp ?? 0}</Badge>
                <Badge variant="secondary" className="text-sm py-1.5 px-3">Teacher Lv {user.teacher_level ?? 0}</Badge>
                <Badge variant="secondary" className="text-sm py-1.5 px-3">Learner Lv {user.learner_level ?? 0}</Badge>
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold mb-3">Reviews</h2>
              {reviews?.results?.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {reviews.results.map((r) => (
                    <GlassCard key={r.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <RatingStars value={r.rating} />
                      </div>
                      <p className="text-sm">{r.comment}</p>
                    </GlassCard>
                  ))}
                </div>
              ) : (
                <EmptyState title="No reviews yet" description="Reviews appear after sessions are completed." />
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
