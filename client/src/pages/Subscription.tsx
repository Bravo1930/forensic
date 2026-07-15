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
import { GlassCard } from "@/components/MotionComponents/GlassCard";
import { FloatingButton } from "@/components/MotionComponents/FloatingButton";
import { motion } from "framer-motion";
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

// ─── Plan card ─────────────────────────────────────────────────────────[...]

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <GlassCard
        className={`relative flex flex-col !p-6 ${
          isPopular
            ? "border-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/20"
            : isCurrent
              ? "border-green-600/50 shadow-lg shadow-green-600/20"
              : ""
        }`}
      >
        {isPopular && !isCurrent && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2"
          >
            <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#6B4AA3] text-white px-3 py-1 text-xs font-semibold">
              <Star className="w-3 h-3 mr-1" /> MÁS POPULAR
            </Badge>
          </motion.div>
        )}
        {isCurrent && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2"
          >
            <Badge className="bg-gradient-to-r from-green-600 to-green-500 text-white px-3 py-1 text-xs font-semibold">
              <BadgeCheck className="w-3 h-3 mr-1" /> PLAN ACTUAL
            </Badge>
          </motion.div>
        )}

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            {planKey === "enterprise" ? (
              <Building2 className="w-5 h-5 text-[#D4AF37]" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            )}
            <h3 className="text-lg font-bold text-white">{name}</h3>
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-white bg-clip-text text-transparent">
              {displayPrice}
            </span>
            <span className="text-white/50 text-sm">{displayInterval}</span>
          </div>
          {interval === "year" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-400 text-xs font-medium"
            >
              ✓ Ahorra 20% con el plan anual
            </motion.p>
          )}
        </div>

        <div className="flex flex-col flex-1 gap-4">
          <motion.ul className="space-y-2 flex-1">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 text-sm text-white/70"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37] mt-0.5 shrink-0" />
                <span>{f}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            {isCurrent ? (
              <Button
                className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white border-0"
                disabled
              >
                <BadgeCheck className="w-4 h-4 mr-2" />
                Plan activo
              </Button>
            ) : (
              <FloatingButton
                onClick={() => onSelect(planKey, interval)}
                variant="primary"
                size="md"
                className="w-full justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Suscribirse ahora
                  </>
                )}
              </FloatingButton>
            )}
          </motion.div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────[...]

export default function Subscription() {
  const { data: plansData, isLoading: plansLoading } =
    trpc.stripe.getPlans.useQuery();
  const { data: status } = trpc.stripe.getStatus.useQuery();

  const createCheckout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirigiendo al portal de pago seguro de Stripe...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
      toast.error(`Error al procesar el pago: ${err.message}`);
    },
  });

  const createPortal = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Abriendo portal de facturación...");
        window.open(data.url, "_blank");
      }
    },
    onError: (err) => {
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
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#D4AF37]" />
            Suscripción y Planes
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Gestiona tu plan y accede a todas las funcionalidades de la
            plataforma forense.
          </p>
        </motion.div>

        {/* Current plan status */}
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="!p-6">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-10 h-10 rounded-lg bg-[#D4AF37]/20 flex items-center justify-center"
                  >
                    {status.plan === "free" ? (
                      <Shield className="w-5 h-5 text-[#D4AF37]" />
                    ) : status.plan === "premium" ? (
                      <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                    ) : (
                      <Building2 className="w-5 h-5 text-[#D4AF37]" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="text-white text-base font-semibold flex items-center gap-2">
                      Plan {status.planLabel}
                      {status.cancelAtPeriodEnd && (
                        <Badge className="bg-yellow-700/20 text-yellow-300 text-xs">
                          Cancela al vencer
                        </Badge>
                      )}
                    </h3>
                    <p className="text-white/40 text-xs">
                      {status.periodEnd
                        ? `Período activo hasta ${new Date(
                            status.periodEnd
                          ).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}`
                        : "Plan gratuito — sin fecha de vencimiento"}
                    </p>
                  </div>
                </div>
                {status.hasStripeSubscription && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/10"
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
                  </motion.div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#D4AF37]" /> Análisis IA este
                      mes
                    </span>
                    <span>
                      {status.analysesUsed} /
                      {status.analysesLimit === 999999
                        ? " ∞"
                        : ` ${status.analysesLimit}`}
                    </span>
                  </div>
                  <Progress
                    value={usagePercent}
                    className="h-1.5 bg-white/10"
                  />
                  {usagePercent >= 80 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-yellow-400 text-xs flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" />
                      {usagePercent >= 100
                        ? "Límite alcanzado — actualiza tu plan"
                        : "Cerca del límite mensual"}
                    </motion.p>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-[#D4AF37]" />
                      Almacenamiento
                    </span>
                    <span>
                      {formatBytes(status.storageUsedBytes)} /
                      {formatBytes(status.storageLimitBytes)}
                    </span>
                  </div>
                  <Progress
                    value={storagePercent}
                    className="h-1.5 bg-white/10"
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        <Separator className="bg-white/10" />

        {/* Plans header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center space-y-2"
        >
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Elige tu plan
          </h2>
          <p className="text-white/50 text-sm">
            Prueba los pagos con la tarjeta{" "}
            <code className="bg-[#D4AF37]/10 px-1.5 py-0.5 rounded text-[#D4AF37] font-mono text-xs border border-[#D4AF37]/20">
              4242 4242 4242 4242
            </code>{" "}
            en modo sandbox.
          </p>
        </motion.div>

        {plansLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-12"
          >
            <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          </motion.div>
        ) : (
          <>
            {/* Free plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="!p-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white/40" />
                    </div>
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
                      <Badge className="bg-green-800/20 text-green-300 border-green-600/30">
                        Activo
                      </Badge>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Paid plans grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {plansData?.plans.map((plan, idx) => (
                <motion.div
                  key={`${plan.planKey}-${plan.interval}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <PlanCard
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
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* Security note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="!p-5 border-green-600/20">
            <div className="flex items-start gap-3">
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
            </div>
          </GlassCard>
        </motion.div>

        {/* Claim sandbox reminder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="!p-5 border-yellow-600/20">
            <div className="flex items-start gap-3">
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
                    className="underline text-yellow-300 hover:text-yellow-200 transition-colors"
                  >
                    dashboard.stripe.com
                  </a>{" "}
                  antes del 19 de mayo de 2026.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}