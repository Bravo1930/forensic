import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  name: string;
  planKey: "premium" | "enterprise";
  interval: "month" | "year";
  displayPrice: string;
  displayInterval: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect: (
    planKey: "premium" | "enterprise",
    interval: "month" | "year"
  ) => void;
  isLoading: boolean;
}

function PlanCard({
  name,
  planKey,
  interval,
  displayPrice,
  displayInterval,
  features,
  isCurrent,
  isPopular,
  onSelect,
  isLoading,
}: PlanCardProps) {
  return (
    <Card
      className={`relative flex flex-col border transition-all duration-200 ${
        isPopular
          ? "border-red-500 shadow-lg shadow-red-500/20"
          : isCurrent
            ? "border-green-600"
            : "border-white/10 hover:border-white/20"
      }`}
    >
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-red-600 text-white px-3 py-1 text-xs font-semibold">
            <Star className="w-3 h-3 mr-1" /> MÁS POPULAR
          </Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-green-700 text-white px-3 py-1 text-xs font-semibold">
            <BadgeCheck className="w-3 h-3 mr-1" /> PLAN ACTUAL
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          {planKey === "enterprise" ? (
            <Building2 className="w-5 h-5 text-red-400" />
          ) : (
            <Sparkles className="w-5 h-5 text-red-400" />
          )}
          <CardTitle className="text-lg text-white">{name}</CardTitle>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-white">{displayPrice}</span>
          <span className="text-white/50 text-sm">{displayInterval}</span>
        </div>
        {interval === "year" && (
          <p className="text-green-400 text-xs font-medium mt-1">
            ✓ Ahorra 20% con el plan anual
          </p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        <ul className="space-y-2 flex-1">
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-white/70"
            >
              <CheckCircle2 className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Button
          className={`w-full mt-2 ${
            isCurrent
              ? "bg-green-800 hover:bg-green-700 text-white"
              : isPopular
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          onClick={() => onSelect(planKey, interval)}
          disabled={isCurrent || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : isCurrent ? (
            <BadgeCheck className="w-4 h-4 mr-2" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          {isCurrent ? "Plan activo" : "Suscribirse ahora"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Subscription() {
  const { data: plansData, isLoading: plansLoading } =
    trpc.stripe.getPlans.useQuery();
  const { data: status } = trpc.stripe.getStatus.useQuery();

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        toast.info("Redirigiendo al portal de pago seguro de Stripe...");
        window.open(data.url, "_blank");
      }
    },
    onError: err => {
      toast.error(`Error al procesar el pago: ${err.message}`);
    },
  });

  const createPortal = trpc.stripe.createPortalSession.useMutation({
    onSuccess: data => {
      if (data.url) {
        toast.info("Abriendo portal de facturación...");
        window.open(data.url, "_blank");
      }
    },
    onError: err => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleSelectPlan = (
    planKey: "premium" | "enterprise",
    interval: "month" | "year"
  ) => {
    createCheckout.mutate({
      planKey,
      interval,
      origin: window.location.origin,
    });
  };

  const handleManageBilling = () => {
    createPortal.mutate({ origin: window.location.origin });
  };

  const usagePercent = status
    ? Math.min(
        100,
        (status.analysesUsed / Math.max(1, status.analysesLimit)) * 100
      )
    : 0;

  const storagePercent = status
    ? Math.min(
        100,
        (status.storageUsedBytes / Math.max(1, status.storageLimitBytes)) * 100
      )
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-red-500" />
            Suscripción y Planes
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Gestiona tu plan y accede a todas las funcionalidades de la
            plataforma forense.
          </p>
        </div>

        {/* Current plan status */}
        {status && (
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                    {status.plan === "free" ? (
                      <Shield className="w-5 h-5 text-red-400" />
                    ) : status.plan === "premium" ? (
                      <Sparkles className="w-5 h-5 text-red-400" />
                    ) : (
                      <Building2 className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      Plan {status.planLabel}
                      {status.cancelAtPeriodEnd && (
                        <Badge className="bg-yellow-700 text-yellow-100 text-xs">
                          Cancela al vencer
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-white/40 text-xs">
                      {status.periodEnd
                        ? `Período activo hasta ${new Date(status.periodEnd).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`
                        : "Plan gratuito — sin fecha de vencimiento"}
                    </CardDescription>
                  </div>
                </div>
                {status.hasStripeSubscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                    onClick={handleManageBilling}
                    disabled={createPortal.isPending}
                  >
                    {createPortal.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <ExternalLink className="w-3 h-3 mr-1" />
                    )}
                    Gestionar facturación
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Análisis IA este mes
                    </span>
                    <span>
                      {status.analysesUsed} /{" "}
                      {status.analysesLimit === 999999
                        ? "∞"
                        : status.analysesLimit}
                    </span>
                  </div>
                  <Progress
                    value={usagePercent}
                    className="h-1.5 bg-white/10"
                  />
                  {usagePercent >= 80 && (
                    <p className="text-yellow-400 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {usagePercent >= 100
                        ? "Límite alcanzado — actualiza tu plan"
                        : "Cerca del límite mensual"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Almacenamiento
                    </span>
                    <span>
                      {formatBytes(status.storageUsedBytes)} /{" "}
                      {formatBytes(status.storageLimitBytes)}
                    </span>
                  </div>
                  <Progress
                    value={storagePercent}
                    className="h-1.5 bg-white/10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="bg-white/10" />

        {/* Plans header */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-white">Elige tu plan</h2>
          <p className="text-white/50 text-sm">
            Prueba los pagos con la tarjeta{" "}
            <code className="bg-white/10 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">
              4242 4242 4242 4242
            </code>{" "}
            en modo sandbox.
          </p>
        </div>

        {plansLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : (
          <>
            {/* Free plan */}
            <Card className="border-white/10 bg-white/5">
              <CardContent className="flex items-center justify-between py-4 px-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-white/40" />
                  <div>
                    <p className="text-white font-medium">Plan Gratuito</p>
                    <p className="text-white/40 text-xs">
                      3 análisis/mes · 500 MB · 3 casos · Exportación con marca
                      de agua
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-lg font-semibold">
                    $0 / siempre
                  </span>
                  {plansData?.currentPlan === "free" && (
                    <Badge className="bg-green-800 text-green-100">
                      Activo
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Paid plans grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {plansData?.plans.map(plan => (
                <PlanCard
                  key={`${plan.planKey}-${plan.interval}`}
                  name={plan.name}
                  planKey={plan.planKey}
                  interval={plan.interval}
                  displayPrice={plan.displayPrice}
                  displayInterval={plan.displayInterval}
                  features={plan.features}
                  isCurrent={
                    plansData.currentPlan === plan.planKey &&
                    plansData.currentInterval === plan.interval
                  }
                  isPopular={
                    plan.planKey === "premium" && plan.interval === "month"
                  }
                  onSelect={handleSelectPlan}
                  isLoading={createCheckout.isPending}
                />
              ))}
            </div>
          </>
        )}

        {/* Security note */}
        <Card className="border-white/5 bg-white/3">
          <CardContent className="flex items-start gap-3 py-4 px-5">
            <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-white/70 text-xs font-medium">
                Pagos seguros con Stripe
              </p>
              <p className="text-white/40 text-xs mt-0.5">
                Todos los pagos son procesados de forma segura por Stripe. No
                almacenamos datos de tarjetas de crédito. Puedes cancelar tu
                suscripción en cualquier momento desde el portal de facturación.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Claim sandbox reminder */}
        <Card className="border-yellow-800/40 bg-yellow-900/10">
          <CardContent className="flex items-start gap-3 py-4 px-5">
            <Calendar className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-yellow-300 text-xs font-medium">
                Sandbox de Stripe pendiente de reclamar
              </p>
              <p className="text-yellow-400/60 text-xs mt-0.5">
                Para activar el entorno de pruebas, reclama el sandbox en{" "}
                <a
                  href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVENrZENJOXlBMW5IRVluLDE3NzQ1NzQyNTEv100TFKGA2Ba"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-yellow-300 hover:text-yellow-200"
                >
                  dashboard.stripe.com
                </a>{" "}
                antes del 19 de mayo de 2026.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
