import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { PortalPrefsProvider, usePortalPrefs } from "@/contexts/PortalPrefsContext";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CalendarDays,
  CalendarRange,
  Calculator,
  GraduationCap,
  Languages,
  Library,
  Wallet,
  LayoutDashboard,
  Layers,
  LogOut,
  Map,
  MessagesSquare,
  Moon,
  Puzzle,
  Settings,
  Smartphone,
  Sun,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";
import ContractGate from "./portal/ContractGate";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: [pt: string, en: string];
  tooltip?: [pt: string, en: string];
  end?: boolean;
  only?: "teacher" | "student";
}

const NAV_ITEMS: NavItem[] = [
  { to: "/portal", icon: LayoutDashboard, label: ["Início", "Home"], end: true },
  { to: "/portal/aulas", icon: CalendarDays, label: ["Aulas", "Lessons"] },
  { to: "/portal/vocabulario", icon: Layers, label: ["Vocabulário", "Vocabulary"] },
  { to: "/portal/trilha", icon: Map, label: ["Trilha", "Path"], tooltip: ["Trilha de aprendizagem", "Learning path"] },
  { to: "/portal/atividades", icon: Puzzle, label: ["Atividades", "Activities"] },
  { to: "/portal/recursos", icon: Library, label: ["Recursos", "Resources"], tooltip: ["Recursos para praticar", "Practice resources"] },
  { to: "/portal/forum", icon: MessagesSquare, label: ["Fórum", "Forum"] },
  { to: "/portal/calendario", icon: CalendarRange, label: ["Calendário", "Calendar"] },
  { to: "/portal/financeiro", icon: Wallet, label: ["Financeiro", "Payments"] },
  { to: "/portal/orcamentos", icon: Calculator, label: ["Orçamentos", "Quotes"], only: "teacher" },
  { to: "/portal/alunos", icon: Users, label: ["Alunos", "Students"], only: "teacher" },
  { to: "/portal/perfil", icon: User, label: ["Meu perfil", "My profile"], only: "student" },
  { to: "/portal/dispositivos", icon: Smartphone, label: ["Dispositivos", "Devices"] },
  { to: "/portal/configuracoes", icon: Settings, label: ["Configurações", "Settings"], only: "teacher" },
];

function PortalSidebar({ user, onLogout }: { user: { email: string; role: string }; onLogout: () => void }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = usePortalPrefs();
  const isTeacher = user.role === "teacher";

  const closeMobileMenu = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <img src={logo} alt="" className="h-7 w-auto dark:invert" />
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
              {NAV_ITEMS.filter((item) => !item.only || item.only === (isTeacher ? "teacher" : "student")).map(
                (item) => {
                  const label = t(...item.label);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild tooltip={item.tooltip ? t(...item.tooltip) : label}>
                        <NavLink
                          to={item.to}
                          end={item.end}
                          onClick={closeMobileMenu}
                          className={({ isActive }) => cn(isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                        >
                          <item.icon />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                },
              )}
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
            <p className="text-xs text-muted-foreground">{isTeacher ? t("Professora", "Teacher") : t("Aluno(a)", "Student")}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start gap-2 text-muted-foreground"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">{t("Sair", "Log out")}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function PrefsToggles() {
  const { lang, setLang, theme, setTheme, t } = usePortalPrefs();
  const langLabel = lang === "en" ? "Mudar para português" : "Switch to English";
  const themeLabel = theme === "dark" ? t("Tema claro", "Light theme") : t("Tema escuro", "Dark theme");

  return (
    <div className="ml-auto flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setLang(lang === "en" ? "pt" : "en")}
            aria-label={langLabel}
          >
            <Languages className="h-4 w-4" />
            <span className="text-xs font-semibold">{lang === "en" ? "PT" : "EN"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{langLabel}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={themeLabel}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{themeLabel}</TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function PortalLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  const handleLogout = () => {
    logout().finally(() => navigate("/login"));
  };

  return (
    <PortalPrefsProvider>
      <ContractGate enabled={user.role === "student"} onLogout={handleLogout}>
      <SidebarProvider>
        <PortalSidebar user={user} onLogout={handleLogout} />

        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <PrefsToggles />
          </header>
          <div className="flex-1 space-y-6 p-4 sm:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
      </ContractGate>
    </PortalPrefsProvider>
  );
}
