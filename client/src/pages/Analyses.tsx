import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  FileSearch,
  Loader2,
  Network,
  RefreshCw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { List } from "react-window";

const ROW_HEIGHT = 92;

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  pendiente: {
    label: "Pendiente",
    className: "border-gray-700 text-gray-400",
    icon: Clock,
  },
  procesando: {
    label: "Procesando",
    className: "border-yellow-800/50 text-yellow-400 bg-yellow-900/20",
    icon: Loader2,
  },
  completado: {
    label: "Completado",
    className: "border-green-800/50 text-green-400 bg-green-900/20",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "border-red-800/50 text-red-400 bg-red-900/20",
    icon: AlertTriangle,
  },
};

interface AnalysisRowProps {
  analyses: any[];
  navigate: (path: string) => void;
  statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ElementType }
  >;
}

function AnalysisRow({
  index,
  style,
  analyses,
  navigate,
  statusConfig,
}: {
  index: number;
  style: React.CSSProperties;
} & AnalysisRowProps) {
  const a = analyses[index];
  const statusCfg = statusConfig[a.status];
  const StatusIcon = statusCfg.icon;
  const keyFindingsRaw = a.keyFindings;
  const keyFindings = Array.isArray(keyFindingsRaw)
    ? keyFindingsRaw
    : typeof keyFindingsRaw === "string"
      ? JSON.parse(keyFindingsRaw || "[]")
      : [];
  const criticalCount = keyFindings.filter(
    (f: any) => f.severity === "alta"
  ).length;
  const timelineRaw = a.timelineEvents;
  const timelineEvents = Array.isArray(timelineRaw)
    ? timelineRaw
    : typeof timelineRaw === "string"
      ? JSON.parse(timelineRaw || "[]")
      : [];
  const timelineCount = timelineEvents.length;
  const graphRaw = a.relationshipGraph;
  const relationshipGraph =
    typeof graphRaw === "string"
      ? JSON.parse(graphRaw || "{}")
      : graphRaw || {};
  const graphNodes = relationshipGraph?.nodes?.length ?? 0;

  return (
    <div style={style}>
      <Card
        className="bg-card border-border hover:border-primary/30 transition-all cursor-pointer"
        onClick={() =>
          a.status === "completado" && navigate(`/analisis/${a.id}`)
        }
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0 h-5 shrink-0 ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {(a.evidenceCount ?? 0) > 0 &&
                  ` · ${a.evidenceCount} evidencias`}
              </p>
              {a.status === "completado" && (
                <div className="flex items-center gap-4 text-xs flex-wrap">
                  {criticalCount > 0 && (
                    <span className="flex items-center gap-1 text-red-400">
                      <AlertTriangle className="w-3 h-3" />
                      {criticalCount} crítico
                      {criticalCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-blue-400">
                    <Clock className="w-3 h-3" />
                    {timelineCount} eventos
                  </span>
                  <span className="flex items-center gap-1 text-green-400">
                    <Network className="w-3 h-3" />
                    {graphNodes} entidades
                  </span>
                </div>
              )}
            </div>
            {a.status === "completado" && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 h-8 text-xs"
              >
                <FileSearch className="w-3.5 h-3.5 mr-1" />
                Ver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-muted rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                <div className="flex gap-4">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Analyses() {
  const [, navigate] = useLocation();
  const {
    data: analyses = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.analyses.listAll.useQuery();
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { height } = entries[0].contentRect;
      if (height > 0) setListHeight(height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const itemData = { analyses, navigate, statusConfig };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full gap-6">
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-bold">Análisis Forenses</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {analyses.length} análisis realizados
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {isLoading ? (
          <AnalysisSkeleton />
        ) : isError ? (
          <Card className="bg-card border-destructive/30">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-destructive font-medium mb-1">
                Error al cargar análisis
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {error?.message ?? "Intenta de nuevo más tarde"}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : analyses.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <Brain className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                No hay análisis realizados
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Abre un caso, carga evidencia y ejecuta el análisis IA
              </p>
              <Button onClick={() => navigate("/casos")}>
                <FileSearch className="w-4 h-4 mr-2" />
                Ir a casos
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div ref={listRef} className="flex-1 min-h-0">
            <List<AnalysisRowProps>
              style={{ height: listHeight, width: "100%" }}
              rowCount={analyses.length}
              rowHeight={ROW_HEIGHT}
              rowProps={itemData}
              rowComponent={AnalysisRow}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
