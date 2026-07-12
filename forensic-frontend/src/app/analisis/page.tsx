"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Brain } from "lucide-react";

export default function AnalysesPage() {
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

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Brain className="h-12 w-12" style={{ color: "#8892A0" }} />
            <p style={{ color: "#8892A0" }}>
              No hay análisis disponibles. Ejecuta un análisis desde un caso.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
