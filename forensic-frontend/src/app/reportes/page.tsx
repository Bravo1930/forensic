"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
            Reportes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dictámenes periciales generados
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <FileText className="h-12 w-12" style={{ color: "#8892A0" }} />
            <p style={{ color: "#8892A0" }}>
              No hay reportes disponibles. Genera un reporte desde un análisis.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
