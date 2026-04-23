import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/brand/Logo";
import { GlassCard } from "@/components/common/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);

  const {
    register, handleSubmit, formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "alex@uni.edu", password: "demopass" } });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const data = await authService.login(values);
      setSession(data.user, { access: data.access, refresh: data.refresh });
      toast.success(`Welcome back, ${data.user.first_name ?? data.user.username} 👋`);
      const from = (location.state as { from?: string } | null)?.from ?? "/app";
      navigate(from, { replace: true });
    } catch (e) {
      toast.error((e as { detail?: string })?.detail ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-block"><Logo /></Link>
        </div>
        <GlassCard variant="strong" className="space-y-5">
          <div>
            <h1 className="font-display text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Log in to keep learning and teaching.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full shadow-glow" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground">
            New here? <Link to="/register" className="text-primary font-medium">Create an account</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
