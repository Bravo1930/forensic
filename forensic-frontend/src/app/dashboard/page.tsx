"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FolderOpen, Brain, FileText, Users } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    {
      icon: FolderOpen,
      label: "Casos Activos",
      value: 0,
    },
    {
      icon: Brain,
      label: "Análisis Realizados",
      value: 0,
    },
    { icon: FileText, label: "Reportes", value: 0 },
    {
      icon: Users,
      label: "Evidencia Total",
      value: 0,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Encabezado con tipografía de título */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de tu actividad forense
          </p>
        </div>

        {/* Grid de tarjetas métricas */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card
              key={stat.label}
              className="card-forensic hover:shadow-[0_0_20px_rgba(211,47,47,0.3)]"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <span className="flex items-center gap-2">
                  <stat.icon className="h-4 w-4 text-primary" />
                  {/* Valor numérico en monoespaciado, destacado */}
                  <div className="text-2xl font-bold text-primary-foreground data-mono">
                    {String(stat.value).padStart(2, "0")}
                  </div>
                </span>
              </CardHeader>
              <CardContent className="pt-2">
                {/* Línea sutil de separación */}
                <div className="h-0.5 bg-border/20 my-2"></div>
                <p className="text-xs text-muted-foreground">
                  Último registro: {new Date().toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Secciones de listas recientes */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* ---- Casos recientes ---- */}
          <Card className="card-glass-forensic">
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Casos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                No hay casos aún. Crea tu primer caso para comenzar.
              </p>
            </CardContent>
          </Card>

          {/* ---- Análisis recientes ---- */}
          <Card className="card-glass-forensic">
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Análisis Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
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
