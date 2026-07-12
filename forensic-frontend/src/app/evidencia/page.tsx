"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File } from "lucide-react";

export default function EvidencePage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
            Evidencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Archivos de evidencia digital por caso
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay casos con evidencia disponible.
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
