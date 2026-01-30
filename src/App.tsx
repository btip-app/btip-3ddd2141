import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Landing
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Auth
import Auth from "./pages/Auth";

// Dashboard
import DashboardLayout from "./layouts/DashboardLayout";
import Overview from "./pages/dashboard/Overview";
import ThreatMap from "./pages/dashboard/ThreatMap";
import DailyBrief from "./pages/dashboard/DailyBrief";
import Alerts from "./pages/dashboard/Alerts";
import ActivityLog from "./pages/dashboard/ActivityLog";
import UserManagement from "./pages/dashboard/UserManagement";
import DashboardSettings from "./pages/dashboard/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Overview />} />
              <Route path="map" element={<ThreatMap />} />
              <Route path="brief" element={<DailyBrief />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="activity" element={<ActivityLog />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<DashboardSettings />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
