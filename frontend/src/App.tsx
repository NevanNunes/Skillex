import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import PublicProfile from "./pages/PublicProfile";
import Dashboard from "./pages/app/Dashboard";
import Profile from "./pages/app/Profile";
import Matching from "./pages/app/Matching";
import Sessions from "./pages/app/Sessions";
import SessionDetail from "./pages/app/SessionDetail";
import Chat from "./pages/app/Chat";
import Community from "./pages/app/Community";
import CommunityDetail from "./pages/app/CommunityDetail";
import PostDetail from "./pages/app/PostDetail";
import Gamification from "./pages/app/Gamification";
import Leaderboard from "./pages/app/Leaderboard";
import Notifications from "./pages/app/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/u/:username" element={<PublicProfile />} />

          {/* Protected app */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="matching" element={<Matching />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="sessions/:id" element={<SessionDetail />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:roomId" element={<Chat />} />
            <Route path="community" element={<Community />} />
            <Route path="community/:id" element={<CommunityDetail />} />
            <Route path="posts/:id" element={<PostDetail />} />
            <Route path="gamification" element={<Gamification />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
