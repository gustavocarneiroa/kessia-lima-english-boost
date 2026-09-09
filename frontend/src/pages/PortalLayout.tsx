import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { GraduationCap, LayoutDashboard, LogOut, Smartphone, Users } from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export default function PortalLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const isTeacher = user.role === "teacher";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <img src={logo} alt="" className="h-7 w-auto" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">Teacher Kessia</p>
              <p className="truncate text-xs text-muted-foreground">Portal</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Início">
                    <NavLink
                      to="/portal"
                      end
                      className={({ isActive }) => cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                    >
                      <LayoutDashboard />
                      <span>Início</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {isTeacher && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Alunos">
                      <NavLink
                        to="/portal/alunos"
                        className={({ isActive }) => cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                      >
                        <Users />
                        <span>Alunos</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Dispositivos">
                    <NavLink
                      to="/portal/dispositivos"
                      className={({ isActive }) => cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                    >
                      <Smartphone />
                      <span>Dispositivos</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">{isTeacher ? "Professora" : "Aluno(a)"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start gap-2 text-muted-foreground"
            onClick={() => logout().then(() => navigate("/login"))}
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Sair</span>
          </Button>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 space-y-6 p-4 sm:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
