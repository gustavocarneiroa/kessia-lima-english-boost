import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AceternityDemo from "./pages/AceternityDemo";
import Wordle from "./pages/Wordle";
import Login from "./pages/Login";
import PortalLayout from "./pages/PortalLayout";
import PortalOverview from "./pages/portal/Overview";
import PortalStudents from "./pages/portal/Students";
import PortalDevices from "./pages/portal/Devices";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/aceternity" element={<AceternityDemo />} />
            <Route path="/wordle" element={<Wordle />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalOverview />} />
              <Route path="alunos" element={<PortalStudents />} />
              <Route path="dispositivos" element={<PortalDevices />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
