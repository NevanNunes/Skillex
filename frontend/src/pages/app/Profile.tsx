import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { UserAvatar } from "@/components/common/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usersService } from "@/services/users";
import { skillsService } from "@/services/skills";
import { integrationsService } from "@/services/integrations";
import { useAuthStore } from "@/stores/auth";
import { Calendar, Plus, Trash2, Link2, Check } from "lucide-react";
import type { AvailabilitySlot, TeachSkill } from "@/types/api";

const profileSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  bio: z.string().max(500).optional().or(z.literal("")),
  university: z.string().optional().or(z.literal("")),
  campus: z.string().optional().or(z.literal("")),
});
type ProfileForm = z.infer<typeof profileSchema>;

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Profile() {
  return (
    <div>
      <PageHeader title="Your profile" description="Edit your information, availability, skills, and integrations." />
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="glass-subtle">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="teach">Teach</TabsTrigger>
          <TabsTrigger value="learn">Learn</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4"><InfoTab /></TabsContent>
        <TabsContent value="availability" className="mt-4"><AvailabilityTab /></TabsContent>
        <TabsContent value="teach" className="mt-4"><TeachTab /></TabsContent>
        <TabsContent value="learn" className="mt-4"><LearnTab /></TabsContent>
        <TabsContent value="integrations" className="mt-4"><IntegrationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function InfoTab() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { register, handleSubmit, reset } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  useEffect(() => {
    if (user) reset({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      bio: user.bio ?? "",
      university: user.university ?? "",
      campus: user.campus ?? "",
    });
  }, [user, reset]);

  const mutation = useMutation({
    mutationFn: (values: ProfileForm) => usersService.updateMe(values),
    onSuccess: (u) => { setUser(u); toast.success("Profile updated"); },
    onError: (e: { detail?: string }) => toast.error(e?.detail ?? "Update failed"),
  });

  if (!user) return null;
  return (
    <GlassCard variant="strong" className="space-y-5">
      <div className="flex items-center gap-4">
        <UserAvatar user={user} size="xl" />
        <div>
          <h3 className="font-display font-semibold text-lg">@{user.username}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid gap-4 sm:grid-cols-2">
        <div><Label>First name</Label><Input {...register("first_name")} /></div>
        <div><Label>Last name</Label><Input {...register("last_name")} /></div>
        <div className="sm:col-span-2"><Label>Bio</Label><Textarea rows={3} {...register("bio")} /></div>
        <div><Label>University</Label><Input {...register("university")} /></div>
        <div><Label>Campus</Label><Input {...register("campus")} /></div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={mutation.isPending} className="shadow-glow">
            {mutation.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}

function AvailabilityTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["availability"], queryFn: usersService.availability });
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  useEffect(() => { if (data) setSlots(data); }, [data]);

  const mutation = useMutation({
    mutationFn: (s: AvailabilitySlot[]) => usersService.updateAvailability(s),
    onSuccess: () => { toast.success("Availability saved"); qc.invalidateQueries({ queryKey: ["availability"] }); },
  });

  const addSlot = (weekday: number) => setSlots((s) => [...s, { weekday, start: "09:00", end: "10:00" }]);
  const update = (i: number, patch: Partial<AvailabilitySlot>) =>
    setSlots((s) => s.map((slot, idx) => (idx === i ? { ...slot, ...patch } : slot)));
  const remove = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  return (
    <GlassCard variant="strong" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Weekly availability</h3>
        <Button onClick={() => mutation.mutate(slots)} disabled={mutation.isPending}>Save</Button>
      </div>
      <div className="grid gap-3">
        {weekdays.map((w, idx) => {
          const day = slots.map((s, i) => ({ s, i })).filter((x) => x.s.weekday === idx);
          return (
            <div key={w} className="glass-subtle p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{w}</span>
                <Button size="sm" variant="ghost" onClick={() => addSlot(idx)}><Plus className="h-3.5 w-3.5 mr-1" />Add slot</Button>
              </div>
              <div className="mt-2 space-y-2">
                {day.length === 0 && <p className="text-xs text-muted-foreground">Unavailable</p>}
                {day.map(({ s, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} className="w-32" />
                    <span className="text-muted-foreground">→</span>
                    <Input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} className="w-32" />
                    <Button size="icon" variant="ghost" onClick={() => remove(i)} aria-label="Remove"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function TeachTab() {
  const qc = useQueryClient();
  const { data: teach } = useQuery({ queryKey: ["skills", "teach"], queryFn: skillsService.listTeach });
  const { data: skills } = useQuery({ queryKey: ["skills", "all"], queryFn: () => skillsService.search() });
  const [skillId, setSkillId] = useState<string>("");
  const [level, setLevel] = useState<TeachSkill["level"]>("intermediate");
  const [desc, setDesc] = useState("");

  const add = useMutation({
    mutationFn: () => skillsService.addTeach({ skill_id: Number(skillId), level, description: desc }),
    onSuccess: () => { toast.success("Skill added"); setSkillId(""); setDesc(""); qc.invalidateQueries({ queryKey: ["skills", "teach"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => skillsService.removeTeach(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills", "teach"] }),
  });

  return (
    <GlassCard variant="strong" className="space-y-4">
      <h3 className="font-display font-semibold">Skills you can teach</h3>
      <div className="grid sm:grid-cols-3 gap-2">
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
          <SelectContent>{(skills ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={level} onValueChange={(v) => setLevel(v as TeachSkill["level"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["beginner", "intermediate", "advanced", "expert"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => skillId && add.mutate()} disabled={!skillId || add.isPending}>Add</Button>
      </div>
      <Textarea placeholder="Optional description…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {(teach ?? []).map((t) => (
          <div key={t.id} className="glass-subtle px-3 py-2 flex items-center gap-2">
            <Badge variant="secondary">{t.level}</Badge>
            <span className="text-sm font-medium">{t.skill.name}</span>
            <button aria-label="Remove" onClick={() => remove.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
          </div>
        ))}
        {(teach ?? []).length === 0 && <p className="text-sm text-muted-foreground">No skills yet.</p>}
      </div>
    </GlassCard>
  );
}

function LearnTab() {
  const qc = useQueryClient();
  const { data: learn } = useQuery({ queryKey: ["skills", "learn"], queryFn: skillsService.listLearn });
  const { data: skills } = useQuery({ queryKey: ["skills", "all"], queryFn: () => skillsService.search() });
  const [skillId, setSkillId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [priority, setPriority] = useState<"low" | "med" | "high">("med");

  const add = useMutation({
    mutationFn: () => skillsService.addLearn({ skill_id: Number(skillId), goal, priority }),
    onSuccess: () => { toast.success("Skill added"); setSkillId(""); setGoal(""); qc.invalidateQueries({ queryKey: ["skills", "learn"] }); },
  });
  const remove = useMutation({
    mutationFn: (id: number) => skillsService.removeLearn(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills", "learn"] }),
  });

  return (
    <GlassCard variant="strong" className="space-y-4">
      <h3 className="font-display font-semibold">Skills you want to learn</h3>
      <div className="grid sm:grid-cols-3 gap-2">
        <Select value={skillId} onValueChange={setSkillId}>
          <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
          <SelectContent>{(skills ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "med" | "high")}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["low","med","high"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => skillId && add.mutate()} disabled={!skillId || add.isPending}>Add</Button>
      </div>
      <Input placeholder="Your goal…" value={goal} onChange={(e) => setGoal(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        {(learn ?? []).map((t) => (
          <div key={t.id} className="glass-subtle px-3 py-2 flex items-center gap-2">
            <Badge>{t.priority}</Badge>
            <span className="text-sm font-medium">{t.skill.name}</span>
            <button aria-label="Remove" onClick={() => remove.mutate(t.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
          </div>
        ))}
        {(learn ?? []).length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
      </div>
    </GlassCard>
  );
}

function IntegrationsTab() {
  const { data, refetch } = useQuery({ queryKey: ["integrations", "google"], queryFn: integrationsService.googleStatus });
  const connect = useMutation({
    mutationFn: integrationsService.googleConnect,
    onSuccess: (r) => { window.open(r.url, "_blank"); toast.message("Opening Google authorization…"); refetch(); },
  });
  return (
    <GlassCard variant="strong" className="space-y-4">
      <h3 className="font-display font-semibold flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Google Calendar</h3>
      <div className="flex items-center justify-between glass-subtle p-4">
        <div>
          <p className="font-semibold">{data?.connected ? "Connected" : "Not connected"}</p>
          {data?.email && <p className="text-xs text-muted-foreground">{data.email}</p>}
          {!data?.connected && <p className="text-xs text-muted-foreground">Sync sessions to your calendar automatically.</p>}
        </div>
        {data?.connected ? (
          <Badge variant="secondary" className="bg-success/15 text-success"><Check className="h-3.5 w-3.5 mr-1" /> Active</Badge>
        ) : (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>Connect Google</Button>
        )}
      </div>
    </GlassCard>
  );
}
