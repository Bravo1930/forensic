"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Brain, Loader2 } from "lucide-react";

export default function AnalysesPage() {
  const { data: analyses, isLoading } = trpc.analyses.listAll.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
            Análisis IA
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8892A0" }}>
            Resultados de análisis forenses
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: "#8892A0" }}
            />
          </div>
        ) : analyses && analyses.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analyses.map(a => (
              <Link key={a.id} href={`/analisis/${a.id}`}>
                <Card className="cursor-pointer transition-all duration-200 hover:border-[#E8B86D]/50 h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle
                        className="text-base"
                        style={{ color: "#E8EDF2" }}
                      >
                        {a.title}
                      </CardTitle>
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
                  </CardHeader>
                  <CardContent>
                    <div
                      className="space-y-2 text-sm"
                      style={{ color: "#8892A0" }}
                    >
                      <p>Tipo: {a.type}</p>
                      {a.executiveSummary && (
                        <p className="line-clamp-2">{a.executiveSummary}</p>
                      )}
                      {(a as any).hasCriticalFindings && (
                        <p className="font-medium" style={{ color: "#E8B86D" }}>
                          ⚠ Hallazgos críticos detectados
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Brain className="h-12 w-12" style={{ color: "#8892A0" }} />
              <p style={{ color: "#8892A0" }}>
                No hay análisis disponibles. Ejecuta un análisis desde un caso.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
