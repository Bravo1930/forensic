"use client";

import FadeIn from "./FadeIn";

const services = [
  {
    id: "01",
    name: "3D Modeling",
    description:
      "Creation of detailed objects, characters, or environments tailored to specific client needs, ideal for games, products, and visualizations.",
  },
  {
    id: "02",
    name: "Rendering",
    description:
      "High-quality, photorealistic renders that showcase designs with custom lighting, textures, and materials to bring concepts to life.",
  },
  {
    id: "03",
    name: "Motion Design",
    description:
      "Dynamic animations and motion graphics that add energy and storytelling to brands, products, and digital experiences.",
  },
  {
    id: "04",
    name: "Branding",
    description:
      "Crafting cohesive visual identities \u2014 from logos to full brand systems \u2014 that communicate a clear and memorable presence.",
  },
  {
    id: "05",
    name: "Web Design",
    description:
      "Designing clean, modern, and conversion-focused websites with attention to layout, typography, and user experience.",
  },
];

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="bg-white rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] px-5 sm:px-8 md:px-10 py-20 sm:py-24 md:py-32"
    >
      <div className="max-w-6xl mx-auto">
        <FadeIn as="h2" y={40}>
          <h2
            className="text-[#0C0C0C] font-black uppercase text-center mb-16 sm:mb-20 md:mb-28"
            style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
          >
            Services
          </h2>
        </FadeIn>

        <div className="space-y-12 sm:space-y-16 md:space-y-20">
          {services.map((service, i) => (
            <FadeIn key={service.id} delay={i * 0.1} y={30}>
              <div className="flex items-start gap-6 sm:gap-10 md:gap-16">
                <span
                  className="font-black text-[#0C0C0C] shrink-0 leading-none"
                  style={{ fontSize: "clamp(3rem, 10vw, 140px)" }}
                >
                  {service.id}
                </span>
                <div className="pt-2 sm:pt-3 md:pt-4">
                  <h3
                    className="font-medium uppercase text-[#0C0C0C]"
                    style={{ fontSize: "clamp(1rem, 2.2vw, 2.1rem)" }}
                  >
                    {service.name}
                  </h3>
                  <p
                    className="font-light text-[#0C0C0C]/80 leading-relaxed max-w-2xl mt-2"
                    style={{ fontSize: "clamp(0.875rem, 1.2vw, 1.125rem)" }}
                  >
                    {service.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
