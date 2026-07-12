"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map(plan => (
            <Card
              key={plan.name}
              className="relative"
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
                  Cambiar Plan
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
