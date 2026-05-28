import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ChevronLeft, CreditCard } from "lucide-react";
import { Link } from "wouter";

export default function PaymentCancelled() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-white/10 bg-white/5">
        <CardContent className="py-10 px-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-white/30" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Pago cancelado
            </h1>
            <p className="text-white/60 text-sm">
              No se realizó ningún cargo. Puedes intentarlo de nuevo cuando
              quieras o continuar con el plan gratuito.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/suscripcion">
              <Button className="w-full bg-red-600 hover:bg-red-700 text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Ver planes disponibles
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="w-full border-white/20 text-white/70 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
