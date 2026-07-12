import FadeIn from "./FadeIn";

const services = [
  {
    num: "01",
    name: "3D Modeling",
    desc: "Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.",
  },
  {
    num: "02",
    name: "Rendering",
    desc: "High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.",
  },
  {
    num: "03",
    name: "Motion Design",
    desc: "Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.",
  },
  {
    num: "04",
    name: "Branding",
    desc: "Crafting cohesive visual identities — from logos to full brand systems — that communicate a clear and memorable presence.",
  },
  {
    num: "05",
    name: "Web Design",
    desc: "Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.",
  },
];

export default function ServicesSection() {
  return (
    <section className="bg-white rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32">
      <FadeIn delay={0} y={40} duration={0.7} as="h2">
        <h2
          className="text-[#0C0C0C] font-black uppercase text-center mb-16 sm:mb-20 md:mb-28"
          style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
        >
          Services
        </h2>
      </FadeIn>

      <div className="max-w-6xl mx-auto flex flex-col gap-12 sm:gap-16 md:gap-20">
        {services.map((service, i) => (
          <FadeIn key={service.num} delay={i * 0.1} y={30} duration={0.6}>
            <div className="flex items-start gap-6 sm:gap-8 md:gap-12">
              {/* Number */}
              <span
                className="font-black text-[#0C0C0C] leading-none shrink-0"
                style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
              >
                {service.num}
              </span>
              {/* Content */}
              <div className="pt-2 sm:pt-3 md:pt-4">
                <h3
                  className="font-medium uppercase text-[#0C0C0C] mb-3"
                  style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                >
                  {service.name}
                </h3>
                <p
                  className="font-light text-[#0C0C0C]/70 leading-relaxed max-w-2xl"
                  style={{ fontSize: "clamp(0.85rem, 1.2vw, 1.1rem)" }}
                >
                  {service.desc}
                </p>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
