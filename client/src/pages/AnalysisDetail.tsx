import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Network,
  Scale,
  Shield,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";
import { sanitizeHtml } from "@/lib/sanitize";
import TimelineView from "@/components/TimelineView";
import RelationshipGraph from "@/components/RelationshipGraph";

interface KeyFinding {
  title: string;
  description: string;
  severity: "alta" | "media" | "baja";
  category?: string;
  evidenceIds?: number[];
}

interface TimelineEvent {
  id?: string;
  date: string;
  title: string;
  description: string;
  type: string;
  evidenceRef?: string;
  evidenceId?: number;
  persons?: string[];
  locations?: string[];
  relevance?: "alta" | "media" | "baja";
  significance?: "alta" | "media" | "baja";
}

const severityConfig = {
  alta: {
    label: "Alta",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: AlertTriangle,
  },
  media: {
    label: "Media",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
  },
  baja: {
    label: "Baja",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
};

export default function AnalysisDetail() {
  const params = useParams<{ id: string }>();
  const analysisId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const { data: analysis, isLoading } = trpc.analyses.getById.useQuery(
    { id: analysisId },
    { enabled: !!analysisId }
  );

  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: data => {
      toast.success("Reporte PDF generado");
      window.open(data.url, "_blank");
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!analysis) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Análisis no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/analisis")}
          >
            Volver a análisis
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const keyFindings = (analysis.keyFindings as unknown as KeyFinding[]) ?? [];
  const timelineEvents =
    (analysis.timelineEvents as unknown as TimelineEvent[]) ?? [];
  const relationshipGraph = (analysis.relationshipGraph as unknown as {
    nodes: unknown[];
    edges: unknown[];
  }) ?? { nodes: [], edges: [] };
  const criticalFindings = keyFindings.filter(f => f.severity === "alta");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 mt-1"
            onClick={() => navigate(`/casos/${analysis.caseId}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{analysis.title}</h1>
              <Badge
                variant="outline"
                className="border-green-800/50 text-green-400 bg-green-900/20 text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Completado
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(analysis.createdAt).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {analysis.processingTimeMs &&
                ` · Procesado en ${(analysis.processingTimeMs / 1000).toFixed(1)}s`}
              {(analysis.evidenceCount ?? 0) > 0 &&
                ` · ${analysis.evidenceCount} evidencias analizadas`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              generateReport.mutate({
                caseId: analysis.caseId,
                analysisId: analysis.id,
              })
            }
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>

        {/* Critical findings alert */}
        {criticalFindings.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-sm mb-1">
                    {criticalFindings.length} hallazgo
                    {criticalFindings.length !== 1 ? "s" : ""} de severidad alta
                    detectado{criticalFindings.length !== 1 ? "s" : ""}
                  </p>
                  <div className="space-y-1">
                    {criticalFindings.map((f, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        · {f.title}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key findings summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Hallazgos críticos",
              value: keyFindings.filter(f => f.severity === "alta").length,
              color: "text-red-400",
              icon: AlertTriangle,
            },
            {
              label: "Eventos en timeline",
              value: timelineEvents.length,
              color: "text-blue-400",
              icon: Clock,
            },
            {
              label: "Entidades relacionadas",
              value: relationshipGraph.nodes.length,
              color: "text-green-400",
              icon: Network,
            },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="bg-card/50 border-border/50 hover:border-primary/20 transition-all duration-300"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${stat.color.replace("text-", "bg-")}/10`}
                  >
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="resumen">
          <TabsList className="bg-card/50 border border-border/50 flex-wrap h-auto gap-1 p-1 rounded-xl">
            <TabsTrigger
              value="resumen"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Resumen
            </TabsTrigger>
            <TabsTrigger
              value="dictamen"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Shield className="w-4 h-4 mr-1.5" />
              Dictamen Pericial
            </TabsTrigger>
            <TabsTrigger
              value="teorias"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Scale className="w-4 h-4 mr-1.5" />
              Teorías del Caso
            </TabsTrigger>
            <TabsTrigger
              value="hallazgos"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Target className="w-4 h-4 mr-1.5" />
              Hallazgos
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Timeline
            </TabsTrigger>
            <TabsTrigger
              value="relaciones"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Network className="w-4 h-4 mr-1.5" />
              Relaciones
            </TabsTrigger>
          </TabsList>

          {/* Resumen ejecutivo */}
          <TabsContent value="resumen" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  Resumen Ejecutivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.executiveSummary ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>
                      {sanitizeHtml(analysis.executiveSummary)}
                    </Streamdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No disponible</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dictamen pericial */}
          <TabsContent value="dictamen" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Dictamen Pericial
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysis.expertOpinion ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>
                      {sanitizeHtml(analysis.expertOpinion)}
                    </Streamdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Inconsistencies */}
            {analysis.inconsistencies && (
              <Card className="bg-card border-border mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive" />
                    Inconsistencias y Posibles Manipulaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>
                      {sanitizeHtml(analysis.inconsistencies)}
                    </Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suspicious patterns */}
            {analysis.suspiciousPatterns && (
              <Card className="bg-card border-border mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Patrones Sospechosos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>
                      {sanitizeHtml(analysis.suspiciousPatterns)}
                    </Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Teorías del caso */}
          <TabsContent value="teorias" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-card/50 border-border/50 hover:border-red-500/20 transition-all duration-300">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-red-400">Teoría de la Acusación</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {analysis.prosecutionTheory ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Streamdown>
                        {sanitizeHtml(analysis.prosecutionTheory)}
                      </Streamdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No disponible
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border/50 hover:border-blue-500/20 transition-all duration-300">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-blue-400">Teoría de la Defensa</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {analysis.defenseTheory ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <Streamdown>
                        {sanitizeHtml(analysis.defenseTheory)}
                      </Streamdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No disponible
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Hallazgos clave */}
          <TabsContent value="hallazgos" className="mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Hallazgos Clave ({keyFindings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keyFindings.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No se identificaron hallazgos clave
                  </p>
                ) : (
                  <div className="space-y-3">
                    {keyFindings.map((finding, i) => {
                      const sev =
                        severityConfig[finding.severity] || severityConfig.baja;
                      const SevIcon = sev.icon;
                      return (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                            finding.severity === "alta"
                              ? "bg-red-950/20 border-red-500/20 hover:border-red-500/40"
                              : finding.severity === "media"
                                ? "bg-amber-950/20 border-amber-500/20 hover:border-amber-500/40"
                                : "bg-emerald-950/20 border-emerald-500/20 hover:border-emerald-500/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                  finding.severity === "alta"
                                    ? "bg-red-500/10"
                                    : finding.severity === "media"
                                      ? "bg-amber-500/10"
                                      : "bg-emerald-500/10"
                                }`}
                              >
                                <SevIcon
                                  className={`w-4 h-4 ${
                                    finding.severity === "alta"
                                      ? "text-red-400"
                                      : finding.severity === "media"
                                        ? "text-amber-400"
                                        : "text-emerald-400"
                                  }`}
                                />
                              </div>
                              <h4 className="font-semibold text-sm text-foreground">
                                {finding.title}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {finding.category && (
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                                  {finding.category}
                                </span>
                              )}
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium border ${sev.className}`}
                              >
                                {sev.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {finding.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="mt-4">
            <TimelineView events={timelineEvents} />
          </TabsContent>

          {/* Relationship graph */}
          <TabsContent value="relaciones" className="mt-4">
            <RelationshipGraph graph={relationshipGraph} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
