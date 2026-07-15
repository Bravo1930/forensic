import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { GlassCard } from "@/components/MotionComponents/GlassCard";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Breadcrumbs from "@/components/Breadcrumbs";
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  File,
  FileSearch,
  FileText,
  FolderOpen,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  GitCompare,
  Volume2,
  GitBranch,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import EvidenceUploader from "@/components/EvidenceUploader";
import ImageAnalysisPanel from "@/components/ImageAnalysisPanel";

const statusConfig: Record<string, { label: string; className: string }> = {
  activo: {
    label: "Activo",
    className: "border-green-800/50 text-green-400 bg-green-900/20",
  },
  archivado: {
    label: "Archivado",
    className: "border-gray-700 text-gray-400 bg-gray-800/20",
  },
  cerrado: {
    label: "Cerrado",
    className: "border-blue-800/50 text-blue-400 bg-blue-900/20",
  },
  en_revision: {
    label: "En revisión",
    className: "border-yellow-800/50 text-yellow-400 bg-yellow-900/20",
  },
};

const analysisStatusConfig: Record<
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

function EvidenceList({
  caseId,
  caseContext,
}: {
  caseId: number;
  caseContext?: string;
}) {
  const {
    data: evidenceList = [],
    isLoading,
    refetch,
  } = trpc.evidence.listByCase.useQuery({ caseId });
  const utils = trpc.useUtils();
  const [expandedImageId, setExpandedImageId] = useState<number | null>(null);
  const deleteEvidence = trpc.evidence.delete.useMutation({
    onSuccess: () => {
      utils.evidence.listByCase.invalidate({ caseId });
      toast.success("Evidencia eliminada");
    },
    onError: (err) => toast.error(err.message),
  });
  const toggleKey = trpc.evidence.update.useMutation({
    onSuccess: () => utils.evidence.listByCase.invalidate({ caseId }),
  });

  const typeConfig: Record<
    string,
    { icon: React.ElementType; color: string; bg: string }
  > = {
    documento: { icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
    imagen: {
      icon: FileSearch,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    video: { icon: Play, color: "text-purple-400", bg: "bg-purple-500/10" },
    audio: { icon: Volume2, color: "text-amber-400", bg: "bg-amber-500/10" },
    chat: { icon: MessageSquare, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    log: { icon: FileText, color: "text-slate-400", bg: "bg-slate-500/10" },
    zip: { icon: Archive, color: "text-orange-400", bg: "bg-orange-500/10" },
    otro: { icon: File, color: "text-gray-400", bg: "bg-gray-500/10" },
  };

  const isImage = (mimeType: string) =>
    mimeType.startsWith("image/") &&
    [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ].includes(mimeType.toLowerCase());

  if (isLoading)
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Cargando evidencia...
      </div>
    );

  if (evidenceList.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileSearch className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">
          No hay evidencia cargada
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Usa el botón "Cargar evidencia" para subir archivos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {evidenceList.map((e, idx) => (
        <motion.div
          key={e.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="rounded-lg border border-border overflow-hidden glass-effect"
        >
          <div
            className="flex items-center gap-3 p-3 bg-background/50 hover:border-[#D4AF37]/20 transition-all group cursor-pointer"
            onClick={() =>
              isImage(e.mimeType ?? "")
                ? setExpandedImageId(expandedImageId === e.id ? null : e.id)
                : undefined
            }
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                typeConfig[e.evidenceType ?? "otro"]?.bg ?? "bg-gray-500/10"
              }`}
            >
              {(() => {
                const evidenceType = e.evidenceType ?? "otro";
                const Icon = typeConfig[evidenceType]?.icon ?? File;
                return (
                  <Icon
                    className={`w-4 h-4 ${
                      typeConfig[evidenceType]?.color ?? "text-gray-400"
                    }`}
                  />
                );
              })()}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate text-foreground">
                  {e.originalName}
                </p>
                {e.isKeyEvidence && (
                  <Badge className="text-[10px] px-2 py-0.5 h-5 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20 font-medium">
                    Clave
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize font-medium">
                  {e.evidenceType}
                </span>
                <span className="text-border">·</span>
                <span>{(e.sizeBytes / 1024).toFixed(1)} KB</span>
                <span className="text-border">·</span>
                <span>
                  {new Date(e.createdAt).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(ev) => ev.stopPropagation()}
            >
              {isImage(e.mimeType ?? "") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-[#D4AF37] hover:text-[#D4AF37]/80"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setExpandedImageId(expandedImageId === e.id ? null : e.id);
                  }}
                >
                  <Brain className="w-3 h-3 mr-1" />
                  {expandedImageId === e.id ? "Ocultar" : "Análisis"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggleKey.mutate({
                    id: e.id,
                    isKeyEvidence: !e.isKeyEvidence,
                  });
                }}
              >
                {e.isKeyEvidence ? "Quitar clave" : "Marcar clave"}
              </Button>
              <a
                href={e.s3Url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(ev) => ev.stopPropagation()}
              >
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </a>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:text-destructive"
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(ev) => ev.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar evidencia</AlertDialogTitle>
                    <AlertDialogDescription>
                      ¿Eliminar esta evidencia? Esta acción no se puede
                      deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => deleteEvidence.mutate({ id: e.id })}
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          {/* Image analysis panel - expandable */}
          {isImage(e.mimeType ?? "") && expandedImageId === e.id && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-border bg-muted/10 p-4"
            >
              <ImageAnalysisPanel
                evidenceId={e.id}
                caseId={caseId}
                filename={e.originalName}
                s3Url={e.s3Url ?? ""}
                mimeType={e.mimeType ?? "application/octet-stream"}
                caseContext={caseContext}
              />
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function AnalysisList({ caseId }: { caseId: number }) {
  const [, navigate] = useLocation();
  const {
    data: analysesList = [],
    isLoading,
    refetch,
  } = trpc.analyses.listByCase.useQuery(
    { caseId },
    { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false }
  );
  const utils = trpc.useUtils();

  const runAnalysis = trpc.analyses.run.useMutation({
    onSuccess: (data) => {
      toast.success("Análisis forense iniciado. Esto puede tomar 1-2 minutos.");
      // Poll for completion
      const interval = setInterval(async () => {
        const result = await utils.analyses.getStatus.fetch({ id: data.id });
        if (result.status === "completado" || result.status === "error") {
          clearInterval(interval);
          utils.analyses.listByCase.invalidate({ caseId });
          if (result.status === "completado") {
            toast.success("¡Análisis forense completado!");
          } else {
            toast.error("El análisis encontró un error");
          }
        }
      }, 5000);
    },
    onError: (err) => toast.error(err.message),
  });

  const runContradiction = trpc.analyses.runContradiction.useMutation({
    onSuccess: (data) => {
      toast.success(
        "Análisis de contradicciones iniciado. Esto puede tomar 1-2 minutos."
      );
      // Poll for completion
      const interval = setInterval(async () => {
        const result = await utils.analyses.getStatus.fetch({ id: data.id });
        if (result.status === "completado" || result.status === "error") {
          clearInterval(interval);
          utils.analyses.listByCase.invalidate({ caseId });
          if (result.status === "completado") {
            toast.success("¡Análisis de contradicciones completado!");
          } else {
            toast.error("El análisis encontró un error");
          }
        }
      }, 5000);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateReport = trpc.reports.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Reporte generado");
      window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading)
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Cargando análisis...
      </div>
    );

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-end gap-2"
      >
        <Button
          size="sm"
          variant="outline"
          onClick={() => runContradiction.mutate({ caseId })}
          disabled={runContradiction.isPending}
        >
          {runContradiction.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <GitBranch className="w-4 h-4 mr-2" />
              Contradicciones
            </>
          )}
        </Button>
        <Button
          size="sm"
          onClick={() => runAnalysis.mutate({ caseId })}
          disabled={runAnalysis.isPending}
        >
          {runAnalysis.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Iniciando...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Análisis Forense
            </>
          )}
        </Button>
      </motion.div>

      {analysesList.length === 0 ? (
        <div className="py-12 text-center">
          <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No hay análisis ejecutados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Carga evidencia primero, luego ejecuta el análisis IA
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {analysesList.map((a, idx) => {
            const statusCfg = analysisStatusConfig[a.status];
            const StatusIcon = statusCfg.icon;
            const keyFindingsRaw = a.keyFindings;
            const keyFindings =
              typeof keyFindingsRaw === "string"
                ? JSON.parse(keyFindingsRaw || "[]")
                : (keyFindingsRaw ?? []);
            const criticalCount = keyFindings.filter(
              (f: any) => f.severity === "alta"
            ).length;

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <GlassCard className="!p-4" hoverEffect="lift">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          animate={{
                            scale: a.status === "procesando" ? [1, 1.1, 1] : 1,
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            a.status === "completado"
                              ? "bg-emerald-500/10"
                              : a.status === "procesando"
                                ? "bg-[#D4AF37]/10"
                                : a.status === "error"
                                  ? "bg-red-500/10"
                                  : "bg-slate-500/10"
                          }`}
                        >
                          <StatusIcon
                            className={`w-4 h-4 ${
                              a.status === "completado"
                                ? "text-emerald-400"
                                : a.status === "procesando"
                                  ? "text-[#D4AF37]"
                                  : a.status === "error"
                                    ? "text-red-400"
                                    : "text-slate-400"
                            } ${a.status === "procesando" ? "animate-spin" : ""}`}
                          />
                        </motion.div>
                        <h4 className="font-semibold text-sm truncate text-foreground">
                          {a.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 ml-10">
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {a.processingTimeMs && (
                          <span className="text-xs text-muted-foreground">
                            · {(a.processingTimeMs / 1000).toFixed(1)}s
                          </span>
                        )}
                        {(a.evidenceCount ?? 0) > 0 && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 px-2 bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20"
                          >
                            {a.evidenceCount} evidencia
                            {(a.evidenceCount ?? 0) !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      {a.status === "completado" && (
                        <div className="flex items-center gap-3 mt-3 ml-10">
                          {criticalCount > 0 && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              {criticalCount} crítico
                              {criticalCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {(() => {
                              const events =
                                typeof a.timelineEvents === "string"
                                  ? JSON.parse(a.timelineEvents || "[]")
                                  : (a.timelineEvents ?? []);
                              return events.length;
                            })()}{" "}
                            eventos
                          </span>
                        </div>
                      )}
                    </div>
                    {a.status === "completado" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/analisis/${a.id}`)}
                        >
                          <FileSearch className="w-3.5 h-3.5 mr-1" />
                          Ver análisis
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            generateReport.mutate({ caseId, analysisId: a.id })
                          }
                          disabled={generateReport.isPending}
                        >
                          {generateReport.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5 mr-1" />
                              PDF
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    {a.status === "procesando" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => refetch()}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [showUploader, setShowUploader] = useState(false);
  const utils = trpc.useUtils();

  const { data: caseData, isLoading } = trpc.cases.getById.useQuery(
    { id: caseId },
    {
      enabled: !!caseId,
    }
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Caso no encontrado</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/casos")}
          >
            Volver a casos
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Breadcrumbs
          segments={[
            { label: "Casos", href: "/casos", icon: FolderOpen },
            { label: caseData.title },
          ]}
          onNavigate={navigate}
        />
        {/* Header */}
        <div className="flex items-start gap-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 w-10 p-0 mt-0.5 border border-border hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5"
              onClick={() => navigate("/casos")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </motion.div>
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 flex-wrap mb-2"
            >
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                {caseData.title}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs font-medium px-3 py-1 ${
                  statusConfig[caseData.status]?.className
                }`}
              >
                {statusConfig[caseData.status]?.label}
              </Badge>
              {caseData.caseNumber && (
                <span className="text-sm font-mono text-muted-foreground bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20">
                  #{caseData.caseNumber}
                </span>
              )}
            </motion.div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="capitalize">{caseData.caseType}</span>
              {caseData.clientName && (
                <span>· Cliente: {caseData.clientName}</span>
              )}
              {caseData.court && <span>· {caseData.court}</span>}
              <span>
                · Actualizado:{" "}
                {new Date(caseData.updatedAt).toLocaleDateString("es-MX")}
              </span>
            </div>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={() => setShowUploader(!showUploader)}
              className="gap-2 bg-gradient-to-r from-[#D4AF37] to-[#6B4AA3] text-white border-0"
            >
              <Upload className="w-4 h-4" />
              Cargar evidencia
            </Button>
          </motion.div>
        </div>

        {/* Case metadata */}
        {caseData.description && (
          <GlassCard className="!p-4">
            <p className="text-sm text-muted-foreground">
              {caseData.description}
            </p>
          </GlassCard>
        )}

        {/* Evidence uploader */}
        {showUploader && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EvidenceUploader
              caseId={caseId}
              onUploaded={() => {
                utils.evidence.listByCase.invalidate({ caseId });
                setShowUploader(false);
                toast.success("Evidencia cargada exitosamente");
              }}
              onClose={() => setShowUploader(false)}
            />
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Tabs defaultValue="evidencia" className="w-full">
            <TabsList className="bg-card/50 border border-border glass-effect">
              <TabsTrigger
                value="evidencia"
                className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37]"
              >
                <FileSearch className="w-4 h-4 mr-2" />
                Evidencia
              </TabsTrigger>
              <TabsTrigger
                value="analisis"
                className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37]"
              >
                <Brain className="w-4 h-4 mr-2" />
                Análisis IA
              </TabsTrigger>
              <TabsTrigger
                value="reportes"
                className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37] data-[state=active]:border-b-2 data-[state=active]:border-[#D4AF37]"
              >
                <FileText className="w-4 h-4 mr-2" />
                Reportes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidencia" className="mt-4">
              <div className="space-y-3">
                <GlassCard className="!p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white">
                      Evidencia Digital
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      onClick={() => navigate(`/casos/${caseId}/compare`)}
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      Comparar imágenes
                    </Button>
                  </div>
                  <EvidenceList
                    caseId={caseId}
                    caseContext={
                      caseData
                        ? `${caseData.title} - ${caseData.caseType} - ${caseData.description ?? ""}`
                        : undefined
                    }
                  />
                </GlassCard>
              </div>
            </TabsContent>

            <TabsContent value="analisis" className="mt-4">
              <GlassCard className="!p-5">
                <h3 className="text-sm font-semibold text-white mb-4">
                  Análisis Forense con IA
                </h3>
                <AnalysisList caseId={caseId} />
              </GlassCard>
            </TabsContent>

            <TabsContent value="reportes" className="mt-4">
              <ReportsList caseId={caseId} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

function ReportsList({ caseId }: { caseId: number }) {
  const { data: reportsList = [], isLoading } =
    trpc.reports.listByCase.useQuery({ caseId });

  if (isLoading)
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Cargando reportes...
      </div>
    );

  return (
    <GlassCard className="!p-5">
      <h3 className="text-sm font-semibold text-white mb-4">
        Reportes Generados
      </h3>
      {reportsList.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No hay reportes generados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Completa un análisis y genera el reporte PDF desde la pestaña
            "Análisis IA"
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {reportsList.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border glass-effect hover:border-[#D4AF37]/20 transition-all"
            >
              <FileText className="w-5 h-5 text-[#D4AF37] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("es-MX")} ·{" "}
                  {r.format.toUpperCase()}
                </p>
              </div>
              {r.s3Url && r.status === "listo" && (
                <a href={r.s3Url} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Descargar
                  </Button>
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}