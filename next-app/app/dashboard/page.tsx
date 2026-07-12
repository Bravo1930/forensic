"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { FolderOpen, Brain, FileText, Users } from "lucide-react";

export default function DashboardPage() {
  const { data: cases } = trpc.cases.list.useQuery();
  const { data: analyses } = trpc.analyses.listAll.useQuery();

  const stats = [
    {
      icon: FolderOpen,
      label: "Casos Activos",
      value: cases?.length ?? 0,
      color: "#E8B86D",
    },
    {
      icon: Brain,
      label: "Análisis Realizados",
      value: analyses?.length ?? 0,
      color: "#E8B86D",
    },
    { icon: FileText, label: "Reportes", value: 0, color: "#E8B86D" },
    {
      icon: Users,
      label: "Evidencia Total",
      value:
        cases?.reduce((a, c) => a + ((c as any).evidenceCount || 0), 0) ?? 0,
      color: "#E8B86D",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#E8EDF2" }}
          >
            Dashboard
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8892A0" }}>
            Resumen de tu actividad forense
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle
                  className="text-sm font-medium"
                  style={{ color: "#8892A0" }}
                >
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "#E8EDF2" }}
                >
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Casos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cases && cases.length > 0 ? (
                <div className="space-y-3">
                  {cases.slice(0, 5).map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg px-4 py-3"
                      style={{
                        backgroundColor: "rgba(232, 184, 109, 0.03)",
                        border: "1px solid #2A2E3A",
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#E8EDF2" }}
                        >
                          {c.title}
                        </p>
                        <p className="text-xs" style={{ color: "#8892A0" }}>
                          {c.caseType}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          border: "1px solid rgba(232, 184, 109, 0.3)",
                          backgroundColor: "rgba(232, 184, 109, 0.1)",
                          color: "#E8B86D",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#8892A0" }}>
                  No hay casos aún. Crea tu primer caso para comenzar.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Análisis Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyses && analyses.length > 0 ? (
                <div className="space-y-3">
                  {analyses.slice(0, 5).map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg px-4 py-3"
                      style={{
                        backgroundColor: "rgba(232, 184, 109, 0.03)",
                        border: "1px solid #2A2E3A",
                      }}
                    >
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: "#E8EDF2" }}
                        >
                          {a.title}
                        </p>
                        <p className="text-xs" style={{ color: "#8892A0" }}>
                          {a.type}
                        </p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          border:
                            a.status === "completado"
                              ? "1px solid rgba(232, 184, 109, 0.3)"
                              : a.status === "error"
                                ? "1px solid rgba(239, 68, 68, 0.3)"
                                : "1px solid rgba(232, 184, 109, 0.3)",
                          backgroundColor:
                            a.status === "completado"
                              ? "rgba(232, 184, 109, 0.1)"
                              : a.status === "error"
                                ? "rgba(239, 68, 68, 0.1)"
                                : "rgba(232, 184, 109, 0.05)",
                          color:
                            a.status === "completado"
                              ? "#E8B86D"
                              : a.status === "error"
                                ? "#EF4444"
                                : "#E8B86D",
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "#8892A0" }}>
                  No hay análisis aún. Ejecuta un análisis en un caso para ver
                  resultados.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
