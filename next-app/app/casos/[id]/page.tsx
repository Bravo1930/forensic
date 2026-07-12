"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Brain, GitCompare, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = Number(id);
  const utils = trpc.useUtils();

  const { data: caseData, isLoading } = trpc.cases.getById.useQuery({
    id: caseId,
  });
  const { data: evidence } = trpc.evidence.listByCase.useQuery({ caseId });
  const { data: analyses } = trpc.analyses.listByCase.useQuery({ caseId });

  const runAnalysis = trpc.analyses.run.useMutation({
    onSuccess: () => {
      toast.success("Análisis forense iniciado");
      utils.analyses.listByCase.invalidate({ caseId });
    },
    onError: err => toast.error(err.message),
  });

  const runContradiction = trpc.analyses.runContradiction.useMutation({
    onSuccess: () => {
      toast.success("Análisis de contradicciones iniciado");
      utils.analyses.listByCase.invalidate({ caseId });
    },
    onError: err => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-muted-foreground">
          Caso no encontrado
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/casos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{caseData.title}</h1>
              <Badge>{caseData.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {caseData.caseType}{" "}
              {caseData.caseNumber && `• ${caseData.caseNumber}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => runAnalysis.mutate({ caseId })}
            disabled={runAnalysis.isPending}
          >
            <Brain className="mr-2 h-4 w-4" />{" "}
            {runAnalysis.isPending ? "Analizando..." : "Análisis Forense"}
          </Button>
          <Button
            variant="outline"
            onClick={() => runContradiction.mutate({ caseId })}
            disabled={runContradiction.isPending}
          >
            <GitCompare className="mr-2 h-4 w-4" /> Analizar Contradicciones
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Evidencia (
                {evidence?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evidence && evidence.length > 0 ? (
                <div className="space-y-2">
                  {evidence.map(e => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.originalName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {e.evidenceType ?? e.mimeType}
                        </p>
                      </div>
                      <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                        {(e.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin evidencia cargada
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4" /> Análisis ({analyses?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyses && analyses.length > 0 ? (
                <div className="space-y-2">
                  {analyses.map(a => (
                    <Link key={a.id} href={`/analisis/${a.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-2.5 hover:border-primary/50 transition-colors cursor-pointer">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {a.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.type}
                          </p>
                        </div>
                        <Badge
                          variant={
                            a.status === "completado"
                              ? "default"
                              : a.status === "error"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {a.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ejecuta un análisis forense para ver resultados
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
