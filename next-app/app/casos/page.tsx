"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Plus, ArrowRight, Loader2 } from "lucide-react";

export default function CasesPage() {
  const { data: cases, isLoading } = trpc.cases.list.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Casos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Gestiona tus casos legales
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Caso
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : cases && cases.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map(c => (
              <Link key={c.id} href={`/casos/${c.id}`}>
                <Card className="cursor-pointer transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{c.title}</CardTitle>
                      <Badge
                        variant={
                          c.status === "activo" ? "default" : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Tipo: {c.caseType}</p>
                      {c.clientName && <p>Cliente: {c.clientName}</p>}
                    </div>
                    <div className="mt-4 flex items-center text-xs text-primary">
                      Ver detalles <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No hay casos registrados. Crea tu primer caso.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
