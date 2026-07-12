"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FileText, Loader2 } from "lucide-react";

export default function ReportsPage() {
  const { data: cases } = trpc.cases.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informes periciales generados
          </p>
        </div>

        {cases && cases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map(c => (
              <ReportsByCaseCard key={c.id} caseId={c.id} caseTitle={c.title} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No hay reportes disponibles.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReportsByCaseCard({
  caseId,
  caseTitle,
}: {
  caseId: number;
  caseTitle: string;
}) {
  const { data: reports, isLoading } = trpc.reports.listByCase.useQuery({
    caseId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{caseTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : reports && reports.length > 0 ? (
          <div className="space-y-2">
            {reports.map(r => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.format} • {r.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin reportes</p>
        )}
      </CardContent>
    </Card>
  );
}
