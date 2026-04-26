import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { tokens, hydrated } = useAuthStore();
  const location = useLocation();
  if (!hydrated) return null;
  if (!tokens?.access) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { tokens, hydrated } = useAuthStore();
  if (!hydrated) return null;
  if (tokens?.access) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, tokens, hydrated } = useAuthStore();
  const location = useLocation();
  if (!hydrated) return null;
  if (!tokens?.access) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (user?.role !== "admin") {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
}
