import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users";
import { PageHeader } from "@/components/common/PageHeader";
import { GlassCard } from "@/components/common/GlassCard";
import { LoadingGrid, EmptyState } from "@/components/common/States";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Award, Calendar, Search, ExternalLink } from "lucide-react";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => usersService.adminList(page, search),
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
        <Button 
          variant="outline" 
          className="glass-subtle border-primary/20 hover:bg-primary/10 gap-2"
          onClick={openDjangoAdmin}
        >
          <ExternalLink className="h-4 w-4" />
          Django Admin Panel
        </Button>
      </div>

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
                      <Badge variant={user.is_verified ? "outline" : "secondary"} className="bg-green-500/10 text-green-500 border-green-500/20">
                        Active
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
