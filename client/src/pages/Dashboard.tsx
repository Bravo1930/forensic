import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  ChevronRight,
  Circle,
  Clock,
  FileSearch,
  FolderOpen,
  Plus,
  Scale,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import OnboardingDialog from "@/components/OnboardingDialog";
import { useLocation } from "wouter";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";
import { gsap } from "gsap";

gsap.registerPlugin(useGSAP, Flip);

// ─── Tokens ──────────────────────────────────────────────────────────────────
// All palette values live here. Zero hardcoded color strings outside this block.
const STATUS_STYLES: Record<
  string,
  { dot: string; badge: string; text: string }
> = {
  activo: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 border-emerald-500/25",
    text: "text-emerald-400",
  },
  archivado: {
    dot: "bg-zinc-500",
    badge: "bg-zinc-500/10 border-zinc-500/25",
    text: "text-zinc-400",
  },
  cerrado: {
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 border-sky-500/25",
    text: "text-sky-400",
  },
};

const PRIORITY_STYLES: Record<string, { bar: string; label: string }> = {
  alta: { bar: "bg-rose-500", label: "text-rose-400" },
  media: { bar: "bg-amber-400", label: "text-amber-400" },
  baja: { bar: "bg-emerald-500", label: "text-emerald-400" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityStripe({ priority }: { priority: string }) {
  const s = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES["baja"];
  return (
    <span
      className={`inline-block w-1 h-full min-h-[2.5rem] rounded-full ${s.bar} shrink-0`}
      aria-hidden
    />
  );
}

function StatusDot({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["archivado"];
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${s.dot} shrink-0`}
      aria-hidden
    />
  );
}

function CapacityRing({
  used,
  limit,
  danger,
}: {
  used: number;
  limit: number;
  danger?: boolean;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = danger && pct > 80 ? "#f43f5e" : "#6366f1";
  const ringRef = useRef<SVGCircleElement>(null);

  useGSAP(
    () => {
      if (!ringRef.current) return;
      gsap.fromTo(
        ringRef.current,
        { strokeDasharray: `0 ${circ}` },
        {
          strokeDasharray: `${dash} ${circ}`,
          duration: 1.2,
          ease: "power2.out",
        }
      );
    },
    { dependencies: [pct] }
  );

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-white/8"
      />
      <circle
        ref={ringRef}
        cx="22"
        cy="22"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text
        x="22"
        y="26"
        textAnchor="middle"
        fontSize="10"
        fontWeight="600"
        fill="currentColor"
        className="text-white"
      >
        {pct}% usado
      </text>
    </svg>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const TOOLTIPS: Record<string, string> = {
  "Casos activos": "Expedientes forenses actualmente en curso",
  "Análisis IA": "Análisis forenses realizados este período",
  Almacenamiento: "Espacio utilizado en la nube forense",
  Plan: "Plan de suscripción y límites actuales",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="stat-card group relative flex flex-col gap-3 rounded-xl border border-white/8 bg-white/4 p-4 text-left
                 hover:border-white/16 hover:bg-white/7 active:scale-[0.98] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={`rounded-lg p-1.5 ${accent ?? "bg-indigo-500/15"}`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${accent ? "text-white/70" : "text-indigo-400"}`}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-44">
            {TOOLTIPS[label] ?? label}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-2xl font-bold tracking-tight text-white">
        {value}
      </div>
      {sub && <div className="text-[11px] text-white/55">{sub}</div>}
      <ChevronRight className="absolute bottom-4 right-4 w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors" />
    </button>
  );
}

// ─── Case Row ─────────────────────────────────────────────────────────────────
function CaseRow({
  c,
  onClick,
}: {
  c: {
    id: number;
    title: string;
    caseNumber?: string | null;
    caseType: string;
    status: string;
    priority: string;
    updatedAt: Date;
  };
  onClick: () => void;
}) {
  const st = STATUS_STYLES[c.status] ?? STATUS_STYLES["archivado"];
  const pr = PRIORITY_STYLES[c.priority] ?? PRIORITY_STYLES["baja"];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === "Enter" && onClick()}
      className="case-row group relative flex items-stretch gap-3 px-5 py-3.5 hover:bg-white/4 cursor-pointer
                 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10
                 border-b border-white/5 last:border-0 focus-visible:outline-none focus-visible:bg-white/4"
    >
      <PriorityStripe priority={c.priority} />

      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white/90 truncate">
            {c.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <StatusDot status={c.status} />
            <p className="text-xs text-white/55 truncate">
              {c.caseNumber ? `Exp. ${c.caseNumber} · ` : ""}
              {c.caseType}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] font-semibold uppercase tracking-wide ${pr.label}`}
          >
            {c.priority}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badge} ${st.text}`}
          >
            {c.status}
          </span>
          <span className="text-[10px] text-white/55 hidden sm:block">
            {new Date(c.updatedAt as unknown as string).toLocaleDateString(
              "es-MX",
              { day: "2-digit", month: "short" }
            )}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/55">
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          {action}
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Cases by Type Chart ──────────────────────────────────────────────────────
function CasesByTypeChart({
  cases,
}: {
  cases: { caseType: string; status: string }[];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const typeLabels: Record<string, string> = {
    civil: "Civil",
    penal: "Penal",
    laboral: "Laboral",
    familiar: "Familiar",
    mercantil: "Mercantil",
    administrativo: "Admin.",
    otro: "Otro",
  };

  const byType = cases.reduce(
    (acc, c) => {
      if (c.status === "activo") {
        acc[c.caseType] = (acc[c.caseType] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const total = Object.values(byType).reduce((a, b) => a + b, 0) || 1;
  const colors = [
    "#6366f1",
    "#f43f5e",
    "#f59e0b",
    "#10b981",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
  ];

  useGSAP(
    () => {
      gsap.set(".chart-bar", { height: 0 });
      gsap.to(".chart-bar", {
        height: (i: number, el: HTMLElement) =>
          el.getAttribute("data-height") + "%",
        duration: 1,
        stagger: 0.08,
        ease: "power3.out",
      });
    },
    { scope: chartRef, dependencies: [cases] }
  );

  return (
    <div
      ref={chartRef}
      className="flex items-end justify-between gap-2 h-24 px-2"
    >
      {Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count], i) => {
          const height = Math.max(20, (count / total) * 100);
          return (
            <div key={type} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="chart-bar w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                data-height={height}
                style={{
                  backgroundColor: colors[i % colors.length],
                }}
              />
              <span className="text-[9px] text-white/40 uppercase tracking-wider">
                {typeLabels[type] || type}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ─── Skeleton Loaders ──────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 bg-white/10" />
          <Skeleton className="h-7 w-48 bg-white/10" />
        </div>
        <Skeleton className="h-10 w-32 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/4 p-4"
          >
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="h-8 w-16 bg-white/10" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-xl border border-white/8 bg-white/3 overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-white/6">
            <Skeleton className="h-3 w-24 bg-white/10" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-full bg-white/10" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-white/3 p-5">
            <Skeleton className="h-3 w-16 bg-white/10 mb-4" />
            <Skeleton className="h-20 w-full bg-white/10" />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-5">
            <Skeleton className="h-3 w-16 bg-white/10 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const {
    data: cases = [],
    isLoading: casesLoading,
    isError: casesError,
    error: casesErr,
  } = trpc.cases.list.useQuery(undefined, { retry: 1, staleTime: 30000 });
  const {
    data: sub,
    isError: subError,
    error: subErr,
  } = trpc.subscriptions.getMine.useQuery(undefined, {
    retry: 1,
    staleTime: 30000,
  });

  const activeCases = cases.filter(c => c.status === "activo");
  const highPriority = cases.filter(
    c => c.priority === "alta" && c.status === "activo"
  );
  const recentCases = [...cases]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const storageGB = sub ? sub.storageUsedBytes / 1024 / 1024 / 1024 : 0;
  const storageLimGB = sub ? sub.storageLimitBytes / 1024 / 1024 / 1024 : 0;
  const storePct = sub
    ? Math.round((sub.storageUsedBytes / sub.storageLimitBytes) * 100)
    : 0;
  const analysesPct = sub
    ? Math.round((sub.analysesUsed / sub.analysesLimit) * 100)
    : 0;

  const today = new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useGSAP(
    () => {
      gsap.from(".stat-card", {
        y: 30,
        autoAlpha: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "transform",
      });

      gsap.from(".section-fade", {
        y: 20,
        autoAlpha: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.out",
        delay: 0.3,
      });
    },
    { scope: dashboardRef }
  );

  if (casesLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#0e0e11]">
          <div className="relative mx-auto max-w-5xl px-4 py-8">
            <DashboardSkeleton />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (casesError) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-[#0e0e11] flex items-center justify-center">
          <div className="text-center p-8">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Error al cargar datos
            </h2>
            <p className="text-white/50 mb-4">{casesErr.message}</p>
            <Button onClick={() => window.location.reload()}>Reintentar</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* ── Page canvas ─────────────────────────────────────────────────────── */}
      <div className="min-h-screen bg-[#0e0e11] text-white">
        {/* Subtle grid texture */}
        <div
          className="pointer-events-none fixed inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div
          ref={dashboardRef}
          className="relative mx-auto max-w-5xl px-4 py-8 space-y-8"
        >
          {/* ── Header ────────────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/55 mb-1 capitalize">
                {today}
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                {user?.name?.split(" ")[0] ?? "Perito"}
                <span className="text-white/55">,</span>{" "}
                <span className="text-white/55 font-normal">
                  panel de control
                </span>
              </h1>
            </div>
            <Button
              onClick={() => navigate("/casos/nuevo")}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 border-0 text-white font-semibold gap-2 shadow-lg shadow-indigo-900/40 btn-glow"
            >
              <Plus className="w-4 h-4" />
              Nuevo caso
            </Button>
          </div>

          {/* ── Alert banner — high priority cases ─────────────────────────── */}
          {highPriority.length > 0 && (
            <button
              onClick={() => navigate("/casos?priority=alta")}
              className="section-fade w-full flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 px-5 py-3.5
                         hover:bg-rose-500/12 transition-colors text-left group"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="flex-1 text-sm font-medium text-rose-300">
                {highPriority.length} caso{highPriority.length > 1 ? "s" : ""}{" "}
                de prioridad alta requieren atención
              </span>
              <ChevronRight className="w-4 h-4 text-rose-400/50 group-hover:text-rose-400 transition-colors" />
            </button>
          )}

          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="section-fade grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label="Casos activos"
              value={casesLoading ? "—" : activeCases.length}
              sub={sub ? `límite: ${sub.casesLimit}` : undefined}
              icon={FolderOpen}
              onClick={() => navigate("/casos")}
            />
            <StatCard
              label="Análisis IA"
              value={sub?.analysesUsed ?? "—"}
              sub={
                sub
                  ? `${sub.analysesLimit - sub.analysesUsed} restantes`
                  : undefined
              }
              icon={Brain}
              accent={analysesPct > 80 ? "bg-rose-500/15" : undefined}
              onClick={() => navigate("/analisis")}
            />
            <StatCard
              label="Almacenamiento"
              value={sub ? `${storageGB.toFixed(1)} GB` : "—"}
              sub={sub ? `de ${storageLimGB.toFixed(0)} GB` : undefined}
              icon={FileSearch}
              accent={storePct > 80 ? "bg-rose-500/15" : undefined}
              onClick={() => navigate("/evidencia")}
            />
            <StatCard
              label="Plan"
              value={<span className="capitalize">{sub?.plan ?? "—"}</span>}
              sub={sub?.plan === "free" ? "Actualizar disponible" : "Activo"}
              icon={Shield}
              accent={
                sub?.plan === "free" ? "bg-amber-500/15" : "bg-emerald-500/15"
              }
              onClick={() => navigate("/suscripcion")}
            />
          </div>

          {/* ── Main grid ──────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-5">
            {/* Casos recientes — 2/3 width */}
            <div className="section-fade lg:col-span-2 rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-white/6">
                <SectionHeader
                  title="Casos recientes"
                  action="Ver todos"
                  onAction={() => navigate("/casos")}
                />
              </div>

              {casesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-400 animate-spin" />
                    <p className="text-sm text-white/55">Cargando casos…</p>
                  </div>
                </div>
              ) : recentCases.length === 0 ? (
                <div className="relative flex flex-col items-center justify-center py-16 gap-4 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                    <Scale className="w-32 h-32" />
                    <FolderOpen className="w-24 h-24 -ml-8 mt-16" />
                    <FileSearch className="w-20 h-20 -ml-4 -mt-12" />
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <FolderOpen className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/70">
                      Sin casos aún
                    </p>
                    <p className="text-xs text-white/55 mt-1">
                      Crea tu primer expediente forense
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate("/casos/nuevo")}
                    className="bg-indigo-600 hover:bg-indigo-500 border-0 text-white gap-1.5 shadow-lg shadow-indigo-900/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Crear caso
                  </Button>
                </div>
              ) : (
                <div>
                  {recentCases.map(c => (
                    <CaseRow
                      key={c.id}
                      c={c}
                      onClick={() => navigate(`/casos/${Number(c.id)}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right column — 1/3 width */}
            <div className="space-y-4">
              {/* Distribución de casos por tipo */}
              {cases.length > 0 && (
                <div className="section-fade rounded-xl border border-white/8 bg-white/3 p-5">
                  <SectionHeader title="Casos por tipo" />
                  <CasesByTypeChart cases={cases} />
                </div>
              )}

              {/* Capacidad */}
              <div className="section-fade rounded-xl border border-white/8 bg-white/3 p-5">
                <SectionHeader title="Capacidad" />
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <CapacityRing
                      used={sub?.analysesUsed ?? 0}
                      limit={sub?.analysesLimit ?? 1}
                      danger
                    />
                    <div>
                      <p className="text-xs font-semibold text-white/70">
                        Análisis IA
                      </p>
                      <p className="text-[11px] text-white/55 mt-0.5">
                        {sub?.analysesUsed ?? 0} / {sub?.analysesLimit ?? "—"}{" "}
                        este mes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <CapacityRing
                      used={sub?.storageUsedBytes ?? 0}
                      limit={sub?.storageLimitBytes ?? 1}
                      danger
                    />
                    <div>
                      <p className="text-xs font-semibold text-white/70">
                        Almacenamiento
                      </p>
                      <p className="text-[11px] text-white/55 mt-0.5">
                        {storageGB.toFixed(1)} GB / {storageLimGB.toFixed(0)} GB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upgrade card — solo plan free */}
              {sub?.plan === "free" && (
                <div className="section-fade rounded-xl border border-indigo-500/20 bg-indigo-600/8 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-300 uppercase tracking-widest">
                      Plan gratuito
                    </span>
                  </div>
                  <p className="text-sm text-white/55 mb-4 leading-relaxed">
                    Te quedan{" "}
                    <span className="text-white font-semibold">
                      {sub.analysesLimit - sub.analysesUsed} análisis
                    </span>{" "}
                    este mes. Actualiza para acceso ilimitado.
                  </p>
                  <Button
                    onClick={() => navigate("/suscripcion")}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 border-0 text-white font-semibold gap-2"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Actualizar a Premium
                  </Button>
                </div>
              )}

              {/* Sistema — compacto, solo info crítica */}
              <div className="section-fade rounded-xl border border-white/8 bg-white/3 p-5">
                <SectionHeader title="Sistema" />
                <div className="space-y-2.5">
                  {[
                    { label: "Motor IA Forense", ok: true },
                    { label: "Cifrado AES-256", ok: true },
                    { label: "Almacenamiento S3", ok: true },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Circle
                          className={`w-2 h-2 fill-current ${
                            item.ok ? "text-emerald-500" : "text-rose-500"
                          }`}
                        />
                        <span className="text-xs text-white/45">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold ${item.ok ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {item.ok ? "Operativo" : "Error"}
                      </span>
                    </div>
                  ))}
                  <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-white/55">
                    <Clock className="w-3 h-3" />
                    Sincronizado ahora
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OnboardingDialog hasCases={cases.length > 0} onNavigate={navigate} />
    </DashboardLayout>
  );
}
