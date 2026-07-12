"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Brain, FileText, Users } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      icon: FolderOpen,
      label: "Casos Activos",
      value: 0,
      color: "#E8B86D",
    },
    {
      icon: Brain,
      label: "Análisis Realizados",
      value: 0,
      color: "#E8B86D",
    },
    { icon: FileText, label: "Reportes", value: 0, color: "#E8B86D" },
    {
      icon: Users,
      label: "Evidencia Total",
      value: 0,
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
              <p className="text-sm" style={{ color: "#8892A0" }}>
                No hay casos aún. Crea tu primer caso para comenzar.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Análisis Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm" style={{ color: "#8892A0" }}>
                No hay análisis aún. Ejecuta un análisis en un caso para ver
                resultados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
