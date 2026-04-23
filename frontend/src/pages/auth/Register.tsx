import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  username: z.string().min(3, "At least 3 chars").regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, . _ -"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const data = await authService.register(values);
      setSession(data.user, { access: data.access, refresh: data.refresh });
      toast.success("Account created. Welcome to SkillEX!");
      navigate("/app/profile", { replace: true });
    } catch (e: any) {
      console.error("Registration error:", e?.response?.data || e);
      const data = e?.response?.data;
      let msg = "Registration failed";
      if (data && typeof data === "object" && !data.detail) {
        msg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`)
          .join(" | ");
      } else if (data?.detail) {
        msg = data.detail;
      }
      toast.error(msg);
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
            <h1 className="font-display text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Join your campus skill exchange in seconds.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="first_name">First name</Label>
                <Input id="first_name" {...register("first_name")} />
                {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="last_name">Last name</Label>
                <Input id="last_name" {...register("last_name")} />
                {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" {...register("username")} />
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full shadow-glow" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground">
            Already a member? <Link to="/login" className="text-primary font-medium">Sign in</Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
