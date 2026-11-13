import React from "react";
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  Cpu,
  Server,
  Scale,
} from "lucide-react";

interface SecurityCard {
  title: string;
  tag: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const guarantees: SecurityCard[] = [
  {
    title: "Integridad Criptográfica y Cadena de Custodia",
    tag: "SHA-256",
    icon: FileCheck2,
    description:
      "Cada archivo cargado genera de forma automática e inmediata una huella digital criptográfica (hash SHA-256) antes de cualquier procesamiento. Esto permite demostrar matemáticamente ante cualquier juzgado o tribunal que la evidencia analizada no sufrió alteraciones, cumpliendo con los principios de mismidad e integridad probatoria.",
  },
  {
    title: "Cifrado de Extremo a Extremo",
    tag: "TLS 1.3 + AES-256",
    icon: Lock,
    description:
      "Toda la comunicación entre tu navegador y nuestros servidores viaja protegida mediante protocolos TLS 1.3. Los archivos en procesamiento y los reportes periciales se almacenan bajo cifrado AES-256 con aislamiento estricto por cuenta (multi-tenancy lógico), impidiendo el acceso cruzado entre expedientes.",
  },
  {
    title: "Privacidad Absoluta en IA",
    tag: "Zero-Training Policy",
    icon: Cpu,
    description:
      "Comprendemos el deber del secreto profesional. Los documentos, metadatos y evidencias procesados por nuestros motores de inteligencia artificial se analizan en entornos efímeros y aislados. Bajo ninguna circunstancia utilizamos la información de tus casos para entrenar modelos propios ni de terceros.",
  },
  {
    title: "Infraestructura Cloud y Borrado Seguro",
    tag: "ISO 27001 & SOC 2",
    icon: Server,
    description:
      "Nuestra plataforma opera sobre centros de datos en la nube que cuentan con certificaciones físicas y operativas ISO/IEC 27001 y SOC 2 Tipo II. Además, tú mantienes el control total del ciclo de vida del expediente: puedes eliminar definitivamente la evidencia y sus metadatos de nuestros servidores una vez exportado tu dictamen pericial.",
  },
];

export function SecuritySection() {
  return (
    <section
      id="seguridad"
      className="relative py-24 md:py-32 border-t border-slate-800/80 overflow-hidden bg-slate-950/60"
    >
      {/* Anchor for backward compatibility with #security */}
      <div id="security" className="absolute -top-24 left-0 pointer-events-none" />

      {/* Subtle depth lighting and ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] md:w-[900px] h-[450px] bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none opacity-60"
        aria-hidden="true"
      />

      <div className="container relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-4xl mx-auto mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-6 shadow-sm backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Arquitectura de Confianza y Rigor Pericial</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-100 mb-6 leading-tight">
            Seguridad de Grado Pericial y Preservación de Cadena de Custodia
          </h2>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            Diseñamos la arquitectura de ForensicLegal bajo los controles técnicos
            de los estándares internacionales ISO/IEC 27001:2022 (Seguridad de la
            Información) e ISO/IEC 27037 (Identificación, recolección y
            preservación de evidencia digital), garantizando la integridad
            probatoria y el secreto profesional en cada análisis.
          </p>
        </div>

        {/* Bento Grid / 2x2 Technical Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-14">
          {guarantees.map((item) => (
            <div
              key={item.title}
              className="group relative rounded-2xl p-7 sm:p-8 bg-slate-900/50 backdrop-blur-md border border-slate-800/80 hover:border-orange-500/40 transition-all duration-300 shadow-lg shadow-black/30 hover:shadow-orange-500/5 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
            >
              {/* Subtle card corner radial highlight on hover */}
              <div
                className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                aria-hidden="true"
              />

              <div>
                {/* Top bar: Illuminated icon container + Technical tag */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="w-12 h-12 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg p-3 flex items-center justify-center group-hover:scale-105 group-hover:bg-orange-500/15 group-hover:border-orange-500/30 transition-all duration-300 flex-shrink-0 shadow-sm">
                    <item.icon className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold tracking-wider bg-slate-800/90 text-orange-400/95 border border-slate-700/70 shadow-sm">
                    {item.tag}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-xl font-bold tracking-tight text-slate-100 mb-3 group-hover:text-white transition-colors leading-snug">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-sm text-slate-400 leading-relaxed font-normal">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Callout de Descargo Técnico-Legal */}
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-slate-400 leading-relaxed backdrop-blur-md shadow-sm">
            <Scale className="w-5 h-5 text-orange-400/90 flex-shrink-0 mt-0.5" />
            <p className="text-slate-400">
              <strong className="text-slate-300 font-medium">Nota de Cumplimiento y Estándares: </strong>
              La arquitectura de software, el control de accesos y las políticas de tratamiento de datos de ForensicLegal han sido diseñados siguiendo las directrices del Anexo A de la norma ISO/IEC 27001:2022 y las guías de manejo de evidencia digital ISO/IEC 27037. Nuestra infraestructura subyacente en la nube opera en centros de datos auditados y certificados bajo ISO 27001 y SOC 2. La alineación arquitectónica de la plataforma a dichos estándares técnicos no implica la emisión de un certificado corporativo directo por una entidad acreditadora sobre el software como servicio, ni sustituye la intervención de un perito acreditado cuando la legislación procesal local así lo exija.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SecuritySection;
