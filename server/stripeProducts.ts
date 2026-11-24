/**
 * Stripe Products & Prices for ForensicLegal Platform
 *
 * Plans (MXN):
 *  - Premium Mensual  → $850 MXN/month
 *  - Premium Anual    → $8,500 MXN/year  (10 meses: 2 meses gratis)
 *  - Empresarial Mensual → $2,600 MXN/month
 *  - Empresarial Anual   → $26,000 MXN/year  (10 meses: 2 meses gratis)
 */

export interface PlanPrice {
  /** Human-readable plan name */
  name: string;
  /** Internal plan key matching subscriptions.plan enum */
  planKey: "premium" | "enterprise";
  /** Billing interval */
  interval: "month" | "year";
  /** Amount in USD cents */
  amountCents: number;
  /** Display price string */
  displayPrice: string;
  /** Display interval label */
  displayInterval: string;
  /** Stripe Price ID (set after creating in Stripe dashboard or via API) */
  stripePriceId: string;
  /** Features included */
  features: string[];
  /** Monthly analyses limit */
  analysesLimit: number;
  /** Storage limit in GB */
  storageGb: number;
  /** Max cases */
  maxCases: number;
}

export const STRIPE_PLANS: PlanPrice[] = [
  {
    name: "Premium Mensual",
    planKey: "premium",
    interval: "month",
    amountCents: 85000,
    displayPrice: "$850",
    displayInterval: "/mes",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
    features: [
      "20 análisis IA por mes",
      "Almacenamiento 10 GB",
      "Hasta 50 casos activos",
      "Dictamen pericial completo",
      "Exportación PDF ilimitada",
      "Análisis de imágenes con visión",
      "Comparación forense de imágenes",
      "Soporte por correo electrónico",
    ],
    analysesLimit: 20,
    storageGb: 10,
    maxCases: 50,
  },
  {
    name: "Premium Anual",
    planKey: "premium",
    interval: "year",
    amountCents: 850000,
    displayPrice: "$8,500",
    displayInterval: "/año",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "",
    features: [
      "20 análisis IA por mes",
      "Almacenamiento 10 GB",
      "Hasta 50 casos activos",
      "Dictamen pericial completo",
      "Exportación PDF ilimitada",
      "Análisis de imágenes con visión",
      "Comparación forense de imágenes",
      "Soporte por correo electrónico",
      "2 meses gratis (paga 10 meses)",
    ],
    analysesLimit: 20,
    storageGb: 10,
    maxCases: 50,
  },
  {
    name: "Empresarial Mensual",
    planKey: "enterprise",
    interval: "month",
    amountCents: 260000,
    displayPrice: "$2,600",
    displayInterval: "/mes",
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ?? "",
    features: [
      "Análisis IA ilimitados",
      "Almacenamiento 100 GB",
      "Casos ilimitados",
      "Todos los módulos IA",
      "Exportación PDF ilimitada",
      "Análisis de imágenes con visión",
      "Comparación forense de imágenes",
      "API de integración",
      "Soporte prioritario 24/7",
      "Usuarios múltiples (hasta 10)",
    ],
    analysesLimit: 999999,
    storageGb: 100,
    maxCases: 999999,
  },
  {
    name: "Empresarial Anual",
    planKey: "enterprise",
    interval: "year",
    amountCents: 2600000,
    displayPrice: "$26,000",
    displayInterval: "/año",
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL ?? "",
    features: [
      "Análisis IA ilimitados",
      "Almacenamiento 100 GB",
      "Casos ilimitados",
      "Todos los módulos IA",
      "Exportación PDF ilimitada",
      "Análisis de imágenes con visión",
      "Comparación forense de imágenes",
      "API de integración",
      "Soporte prioritario 24/7",
      "Usuarios múltiples (hasta 10)",
      "2 meses gratis (paga 10 meses)",
    ],
    analysesLimit: 999999,
    storageGb: 100,
    maxCases: 999999,
  },
];

/** Free plan definition (no Stripe price needed) */
export const FREE_PLAN = {
  name: "Gratuito",
  planKey: "free" as const,
  displayPrice: "$0",
  displayInterval: "/siempre",
  features: [
    "3 análisis IA por mes",
    "Almacenamiento 500 MB",
    "Hasta 3 casos activos",
    "Resumen ejecutivo básico",
    "Exportación PDF (marca de agua)",
  ],
  analysesLimit: 3,
  storageGb: 0.5,
  maxCases: 3,
};

/** Get plan by Stripe price ID */
export function getPlanByPriceId(priceId: string): PlanPrice | undefined {
  return STRIPE_PLANS.find(p => p.stripePriceId === priceId);
}

/** Get plan by planKey and interval */
export function getPlanByKey(
  planKey: "premium" | "enterprise",
  interval: "month" | "year"
): PlanPrice | undefined {
  return STRIPE_PLANS.find(
    p => p.planKey === planKey && p.interval === interval
  );
}
