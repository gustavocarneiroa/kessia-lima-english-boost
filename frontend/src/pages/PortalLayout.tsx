import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
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
  ChevronDown,
  FileSignature,
  Gauge,
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
import { LEVEL_TEST_FOR_STUDENTS } from "@/lib/levelTest";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: [pt: string, en: string];
  tooltip?: [pt: string, en: string];
  end?: boolean;
}

const ITEMS = {
  home: { to: "/portal", icon: LayoutDashboard, label: ["Início", "Home"], end: true },
  lessons: { to: "/portal/aulas", icon: CalendarDays, label: ["Aulas", "Lessons"] },
  calendar: { to: "/portal/calendario", icon: CalendarRange, label: ["Calendário", "Calendar"] },
  forum: { to: "/portal/forum", icon: MessagesSquare, label: ["Fórum", "Forum"] },
  students: { to: "/portal/alunos", icon: Users, label: ["Alunos", "Students"] },
  activities: { to: "/portal/atividades", icon: Puzzle, label: ["Atividades", "Activities"] },
  vocab: { to: "/portal/vocabulario", icon: Layers, label: ["Vocabulário", "Vocabulary"] },
  path: { to: "/portal/trilha", icon: Map, label: ["Trilha", "Path"], tooltip: ["Trilha de aprendizagem", "Learning path"] },
  levelTest: { to: "/portal/teste-de-nivel", icon: Gauge, label: ["Teste de nível", "Level test"] },
  resources: { to: "/portal/recursos", icon: Library, label: ["Recursos", "Resources"], tooltip: ["Recursos para praticar", "Practice resources"] },
  payments: { to: "/portal/financeiro", icon: Wallet, label: ["Financeiro", "Payments"] },
  quotes: { to: "/portal/orcamentos", icon: Calculator, label: ["Orçamentos", "Quotes"] },
  contracts: { to: "/portal/contratos", icon: FileSignature, label: ["Contratos", "Contracts"] },
  profile: { to: "/portal/perfil", icon: User, label: ["Meu perfil", "My profile"] },
  devices: { to: "/portal/dispositivos", icon: Smartphone, label: ["Dispositivos", "Devices"] },
  settings: { to: "/portal/configuracoes", icon: Settings, label: ["Configurações", "Settings"] },
} satisfies Record<string, NavItem>;

interface NavGroup {
  id: string;
  label: [pt: string, en: string];
  items: NavItem[];
}

const TEACHER_GROUPS: NavGroup[] = [
  { id: "t-day", label: ["Dia a dia", "Day to day"], items: [ITEMS.home, ITEMS.lessons, ITEMS.calendar, ITEMS.forum] },
  {
    id: "t-ped",
    label: ["Pedagógico", "Teaching"],
    items: [ITEMS.students, ITEMS.activities, ITEMS.vocab, ITEMS.path, ITEMS.levelTest, ITEMS.resources],
  },
  { id: "t-admin", label: ["Administrativo", "Admin"], items: [ITEMS.payments, ITEMS.quotes, ITEMS.contracts] },
  { id: "t-account", label: ["Conta", "Account"], items: [ITEMS.settings, ITEMS.devices] },
];

const STUDENT_GROUPS: NavGroup[] = [
  { id: "s-lessons", label: ["Minhas aulas", "My lessons"], items: [ITEMS.home, ITEMS.lessons, ITEMS.calendar] },
  {
    id: "s-practice",
    label: ["Praticar", "Practice"],
    items: [
      ITEMS.activities,
      ITEMS.vocab,
      ITEMS.path,
      ...(LEVEL_TEST_FOR_STUDENTS ? [ITEMS.levelTest] : []),
      ITEMS.resources,
      ITEMS.forum,
    ],
  },
  { id: "s-account", label: ["Minha conta", "My account"], items: [ITEMS.payments, ITEMS.profile, ITEMS.devices] },
];

const CLOSED_GROUPS_KEY = "portal:closed-nav-groups";

function isItemActive(item: NavItem, pathname: string) {
  if (item.end) return pathname === item.to || pathname === `${item.to}/`;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/** Grupos que a pessoa fechou ficam lembrados neste navegador. */
function useClosedGroups() {
  const [closed, setClosed] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CLOSED_GROUPS_KEY) ?? "[]");
      return Array.isArray(saved) ? saved.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const toggle = (id: string) => {
    setClosed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify(next));
      } catch {
        /* sem localStorage: só não lembra */
      }
      return next;
    });
  };
  return { closed, toggle };
}

function PortalSidebar({ user, onLogout }: { user: { email: string; role: string }; onLogout: () => void }) {
  const { isMobile, setOpenMobile, state } = useSidebar();
  const { t } = usePortalPrefs();
  const { pathname } = useLocation();
  const { closed, toggle } = useClosedGroups();
  const isTeacher = user.role === "teacher";
  const groups = isTeacher ? TEACHER_GROUPS : STUDENT_GROUPS;
  // Menu encolhido (só ícones): mostra tudo, porque os títulos dos grupos somem.
  const iconsOnly = state === "collapsed" && !isMobile;

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
        {groups.map((group) => {
          const hasActive = group.items.some((item) => isItemActive(item, pathname));
          // O grupo da página aberta fica sempre aberto, pra nunca "sumir" de onde a pessoa está.
          const open = iconsOnly || hasActive || !closed.includes(group.id);
          const groupLabel = t(...group.label);
          return (
            <SidebarGroup key={group.id} className="py-1">
              <SidebarGroupLabel asChild>
                <button
                  type="button"
                  onClick={() => toggle(group.id)}
                  disabled={hasActive}
                  aria-expanded={open}
                  className="w-full justify-between uppercase tracking-wider hover:text-sidebar-foreground disabled:cursor-default disabled:hover:text-sidebar-foreground/70 group-data-[collapsible=icon]:pointer-events-none"
                >
                  <span>{groupLabel}</span>
                  {!hasActive && (
                    <ChevronDown className={cn("transition-transform duration-200", !open && "-rotate-90")} />
                  )}
                </button>
              </SidebarGroupLabel>
              {open && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
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
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
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

/** Faixa fixa no topo enquanto a professora está em "ver como aluno". */
function ViewAsBanner({ name }: { name: string }) {
  const { stopViewAs } = useAuth();
  const { t } = usePortalPrefs();
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <span>
        {t(`Você está vendo o portal como ${name}`, `You're viewing the portal as ${name}`)}
        <span className="font-normal"> · {t("só pra olhar, nada é salvo", "view only, nothing is saved")}</span>
      </span>
      <button
        type="button"
        className="rounded-md bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-50 hover:bg-amber-900 disabled:opacity-60"
        disabled={leaving}
        onClick={() => {
          setLeaving(true);
          stopViewAs().catch(() => setLeaving(false));
        }}
      >
        {leaving ? t("Voltando…", "Going back…") : t("Voltar pra minha conta", "Back to my account")}
      </button>
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
      {user.viewingAs && <ViewAsBanner name={user.viewingAs.name} />}
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
