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
import ResetPassword from "./pages/ResetPassword";
import PortalLayout from "./pages/PortalLayout";
import PortalOverview from "./pages/portal/Overview";
import PortalStudents from "./pages/portal/Students";
import StudentDetail from "./pages/portal/StudentDetail";
import MyProfile from "./pages/portal/MyProfile";
import PortalDevices from "./pages/portal/Devices";
import VocabLists from "./pages/portal/VocabLists";
import VocabListDetail from "./pages/portal/VocabListDetail";
import Lessons from "./pages/portal/Lessons";
import Activities from "./pages/portal/Activities";
import LearningPath from "./pages/portal/LearningPath";
import ActivityDetail from "./pages/portal/ActivityDetail";
import Settings from "./pages/portal/Settings";

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
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<PortalOverview />} />
              <Route path="alunos" element={<PortalStudents />} />
              <Route path="alunos/:id" element={<StudentDetail />} />
              <Route path="perfil" element={<MyProfile />} />
              <Route path="dispositivos" element={<PortalDevices />} />
              <Route path="vocabulario" element={<VocabLists />} />
              <Route path="vocabulario/:id" element={<VocabListDetail />} />
              <Route path="aulas" element={<Lessons />} />
              <Route path="atividades" element={<Activities />} />
              <Route path="atividades/:id" element={<ActivityDetail />} />
              <Route path="trilha" element={<LearningPath />} />
              <Route path="configuracoes" element={<Settings />} />
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
