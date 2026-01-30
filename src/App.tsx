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
import DailyBrief from "./pages/dashboard/DailyBrief";
import ThreatMap from "./pages/dashboard/ThreatMap";
import Assets from "./pages/dashboard/Assets";
import Alerts from "./pages/dashboard/Alerts";
import Copilot from "./pages/dashboard/Copilot";
import Admin from "./pages/dashboard/Admin";

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
              <Route index element={<DailyBrief />} />
              <Route path="brief" element={<DailyBrief />} />
              <Route path="map" element={<ThreatMap />} />
              <Route path="assets" element={<Assets />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="admin" element={<Admin />} />
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
