"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";

export default function CasesPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
              Casos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona tus casos legales
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Caso
          </Button>
        </div>

        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay casos registrados. Crea tu primer caso.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
