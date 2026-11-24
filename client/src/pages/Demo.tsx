import { useLocation } from "wouter";
import Breadcrumbs from "@/components/Breadcrumbs";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  Network,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Demo() {
  const [, navigate] = useLocation();

  // Demo case and analysis data
  const DEMO_CASE_TITLE = "Demo: Caso de ejemplo - Contradicciones de testigos";
  const DEMO_ANALYSIS_TITLE = "Análisis de Contradicciones - 29/9/2026";

  const { data: caseData } = trpc.cases.getById.useQuery(
    { id: 1 },
    { enabled: true }
  );

  const {
    data: analyses = [],
    isLoading,
    isError,
    error,
  } = trpc.analyses.listByCase.useQuery(
    { caseId: 1 },
    { enabled: true }
  );

  const utils = trpc.useUtils();
  const runContradiction = trpc.analyses.runContradiction.useMutation({
    onSuccess: () => {
      toast.success("Análisis de demo generado");
      void utils.analyses.listByCase.invalidate({ caseId: 1 });
    },
    onError: err => {
      toast.error(err.message ?? "No se pudo generar el análisis");
    },
  });

  // Try to find a completed contradiction analysis
  const contradictionAnalysis = analyses.find(
    (a: any) => a.type === "contradicciones" && a.status === "completado"
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border-border p-8 rounded-xl text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Cargando.demo...</p>
        </div>
      </div>
    );
  }

  if (isError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border-red-500/30 border-destructive p-8 rounded-xl text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">Error cargando la demo</p>
          <p className="text-sm text-muted-foreground">No hay datos de demo disponibles</p>
          <Button onClick={() => navigate("/casos")}>
            Ver casos reales
          </Button>
        </div>
      </div>
    );
  }

  // If no completed contradiction analysis exists, create a demo one
  if (!contradictionAnalysis) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold">Demo No Disponible</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-lg">
                No hay un análisis de contradicciones completado en el caso de
                demo. Genera un análisis primero para ver la demo.
              </p>
              <Button
                variant="outline"
                disabled={runContradiction.isPending}
                onClick={() =>
                  runContradiction.mutate({
                    caseId: 1,
                    title: DEMO_ANALYSIS_TITLE,
                  })
                }
              >
                <Brain className="w-4 h-4 mr-2" />
                Generar análisis de demo
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show the completed contradiction analysis
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumbs
          segments={[
            { label: "Casos", href: "/casos", icon: FolderOpen },
            { label: caseData?.title || DEMO_CASE_TITLE },
          ]}
          onNavigate={navigate}
        />
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">
              {contradictionAnalysis.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Análisis de contradicciones completado para el caso de demo.
            </p>
            <Button
              onClick={() => navigate(`/analisis/${contradictionAnalysis.id}`)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver análisis
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}