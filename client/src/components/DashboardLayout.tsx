import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  Brain,
  CreditCard,
  FileSearch,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FolderOpen, label: "Casos", path: "/casos" },
  { icon: Brain, label: "Análisis IA", path: "/analisis", badge: "IA" },
  { icon: FileSearch, label: "Evidencia", path: "/evidencia" },
  { icon: BarChart3, label: "Reportes", path: "/reportes" },
  { icon: CreditCard, label: "Suscripción", path: "/suscripcion" },
];

const adminItems = [{ icon: Shield, label: "Panel Admin", path: "/admin" }];

const SIDEBAR_WIDTH_KEY = "fla-sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  const loginDemo = trpc.auth.loginDemo.useMutation({
    onSuccess: () => window.location.reload(),
    onError: () => window.location.reload(),
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-14 h-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Acceso Requerido</h1>
            <p className="text-muted-foreground text-sm">
              Inicia sesión para acceder a la plataforma de análisis forense.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full"
          >
            Iniciar sesión
          </Button>
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              onClick={() => loginDemo.mutate()}
              disabled={loginDemo.isPending}
              className="w-full"
            >
              {loginDemo.isPending ? "Cargando..." : "Modo Demo (desarrollo)"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const { data: sub } = trpc.subscriptions.getMine.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH)
        setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const activeItem = [...menuItems, ...adminItems].find(
    item => location === item.path || location.startsWith(item.path + "/")
  );

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border bg-sidebar"
          disableTransition={isResizing}
        >
          {/* Header */}
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors shrink-0"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 bg-primary rounded flex items-center justify-center shrink-0">
                    <Shield className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-sm tracking-tight truncate">
                    Forensic<span className="text-primary">Legal</span>
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          {/* Navigation */}
          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.map(item => {
                const isActive =
                  location === item.path ||
                  location.startsWith(item.path + "/");
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-9 font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                      {item.badge && !isCollapsed && (
                        <Badge className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-primary/20 text-primary border-primary/30">
                          {item.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Admin section */}
            {user?.role === "admin" && (
              <>
                {!isCollapsed && (
                  <div className="px-4 py-2 mt-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                      Administración
                    </p>
                  </div>
                )}
                <SidebarMenu className="px-2">
                  {adminItems.map(item => {
                    const isActive = location === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 font-normal"
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </>
            )}

            {/* Subscription badge */}
            {!isCollapsed && sub && (
              <div className="px-3 mt-4">
                <div
                  className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    sub.plan === "free"
                      ? "bg-muted/50 border border-border hover:border-primary/30"
                      : "bg-primary/10 border border-primary/20"
                  }`}
                  onClick={() => setLocation("/suscripcion")}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium capitalize">{sub.plan}</span>
                    {sub.plan === "free" && (
                      <span className="text-primary text-[10px] font-medium">
                        Actualizar
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {sub.analysesUsed}/{sub.analysesLimit} análisis
                  </div>
                  <div className="mt-1.5 h-1 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min((sub.analysesUsed / sub.analysesLimit) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left focus:outline-none">
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name ?? "Usuario"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {user?.email ?? ""}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/suscripcion")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Suscripción
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8 rounded-lg" />
              <span className="text-sm font-medium">
                {activeItem?.label ?? "Dashboard"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-6 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
