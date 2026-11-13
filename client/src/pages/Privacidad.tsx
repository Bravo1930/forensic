import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, Clock } from "lucide-react";

export default function Privacidad() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold">Política de Privacidad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-lg leading-relaxed mb-6">
              Última actualización: 13 de noviembre de 2026
            </p>

            <h2 className="text-xl font-bold mb-4">Información que recopilamos</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Datos personales: Nombre, email y información de perfil que proporcionas
                al registrarte en la plataforma.
              </li>
              <li>
                Datos de caso: Títulos, descripciones y metadatos de los expedientes
                que creas y gestionas.
              </li>
              <li>
                Evidencia: Archivos cargados (PDFs, imágenes, etc.) y sus metadatos
                extraídos automáticamente.
              </li>
              <li>
                Información de uso: Fechas de acceso, análisis realizados y patrones
                de uso de la plataforma.
              </li>
            </ul>

            <h2 className="text-xl font-bold mt-6">Cómo usamos tus información</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Para generar análisis forenses y reportes periciales basados en tu
                evidencia.
              </li>
              <li>
                Para proporcionar acceso a la plataforma y mantener tu cuenta segura.
              </li>
              <li>
                Para mejorar nuestras funcionalidades de IA y detección de
                manipulaciones.
              </li>
              <li>
                Para cumplir con obligaciones legales y regulatorias.
              </li>
            </ul>

            <h2 className="text-xl font-bold mt-6">Compartición y divulgación</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Tus datos nunca se comparten con terceros sin tu consentimiento, salvo
                que sea requerido por ley o para protección judicial.
              </li>
              <li>
                Los reportes PDF generados son tuyos y puedes descargarlos y
                distribuirlos según lo desees.
              </li>
              <li>
                Los datos anonimizados pueden usarse para mejorar el modelo de IA
                en forma agregada.
              </li>
            </ul>

            <h2 className="text-xl font-bold mt-6">Tus derechos</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-2">
              <li>
                Acceder y corregir tus datos personales en cualquier momento.
              </li>
              <li>
                Solicitar la eliminación de tus datos (salvo obligaciones de retención
                legal).
              </li>
              <li>
                Oponerte al procesamiento de tus datos para fines de mejora del modelo.
              </li>
              <li>
                Portabilidad de tus datos a otro servicio.
              </li>
            </ul>

            <div className="mt-8 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Contacta a nuestro equipo de privacidad en
                <a href="mailto:privacy@forensiclegalanalyzer.com"
                  className="text-primary hover:text-primary-500"
                >
                  privacy@forensiclegalanalyzer.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}