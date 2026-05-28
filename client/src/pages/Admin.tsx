import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import {
  Brain,
  FileText,
  FolderOpen,
  HardDrive,
  Loader2,
  Shield,
  Users,
} from "lucide-react";

export default function Admin() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = trpc.subscriptions.adminStats.useQuery(
    undefined,
    {
      enabled: user?.role === "admin",
      retry: false,
    }
  );

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: "Usuarios totales",
      value: stats.totalUsers,
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "Casos creados",
      value: stats.totalCases,
      icon: FolderOpen,
      color: "text-green-400",
    },
    {
      label: "Evidencias subidas",
      value: stats.totalEvidence,
      icon: FileText,
      color: "text-yellow-400",
    },
    {
      label: "Análisis realizados",
      value: stats.totalAnalyses,
      icon: Brain,
      color: "text-primary",
    },
    {
      label: "Reportes generados",
      value: stats.totalReports,
      icon: FileText,
      color: "text-purple-400",
    },
    {
      label: "Almacenamiento total",
      value: `${(stats.totalStorageBytes / 1024 / 1024 / 1024).toFixed(2)} GB`,
      icon: HardDrive,
      color: "text-cyan-400",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Estadísticas del sistema
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/30 text-primary bg-primary/10 ml-2"
          >
            Admin
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statCards.map(stat => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Plan distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Distribución de Planes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  plan: "Gratuito",
                  count: stats.freeUsers,
                  color: "bg-gray-500",
                },
                {
                  plan: "Premium",
                  count: stats.premiumUsers,
                  color: "bg-primary",
                },
                {
                  plan: "Empresarial",
                  count: stats.enterpriseUsers,
                  color: "bg-purple-500",
                },
              ].map(item => (
                <div
                  key={item.plan}
                  className="text-center p-4 bg-background rounded-lg border border-border"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${item.color} mx-auto mb-2`}
                  />
                  <div className="text-xl font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.plan}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
