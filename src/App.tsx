import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuditLogProvider } from "@/hooks/useAuditLog";

// Landing
import Index from "./pages/Index";
import LandingV2 from "./pages/LandingV2";
import NotFound from "./pages/NotFound";

// Auth
import Auth from "./pages/Auth";

// Dashboard
import DashboardLayout from "./layouts/DashboardLayout";
import DailyBrief from "./pages/dashboard/DailyBrief";
import ThreatMap from "./pages/dashboard/ThreatMap";
import Assets from "./pages/dashboard/Assets";
import Alerts from "./pages/dashboard/Alerts";
import Copilot from "./pages/dashboard/Copilot";
import Admin from "./pages/dashboard/Admin";
import AuditLog from "./pages/dashboard/AuditLog";
import { RoleGate } from "@/components/dashboard/RoleGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuditLogProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/v2" element={<LandingV2 />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DailyBrief />} />
                <Route path="brief" element={<DailyBrief />} />
                <Route path="map" element={
                  <RoleGate allowed={['admin', 'analyst', 'operator']} fallback="denied">
                    <ThreatMap />
                  </RoleGate>
                } />
                <Route path="assets" element={
                  <RoleGate allowed={['admin', 'analyst', 'operator']} fallback="denied">
                    <Assets />
                  </RoleGate>
                } />
                <Route path="alerts" element={
                  <RoleGate allowed={['admin', 'analyst', 'operator']} fallback="denied">
                    <Alerts />
                  </RoleGate>
                } />
                <Route path="copilot" element={
                  <RoleGate allowed={['admin', 'analyst', 'operator']} fallback="denied">
                    <Copilot />
                  </RoleGate>
                } />
                <Route path="admin" element={
                  <RoleGate allowed={['admin']} fallback="denied">
                    <Admin />
                  </RoleGate>
                } />
                <Route path="audit-log" element={
                  <RoleGate allowed={['admin']} fallback="denied">
                    <AuditLog />
                  </RoleGate>
                } />
              </Route>
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuditLogProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
