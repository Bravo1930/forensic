import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  XCircle,
} from "lucide-react";

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  generando: {
    label: "Generando",
    className: "border-yellow-800/50 text-yellow-400 bg-yellow-900/20",
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

export default function Reports() {
  const { data: cases = [] } = trpc.cases.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes Legales</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Reportes PDF generados listos para presentación judicial
          </p>
        </div>

        {cases.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">
                No hay reportes generados
              </p>
              <p className="text-xs text-muted-foreground">
                Los reportes se generan desde el detalle de cada caso, en la
                pestaña "Análisis IA"
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cases.map(c => (
              <CaseReports key={c.id} caseId={c.id} caseTitle={c.title} />
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
  const { data: reportsList = [], isLoading } =
    trpc.reports.listByCase.useQuery({ caseId });

  if (isLoading || reportsList.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        {caseTitle}
      </h3>
      <div className="space-y-2">
        {reportsList.map(r => {
          const statusCfg = statusConfig[r.status];
          const StatusIcon = statusCfg.icon;
          return (
            <Card key={r.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 h-5 shrink-0 ${statusCfg.className}`}
                      >
                        <StatusIcon
                          className={`w-3 h-3 mr-1 ${r.status === "generando" ? "animate-spin" : ""}`}
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Descargar PDF
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
