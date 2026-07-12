import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Shield,
  FileSearch,
  Brain,
  Clock,
  Network,
  FileText,
  ChevronRight,
  Lock,
  Scale,
  Zap,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: FileSearch,
    title: "Análisis de Evidencia Digital",
    description:
      "Carga PDFs, imágenes, ZIPs, logs y exportaciones de chats. Extracción automática de metadatos, fechas, ubicaciones y autores.",
  },
  {
    icon: Brain,
    title: "IA Forense Avanzada",
    description:
      "Generación automática de dictámenes periciales, teorías del caso (acusación y defensa), resumen ejecutivo e identificación de inconsistencias.",
  },
  {
    icon: Clock,
    title: "Timeline Interactivo",
    description:
      "Visualización cronológica de eventos con filtros, navegación y marcadores de relevancia. Ideal para presentación judicial.",
  },
  {
    icon: Network,
    title: "Mapa de Relaciones",
    description:
      "Grafo visual de conexiones entre personas, eventos, archivos y dispositivos. Identifica patrones ocultos en la evidencia.",
  },
  {
    icon: FileText,
    title: "Reportes Legales PDF",
    description:
      "Exportación de dictámenes periciales con formato legal profesional, numeración de páginas, firma pericial y cadena de custodia.",
  },
  {
    icon: Lock,
    title: "Seguridad y Privacidad",
    description:
      "Almacenamiento cifrado en AWS S3, acceso por roles, auditoría completa y cumplimiento con estándares de confidencialidad legal.",
  },
];

const plans = [
  {
    name: "Gratuito",
    price: "$0",
    period: "/ mes",
    description: "Para explorar la plataforma",
    features: [
      "3 análisis por mes",
      "5 casos activos",
      "500 MB de almacenamiento",
      "Exportación PDF básica",
      "Soporte por email",
    ],
    cta: "Comenzar gratis",
    highlighted: false,
  },
  {
    name: "Premium",
    price: "$49",
    period: "/ mes",
    description: "Para profesionales activos",
    features: [
      "50 análisis por mes",
      "100 casos activos",
      "10 GB de almacenamiento",
      "Reportes PDF avanzados",
      "Timeline y mapa de relaciones",
      "Soporte prioritario",
    ],
    cta: "Comenzar Premium",
    highlighted: true,
  },
  {
    name: "Empresarial",
    price: "Custom",
    period: "",
    description: "Para despachos y firmas",
    features: [
      "Análisis ilimitados",
      "Casos ilimitados",
      "100 GB de almacenamiento",
      "API de integración",
      "Usuarios múltiples",
      "Soporte dedicado 24/7",
    ],
    cta: "Contactar ventas",
    highlighted: false,
  },
];

const stats = [
  { value: "99.9%", label: "Precisión en extracción de metadatos" },
  { value: "<2 min", label: "Tiempo promedio de análisis IA" },
  { value: "ISO 27001", label: "Estándar de seguridad" },
  { value: "LATAM", label: "Cobertura jurisdiccional" },
];

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      window.location.href = getLoginUrl();
    }
  };

  return (
    <div className="home-page min-h-screen bg-background text-foreground">
      {/* ─── Navigation ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              Forensic<span className="text-primary">Legal</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a
              href="#features"
              className="hover:text-foreground transition-colors"
            >
              Funcionalidades
            </a>
            <a
              href="#pricing"
              className="hover:text-foreground transition-colors"
            >
              Precios
            </a>
            <a
              href="#security"
              className="hover:text-foreground transition-colors"
            >
              Seguridad
            </a>
          </div>
          <div className="flex items-center gap-3">
            {!loading &&
              (isAuthenticated ? (
                <Button onClick={() => navigate("/dashboard")} size="sm">
                  Ir al Dashboard
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => (window.location.href = getLoginUrl())}
                  >
                    Iniciar sesión
                  </Button>
                  <Button size="sm" onClick={handleCTA}>
                    Comenzar gratis
                  </Button>
                </>
              ))}
          </div>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.93 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.93 0 0) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge
              variant="outline"
              className="mb-6 border-primary/30 text-primary bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
            >
              <AlertTriangle className="w-3 h-3 mr-2" />
              Plataforma de Análisis Forense Digital
            </Badge>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Evidencia Digital
              <br />
              <span className="text-primary">Convertida en</span>
              <br />
              Argumentos Legales
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Plataforma SaaS de análisis forense digital para abogados y
              peritos. Analiza evidencia con IA, genera dictámenes periciales y
              exporta reportes listos para presentación judicial.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleCTA}
                className="text-base px-8 h-12"
              >
                <Zap className="w-5 h-5 mr-2" />
                Comenzar análisis gratis
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-12 border-border hover:border-primary/50"
                onClick={() => navigate("/login")}
              >
                <Scale className="w-5 h-5 mr-2" />
                Ver demostración
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Sin tarjeta de crédito · 3 análisis gratuitos · Cancelar en
              cualquier momento
            </p>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(stat => (
              <div
                key={stat.label}
                className="text-center p-6 bg-card border border-border rounded-lg"
              >
                <div className="text-2xl font-bold text-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ────────────────────────────────────────────────── */}
      <section id="features" className="py-20 border-t border-border">
        <div className="container">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-border text-muted-foreground text-xs tracking-widest uppercase"
            >
              Funcionalidades
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para el análisis forense
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Desde la carga de evidencia hasta la exportación del dictamen
              pericial, cada paso está diseñado para el profesional del derecho.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(feature => (
              <div
                key={feature.title}
                className="p-6 bg-card border border-border rounded-lg hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-muted-foreground">
              Tres pasos para convertir evidencia digital en argumentos legales
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                title: "Carga la evidencia",
                desc: "Arrastra y suelta archivos PDF, imágenes, ZIPs, logs o exportaciones de chats. El sistema extrae metadatos automáticamente.",
                icon: FileSearch,
              },
              {
                step: "02",
                title: "La IA analiza",
                desc: "Nuestro motor de IA forense procesa la evidencia y genera dictamen pericial, timeline, teorías del caso y detecta inconsistencias.",
                icon: Brain,
              },
              {
                step: "03",
                title: "Exporta el reporte",
                desc: "Descarga el dictamen pericial en PDF con formato legal profesional, listo para presentación ante tribunal.",
                icon: FileText,
              },
            ].map(item => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <div className="text-xs font-mono text-primary mb-2 tracking-widest">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Security ────────────────────────────────────────────────── */}
      <section id="security" className="py-20 border-t border-border">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge
                variant="outline"
                className="mb-4 border-border text-muted-foreground text-xs tracking-widest uppercase"
              >
                Seguridad
              </Badge>
              <h2 className="text-3xl font-bold mb-4">
                Seguridad de nivel empresarial para datos sensibles
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                La evidencia legal es confidencial. Nuestra plataforma
                implementa cifrado en tránsito y en reposo, control de acceso
                por roles y auditoría completa de todas las operaciones.
              </p>
              <div className="space-y-3">
                {[
                  "Cifrado AES-256 en almacenamiento S3",
                  "Transmisión HTTPS/TLS 1.3",
                  "Autenticación OAuth 2.0",
                  "Control de acceso basado en roles",
                  "Auditoría completa de operaciones",
                  "Aislamiento de datos por usuario",
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-8">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-primary" />
                <span className="font-semibold">Panel de Seguridad</span>
              </div>
              <div className="space-y-4">
                {[
                  {
                    label: "Cifrado de archivos",
                    status: "Activo",
                    color: "text-green-400",
                  },
                  {
                    label: "Autenticación 2FA",
                    status: "Disponible",
                    color: "text-green-400",
                  },
                  {
                    label: "Auditoría de acceso",
                    status: "Registrando",
                    color: "text-green-400",
                  },
                  {
                    label: "Backup automático",
                    status: "Cada 24h",
                    color: "text-blue-400",
                  },
                  {
                    label: "Retención de datos",
                    status: "Configurable",
                    color: "text-yellow-400",
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <span className={`text-xs font-medium ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 border-t border-border bg-card/30">
        <div className="container">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 border-border text-muted-foreground text-xs tracking-widest uppercase"
            >
              Precios
            </Badge>
            <h2 className="text-3xl font-bold mb-4">
              Planes para cada necesidad
            </h2>
            <p className="text-muted-foreground">
              Comienza gratis, escala cuando lo necesites
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`p-8 rounded-lg border ${
                  plan.highlighted
                    ? "border-primary bg-primary/5 relative"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-3">
                      Más popular
                    </Badge>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">
                      {plan.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(feature => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  onClick={handleCTA}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Final ───────────────────────────────────────────────── */}
      <section className="py-20 border-t border-border">
        <div className="container text-center">
          <div className="max-w-2xl mx-auto">
            <BarChart3 className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Listo para transformar tu práctica legal
            </h2>
            <p className="text-muted-foreground mb-8">
              Únete a los profesionales del derecho que ya utilizan inteligencia
              artificial para analizar evidencia digital y ganar casos.
            </p>
            <Button
              size="lg"
              onClick={handleCTA}
              className="px-10 h-12 text-base"
            >
              Comenzar ahora — Es gratis
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Shield className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">
              Forensic Legal Analyzer
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Forensic Legal Analyzer. Todos los
            derechos reservados.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacidad
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Términos
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Soporte
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
