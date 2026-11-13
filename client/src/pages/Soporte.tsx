import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Mail, Phone, Clock } from "lucide-react";

export default function Soporte() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">Soporte</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              ¿Necesitas ayuda con Forensic Legal Analyzer? Estamos aquí para
              asistirte.
            </p>

            <h2 className="text-xl font-bold mb-4">Contacto</h2>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  <a href="mailto:support@forensiclegalanalyzer.com"
                    className="text-primary hover:text-primary-500"
                  >
                    support@forensiclegalanalyzer.com
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Tiempo de respuesta: Hasta 24 horas hábiles
                </p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span className="font-medium">Soporte Técnico</span>
                </div>
                <p className="text-muted-foreground text-sm">
                  <a href="tel:+15551234567"
                    className="text-primary hover:text-primary-500"
                  >
                    +1 (555) 123-4567
                  </a>
                </p>
                <p className="text-xs text-muted-foreground/80">
                  Horario: Lunes a Viernes, 9:00 - 18:00 (UTC-5)
                </p>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">Recursos</h2>

            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/privacidad")}
                className="w-full justify-center text-left"
              >
                <Badge
                  className="mr-2 text-[10px] px-1.5 py-0.5 rounded text-primary"
                >
                  Privacidad
                </Badge>
                Política de Privacidad
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/terminos")}
                className="w-full justify-center text-left"
              >
                <Badge
                  className="mr-2 text-[10px] px-1.5 py-0.5 rounded text-primary"
                >
                  Términos
                </Badge>
                Términos y Condiciones
              </Button>
            </div>

            <h2 className="text-xl font-bold mt-6">Preguntas Frecuentes</h2>

            <div className="space-y-3">
              <details>
                <summary className="cursor-pointer text-sm text-primary flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M9 5h12v2H9zm0 4h12v2H9zm0 4h12v2H9z"
                    />
                  </svg>
                  ¿Cómo restablezco mi contraseña?
                </summary>
                <p className="text-muted-foreground text-xs mt-2">
                  Usa el enlace "¿Olvidaste tu contraseña?" en la página de
                  inicio de sesión y recibe un correo con instrucciones de restablecimiento.
                </p>
              </details>

              <details>
                <summary className="cursor-pointer text-sm text-primary flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M9 5h12v2H9zm0 4h12v2H9zm0 4h12v2H9z"
                    />
                  </svg>
                  ¿Cómo contacto al soporte?
                </summary>
                <p className="text-muted-foreground text-xs mt-2">
                  Puedes contactarnos por email a
                  <code>support@forensiclegalanalyzer.com</code> o por teléfono
                  al +1 (555) 123-4567.
                </p>
              </details>

              <details>
                <summary className="cursor-pointer text-sm text-primary flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      d="M9 5h12v2H9zm0 4h12v2H9zm0 4h12v2H9z"
                    />
                  </svg>
                  ¿Los reportes PDF son válidos en court?
                </summary>
                <p className="text-muted-foreground text-xs mt-2">
                  Sí, los reportes PDF generados por Forensic Legal Analyzer incluyen
                  firma pericial, numeración de páginas y cadena de custodia,
                  cumpliendo con estándares de presentación judicial. Se recomienda
                  la ratificación por un perito certificado.
                </p>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}