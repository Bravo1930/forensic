"use client";

import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Encabezado con tipografía de título */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Reportes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dictámenes periciales generados
          </p>
        </div>

        /* Tarjeta principal con efecto “vidrio forensic” */
        <Card className="card-glass-forensic hover:shadow-[0_0_24px_rgba(211,47,47,0.25)]">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            {/* Ícono con color de acento y tamaño ligeramente mayor */}
            <FileText
              className="h-14 w-14 text-primary"
              aria-hidden="true"
            />
            {/* Texto descriptivo */}
            <p className="text-sm text-muted-foreground max-w-md text-center">
              No hay reportes disponibles. Genera un reporte desde un
              análisis para comenzar a construir tu expediente.
            </p>

            /* Botón de llamada a la acción (opcional, pero útil) */
            <a
              href="/analisis/nuevo"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary"
            >
              Crear mi primer reporte
            </a>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
