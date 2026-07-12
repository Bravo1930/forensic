"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { File, Loader2 } from "lucide-react";

export default function EvidencePage() {
  const { data: cases } = trpc.cases.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Evidencia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Archivos de evidencia digital por caso
          </p>
        </div>

        {cases && cases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map(c => (
              <EvidenceByCaseCard
                key={c.id}
                caseId={c.id}
                caseTitle={c.title}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay casos con evidencia disponible.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function EvidenceByCaseCard({
  caseId,
  caseTitle,
}: {
  caseId: number;
  caseTitle: string;
}) {
  const { data: evidence, isLoading } = trpc.evidence.listByCase.useQuery({
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
        ) : evidence && evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2"
              >
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{e.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    {(e.sizeBytes / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin evidencia</p>
        )}
      </CardContent>
    </Card>
  );
}
