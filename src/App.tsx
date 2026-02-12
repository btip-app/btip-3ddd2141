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
import AdminSignup from "./pages/AdminSignup";

// Dashboard
import DashboardLayout from "./layouts/DashboardLayout";
import DailyBrief from "./pages/dashboard/DailyBrief";
import ThreatMap from "./pages/dashboard/ThreatMap";
import Assets from "./pages/dashboard/Assets";
import Alerts from "./pages/dashboard/Alerts";
import Copilot from "./pages/dashboard/Copilot";
import Admin from "./pages/dashboard/Admin";
import AuditLog from "./pages/dashboard/AuditLog";
import IncidentReport from "./pages/dashboard/IncidentReport";
import Escalations from "./pages/dashboard/Escalations";
import AdminActivity from "./pages/dashboard/AdminActivity";
import ProfileSettings from "./pages/dashboard/ProfileSettings";
import Socmint from "./pages/dashboard/Socmint";
import EntityGraph from "./pages/dashboard/EntityGraph";
import KeysUsed from "./pages/KeysUsed";
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
              <Route path="/" element={<LandingV2 />} />
              <Route path="/v1" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin-signup" element={<AdminSignup />} />
              <Route path="/keys" element={<KeysUsed />} />
              
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
                <Route path="escalations" element={
                  <RoleGate allowed={['admin', 'analyst']} fallback="denied">
                    <Escalations />
                  </RoleGate>
                } />
                <Route path="admin" element={
                  <RoleGate allowed={['admin']} fallback="denied">
                    <Admin />
                  </RoleGate>
                } />
                <Route path="activity" element={
                  <RoleGate allowed={['admin']} fallback="denied">
                    <AdminActivity />
                  </RoleGate>
                } />
                <Route path="audit-log" element={
                  <RoleGate allowed={['admin']} fallback="denied">
                    <AuditLog />
                  </RoleGate>
                } />
                <Route path="socmint" element={
                  <RoleGate allowed={['admin', 'analyst', 'operator']} fallback="denied">
                    <Socmint />
                  </RoleGate>
                } />
                <Route path="entities" element={
                  <RoleGate allowed={['admin', 'analyst']} fallback="denied">
                    <EntityGraph />
                  </RoleGate>
                } />
                <Route path="incident/:id" element={<IncidentReport />} />
                <Route path="profile" element={<ProfileSettings />} />
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
