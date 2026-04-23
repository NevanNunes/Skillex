import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useAuthStore } from "@/stores/auth";
import { useQuery } from "@tanstack/react-query";
import { usersService } from "@/services/users";

export function AppLayout() {
  const navigate = useNavigate();
  const { tokens, setUser, user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ["users", "me"],
    queryFn: usersService.me,
    enabled: !!tokens?.access,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useEffect(() => {
    if (!tokens?.access) navigate("/login", { replace: true });
  }, [tokens?.access, navigate]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      {/* Hidden read of user to silence eslint */}
      <span className="sr-only">{user?.username}</span>
    </div>
  );
}
