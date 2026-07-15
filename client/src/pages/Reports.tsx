import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/MotionComponents/GlassCard";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  generando: {
    label: "Generando",
    className: "border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10",
    icon: Loader2,
  },
  listo: {
    label: "Listo",
    className: "border-green-800/50 text-green-400 bg-green-900/20",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    className: "border-red-800/50 text-red-400 bg-red-900/20",
    icon: XCircle,
  },
};

function ReportSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <GlassCard className="!p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-36 bg-white/10 rounded animate-pulse" />
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

export default function Reports() {
  const {
    data: cases = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.cases.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Reportes Legales
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reportes PDF generados listos para presentación judicial
          </p>
        </motion.div>

        {isLoading ? (
          <ReportSkeleton />
        ) : isError ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="!p-8 text-center border-red-500/30">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 font-medium mb-1">Error al cargar reportes</p>
              <p className="text-sm text-muted-foreground mb-4">
                {error?.message ?? "Intenta de nuevo más tarde"}
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="gap-2 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </Button>
            </GlassCard>
          </motion.div>
        ) : cases.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="!p-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No hay reportes generados</p>
              <p className="text-xs text-muted-foreground">
                Los reportes se generan desde el detalle de cada caso, en la
                pestaña "Análisis IA"
              </p>
            </GlassCard>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {cases.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <CaseReports caseId={c.id} caseTitle={c.title} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function CaseReports({
  caseId,
  caseTitle,
}: {
  caseId: number;
  caseTitle: string;
}) {
  const {
    data: reportsList = [],
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.reports.listByCase.useQuery({ caseId });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-2" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <GlassCard key={i} className="!p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                  <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {caseTitle}
        </h3>
        <GlassCard className="!p-4 border-red-500/30">
          <div className="text-center">
            <p className="text-sm text-red-300 mb-2">Error al cargar reportes</p>
            <p className="text-xs text-muted-foreground mb-3">{error?.message ?? ""}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <RefreshCw className="w-3 h-3" /> Reintentar
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (reportsList.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#D4AF37]" />
        {caseTitle}
      </h3>
      <div className="space-y-2">
        {reportsList.map((r, idx) => {
          const statusCfg = statusConfig[r.status];
          const StatusIcon = statusCfg.icon;
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="!p-4" hoverEffect="lift">
                <div className="flex items-center gap-4">
                  <motion.div
                    animate={{
                      scale: r.status === "generando" ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <FileText className="w-5 h-5 text-[#D4AF37]" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate text-white">
                        {r.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 h-5 shrink-0 ${statusCfg.className}`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 mr-1 ${
                            r.status === "generando" ? "animate-spin" : ""
                          }`}
                        />
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.format.toUpperCase()} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("es-MX", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {r.s3Url && r.status === "listo" && (
                    <a href={r.s3Url} target="_blank" rel="noopener noreferrer">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs shrink-0 border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar PDF
                        </Button>
                      </motion.div>
                    </a>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}