"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CreditCard, Crown, Sparkles } from "lucide-react";

const plans = [
  {
    name: "Free",
    icon: CreditCard,
    price: "$0",
    features: ["3 análisis/mes", "5 casos", "500 MB almacenamiento"],
    color: "#8892A0",
  },
  {
    name: "Premium",
    icon: Sparkles,
    price: "$29/mes",
    features: [
      "100 análisis/mes",
      "50 casos",
      "10 GB almacenamiento",
      "Análisis de contradicciones",
      "Reportes PDF",
    ],
    color: "#E8B86D",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Crown,
    price: "$99/mes",
    features: [
      "300 análisis/mes",
      "Casos ilimitados",
      "100 GB almacenamiento",
      "API access",
      "Soporte prioritario",
    ],
    color: "#E8B86D",
  },
];

export default function SubscriptionPage() {
  const { data: sub } = trpc.subscriptions.getMine.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#E8EDF2" }}>
            Suscripción
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#8892A0" }}>
            Administra tu plan
          </p>
        </div>

        {sub && (
          <Card>
            <CardHeader>
              <CardTitle style={{ color: "#E8EDF2" }}>
                Plan Actual:{" "}
                <Badge
                  style={{
                    backgroundColor: "rgba(232, 184, 109, 0.1)",
                    color: "#E8B86D",
                    border: "1px solid rgba(232, 184, 109, 0.3)",
                  }}
                >
                  {sub.plan}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm" style={{ color: "#8892A0" }}>
                    Análisis usados
                  </p>
                  <p className="text-lg font-bold" style={{ color: "#E8EDF2" }}>
                    {sub.analysesUsed} / {sub.analysesLimit}
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: "#8892A0" }}>
                    Almacenamiento
                  </p>
                  <p className="text-lg font-bold" style={{ color: "#E8EDF2" }}>
                    {(sub.storageUsedBytes / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <div>
                  <p className="text-sm" style={{ color: "#8892A0" }}>
                    Estado
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color: sub.active ? "#E8B86D" : "#EF4444",
                    }}
                  >
                    {sub.active ? "Activo" : "Inactivo"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map(plan => (
            <Card
              key={plan.name}
              className={`relative`}
              style={
                plan.popular
                  ? { border: "1px solid rgba(232, 184, 109, 0.5)" }
                  : {}
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    style={{
                      backgroundColor: "#E8B86D",
                      color: "#12151E",
                    }}
                  >
                    Más popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-3">
                  <plan.icon
                    className="h-5 w-5"
                    style={{ color: plan.color }}
                  />
                  <CardTitle style={{ color: "#E8EDF2" }}>
                    {plan.name}
                  </CardTitle>
                </div>
                <p
                  className="mt-2 text-3xl font-bold"
                  style={{ color: "#E8EDF2" }}
                >
                  {plan.price}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2">
                  {plan.features.map(f => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "#8892A0" }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "#E8B86D" }}
                      />{" "}
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {sub?.plan === plan.name.toLowerCase()
                    ? "Plan Actual"
                    : "Cambiar Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
