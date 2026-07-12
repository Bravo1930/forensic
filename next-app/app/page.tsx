import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              FL
            </div>
            <span className="text-lg font-semibold">Forensic Legal</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Iniciar Sesión
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-32 pb-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: "#E8B86D" }}
          />
          Análisis forense con IA
        </div>
        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Análisis Forense Digital{" "}
          <span className="text-primary">con Inteligencia Artificial</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Plataforma profesional para abogados y peritos. Analiza evidencia
          digital, detecta contradicciones, y genera dictámenes periciales con
          rigor técnico y científico.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Comenzar gratis
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-secondary px-8 text-sm font-medium hover:bg-accent transition-colors"
          >
            Ver Dashboard
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Análisis de Evidencia",
              desc: "Procesa documentos, imágenes y archivos digitales con IA forense especializada.",
            },
            {
              title: "Detección de Contradicciones",
              desc: "Identifica inconsistencias en declaraciones y documentos legales automáticamente.",
            },
            {
              title: "Dictámenes Periciales",
              desc: "Genera informes técnico-legales listos para presentación judicial.",
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-8 hover:border-[#E8B86D]/50 transition-colors"
            >
              <h3 className="mb-3 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Forensic Legal Analyzer &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
