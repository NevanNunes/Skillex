import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { LoadingGrid, EmptyState } from "@/components/common/States";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Award, Calendar, Search, ExternalLink, MoreVertical, ShieldAlert, PowerOff, Database } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"users" | "database">("users");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => usersService.adminList(page, search),
  });

  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string, action: "toggle_admin" | "toggle_active" }) => 
      usersService.adminAction(userId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User updated successfully");
    },
    onError: () => {
      toast.error("Failed to update user");
    }
  });

  const stats = [
    { label: "Total Users", value: data?.count ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Admin Role", value: data?.results?.filter(u => u.role === 'admin').length ?? 0, icon: Shield, color: "text-purple-500" },
    { label: "High XP Users", value: data?.results?.filter(u => (u.xp ?? 0) > 1000).length ?? 0, icon: Award, color: "text-yellow-500" },
    { label: "New this month", value: data?.results?.filter(u => dayjs(u.date_joined).isAfter(dayjs().subtract(1, 'month'))).length ?? 0, icon: Calendar, color: "text-green-500" },
  ];

  const openDjangoAdmin = () => {
    // Navigate to the Django admin URL (assuming backend is at port 8000)
    window.open("http://localhost:8000/admin/", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title="Admin Control Center" 
          description="Highest authority management dashboard for Skillex."
        />
        <div className="flex gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50">
          <Button 
            variant={activeTab === "users" ? "default" : "ghost"} 
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab("users")}
          >
            <Users className="h-4 w-4" />
            User Management
          </Button>
          <Button 
            variant={activeTab === "database" ? "default" : "ghost"} 
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab("database")}
          >
            <Database className="h-4 w-4" />
            Database Admin
          </Button>
        </div>
      </div>

      {activeTab === "users" ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold font-display">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* User Management Section */}
      <GlassCard className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-display font-semibold">User Management</h2>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <LoadingGrid count={1} />
        ) : data?.results.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search term." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border/50 text-sm text-muted-foreground">
                  <th className="pb-3 pl-2">User</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data?.results.map((user) => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-2">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-white uppercase">
                          {user.username.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.username}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">{user.xp} XP</span>
                        <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${Math.min(100, (user.xp ?? 0) / 20)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-xs text-muted-foreground">
                      {dayjs(user.date_joined).format("MMM D, YYYY")}
                    </td>
                    <td className="py-4 text-right pr-2">
                      <Badge variant={user.is_verified ? "outline" : "secondary"} className={user.is_verified ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                        {user.is_verified ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => actionMutation.mutate({ userId: user.id, action: "toggle_admin" })}>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            {user.role === 'admin' ? "Revoke Admin" : "Make Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => actionMutation.mutate({ userId: user.id, action: "toggle_active" })}>
                            <PowerOff className="mr-2 h-4 w-4" />
                            {user.is_verified ? "Deactivate User" : "Activate User"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
        </>
      ) : (
        <GlassCard className="p-0 overflow-hidden h-[800px] flex flex-col border border-primary/20 shadow-glow">
          <div className="bg-primary/10 p-3 border-b border-primary/20 flex justify-between items-center">
            <div className="flex items-center gap-3 pl-2">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold text-sm">Full Database Access</h2>
                <p className="text-xs text-muted-foreground">Manage all models exactly like Django Admin</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="glass-subtle" onClick={openDjangoAdmin}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
          <iframe 
            src="http://localhost:8000/admin/" 
            className="w-full flex-1 border-none bg-white/95 dark:bg-white/90"
            title="Django Admin"
          />
        </GlassCard>
      )}
    </div>
  );
}
