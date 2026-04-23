import { Link } from "react-router-dom";
import {
  Sparkles, CalendarDays, MessageCircle, Trophy, ArrowRight, ShieldCheck, Users, Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/common/GlassCard";

const features = [
  { icon: Sparkles, title: "Smart matching", desc: "Rule-based and semantic matching find peers who actually fit your goals." },
  { icon: CalendarDays, title: "Effortless scheduling", desc: "Overlap-aware booking with Google Calendar sync." },
  { icon: MessageCircle, title: "Live sessions & chat", desc: "Real-time messaging and 1-click join for video sessions." },
  { icon: Trophy, title: "XP, badges, leaderboards", desc: "Earn reputation as you teach and learn. Stay motivated." },
  { icon: Users, title: "Communities", desc: "Find your study group. Discuss, vote, and accept best answers." },
  { icon: ShieldCheck, title: "Built for campus", desc: "Verified students, clear reviews, and fair-play moderation." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="px-4 sm:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="text-sm font-medium px-3 py-2 rounded-lg hover:bg-muted/60">
            Log in
          </Link>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <section className="px-4 sm:px-8 pt-10 sm:pt-20 pb-16 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6 animate-slide-up">
            <span className="inline-flex items-center gap-2 glass-subtle px-3 py-1.5 text-xs font-medium">
              <Zap className="h-3.5 w-3.5 text-primary" />
              New: semantic matching with overlap-aware scheduling
            </span>
            <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight">
              Trade skills with the people on your <span className="text-gradient">campus</span>.
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl">
              SkillEX is the peer-to-peer skill exchange for university students.
              Match, schedule, learn, teach, and level up — all in one elegant workspace.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg" asChild className="shadow-glow">
                <Link to="/register">
                  Create your account <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="bg-background/40 backdrop-blur">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div><span className="font-display text-2xl font-bold text-foreground">12k+</span><div>students</div></div>
              <div><span className="font-display text-2xl font-bold text-foreground">350+</span><div>skills</div></div>
              <div><span className="font-display text-2xl font-bold text-foreground">4.9★</span><div>avg rating</div></div>
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="absolute -inset-10 bg-gradient-primary opacity-20 blur-3xl rounded-full" aria-hidden />
            <GlassCard variant="strong" className="relative space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">Today on SkillEX</h3>
                <span className="text-xs text-success font-medium">● Live</span>
              </div>
              <div className="grid gap-3">
                <div className="glass-subtle p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground font-bold">M</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mira ↔ You</p>
                    <p className="text-xs text-muted-foreground">Piano lesson · 4:00 PM</p>
                  </div>
                  <Button size="sm">Join</Button>
                </div>
                <div className="glass-subtle p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-accent grid place-items-center text-accent-foreground font-bold">N</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">98% match: Noor</p>
                    <p className="text-xs text-muted-foreground">Calculus tutoring</p>
                  </div>
                  <Button size="sm" variant="outline">View</Button>
                </div>
                <div className="glass-subtle p-4 flex items-center gap-3">
                  <Trophy className="h-8 w-8 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mentor badge unlocked</p>
                    <p className="text-xs text-muted-foreground">+100 XP · Level 7</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold">Everything you need to learn together</h2>
          <p className="text-muted-foreground mt-3">From the first match to the final review — designed for momentum.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {features.map((f) => (
            <GlassCard key={f.title} className="space-y-3 hover:shadow-elevated transition-shadow">
              <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-8 py-16 max-w-5xl mx-auto">
        <GlassCard variant="strong" className="text-center py-12 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" aria-hidden />
          <h2 className="relative font-display text-3xl sm:text-4xl font-bold">Ready to swap your first skill?</h2>
          <p className="relative text-muted-foreground mt-3 max-w-xl mx-auto">
            Set up your profile in under two minutes and meet your first match today.
          </p>
          <div className="relative mt-6 flex items-center justify-center gap-3">
            <Button size="lg" asChild className="shadow-glow">
              <Link to="/register">Get started free</Link>
            </Button>
          </div>
        </GlassCard>
      </section>

      <footer className="px-4 sm:px-8 py-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3 justify-between text-sm text-muted-foreground">
        <Logo withText />
        <p>© {new Date().getFullYear()} SkillEX · Built for university campuses.</p>
      </footer>
    </div>
  );
}
