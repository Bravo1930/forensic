import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Clock } from "lucide-react";

export default function Terminos() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">Términos y Condiciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Última actualización: 13 de noviembre de 2026
            </p>

            <h2 className="text-xl font-bold mb-4">1. Servicios</h2>
            <p className="text-muted-foreground space-y-2">
              La plataforma Forensic Legal Analyzer proporciona herramientas de
              análisis forense digital para abogados y peritos. Los servicios
              incluyen análisis de evidencia, generación de dictámenes periciales,
              creación de reportes PDF y mapas de relaciones.
            </p>

            <h2 className="text-xl font-bold mt-4">2. Obligaciones del usuario</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Proporcionar información verdadera y exacta al registrarte.
              </li>
              <li>
                No usar la plataforma para fines ilegales o fraudulentos.
              </li>
              <li>
                Mantener la confidencialidad de la información de casos y evidencia.
              </li>
              <li>
                Notificar inmediatamente cualquier uso no autorizado de tu cuenta.
              </li>
            </ul>

            <h2 className="text-xl font-bold mt-4">3. Limitación de responsabilidad</h2>
            <p className="text-muted-foreground space-y-2">
              Los análisis generados por la IA son herramientas asistivas. El usuario
              es responsable de verificar los resultados y contratar peritos
              certificados para la presentación en tribunales. No garantizamos la
              exactitud completa de los análisis automatizados.
            </p>

            <h2 className="text-xl font-bold mt-4">4. Suscripción y pagos</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Los planes gratuitos tienen límites de uso mensuales y de almacenamiento.
              </li>
              <li>
                Los pagos se procesan mediante Stripe en modo sandbox para
                desarrollo y pruebas.
              </li>
              <li>
                Las suscripciones se renuevan automáticamente según el plan seleccionado.
              </li>
              <li>
                Puedes cancelar tu suscripción en cualquier momento desde el portal
                de facturación.
              </li>
            </ul>

            <h2 className="text-xl font-bold mt-4">5. Propiedad intelectual</h2>
            <p className="text-muted-foreground space-y-2">
              El nombre "Forensic Legal Analyzer", el logotipo y todo el contenido
              original de la plataforma están protegidos por derechos de autor.
              Los dictámenes y reportes generados son propiedad del usuario que los
              solicita.
            </p>

            <h2 className="text-xl font-bold mt-4">6. Cancelación</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Puedes cancelar tu suscripción en cualquier momento desde el portal
                de facturación de Stripe.
              </li>
              <li>
                Al cancelar, mantienes acceso al plan gratuito hasta el final del
                período de facturación actual.
              </li>
              <li>
                Los datos se mantienen según nuestra política de retención, pero el
                acceso a funciones premium se revoca al cancelar.
              </li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                    <a
                      href="mailto:legal@forensiclegalanalyzer.com"
                      className="text-primary hover:text-primary-500"
                    >
                     legal@forensiclegalanalyzer.com
                    </a> para consultas legales sobre estos términos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}