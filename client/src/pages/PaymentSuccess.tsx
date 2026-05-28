import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BadgeCheck, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  const utils = trpc.useUtils();

  // Invalidate subscription queries so the new plan is reflected immediately
  useEffect(() => {
    const timer = setTimeout(() => {
      utils.stripe.getStatus.invalidate();
      utils.stripe.getPlans.invalidate();
      utils.subscriptions.getMine.invalidate();
    }, 2000);
    return () => clearTimeout(timer);
  }, [utils]);

  const { data: status, isLoading } = trpc.stripe.getStatus.useQuery(
    undefined,
    {
      refetchInterval: 3000,
      refetchIntervalInBackground: false,
    }
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-green-700/40 bg-green-900/10">
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green-600/20 flex items-center justify-center">
              <BadgeCheck className="w-10 h-10 text-green-400" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Pago completado!
            </h1>
            <p className="text-white/60 text-sm">
              Tu suscripción ha sido activada exitosamente. Ya tienes acceso a
              todas las funcionalidades de tu nuevo plan.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando suscripción...
            </div>
          ) : status ? (
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-red-400" />
                <span className="text-white font-semibold">
                  Plan {status.planLabel}
                </span>
              </div>
              <p className="text-white/50 text-xs">
                {status.analysesLimit === 999999
                  ? "Análisis ilimitados"
                  : `${status.analysesLimit} análisis por mes`}
                {" · "}
                {status.periodEnd
                  ? `Válido hasta ${new Date(status.periodEnd).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`
                  : "Sin fecha de vencimiento"}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                Ir al Dashboard
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/suscripcion">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              >
                Ver detalles del plan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
