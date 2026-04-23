import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { communityService } from "@/services/community";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { LoadingGrid } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export default function Community() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["communities"], queryFn: communityService.list });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const create = useMutation({
    mutationFn: () => communityService.create({ name, description: desc }),
    onSuccess: () => { toast.success("Community created"); setOpen(false); setName(""); setDesc(""); qc.invalidateQueries({ queryKey: ["communities"] }); },
  });
  const join = useMutation({
    mutationFn: (id: number) => communityService.join(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communities"] }),
  });

  return (
    <div>
      <PageHeader
        title="Communities"
        description="Find your study group, share knowledge, and earn reputation."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="shadow-glow"><Plus className="h-4 w-4 mr-1" />New</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a community</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <DialogFooter>
                <Button onClick={() => name && create.mutate()} disabled={!name || create.isPending}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {isLoading ? <LoadingGrid /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {(data?.results ?? []).map((c) => (
            <GlassCard key={c.id} className="space-y-3 hover:shadow-elevated transition-shadow">
              <div className="h-20 -mx-6 -mt-6 mb-2 rounded-t-2xl" style={{ background: `linear-gradient(135deg, hsl(${c.cover_color ?? "184 78% 38%"}) 0%, hsl(210 95% 60%) 100%)` }} />
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold flex-1">{c.name}</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{c.members_count}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1"><Link to={`/app/community/${c.id}`}>Open</Link></Button>
                {!c.is_member && <Button size="sm" onClick={() => join.mutate(c.id)}>Join</Button>}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
