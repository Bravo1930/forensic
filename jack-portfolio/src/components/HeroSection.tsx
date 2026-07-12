import ContactButton from "./ContactButton";
import FadeIn from "./FadeIn";
import Magnet from "./Magnet";

const navLinks = ["About", "Price", "Projects", "Contact"];

export default function HeroSection() {
  return (
    <section className="relative h-screen flex flex-col overflow-x-clip text-[#D7E2EA]">
      {/* Navbar */}
      <FadeIn y={-20} delay={0} duration={0.7}>
        <nav className="flex items-center justify-between px-5 sm:px-8 md:px-10 pt-6 sm:pt-8 md:pt-10">
          <span className="text-sm md:text-lg lg:text-xl font-medium uppercase tracking-wider">
            Jack
          </span>
          <div className="flex items-center gap-8 sm:gap-12 md:gap-16">
            {navLinks.map(link => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm md:text-lg lg:text-xl font-medium uppercase tracking-wider text-[#D7E2EA] hover:opacity-70 transition-opacity"
              >
                {link}
              </a>
            ))}
          </div>
        </nav>
      </FadeIn>

      {/* Hero Heading */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <FadeIn delay={0.15} y={40} duration={0.8}>
          <h1 className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw] mt-6 sm:mt-4 md:-mt-5">
            Hi, i&apos;m jack
          </h1>
        </FadeIn>
      </div>

      {/* Bottom bar */}
      <div className="flex justify-between items-end pb-7 sm:pb-8 md:pb-10 px-5 sm:px-8 md:px-10">
        <FadeIn delay={0.35} y={20} duration={0.7}>
          <p
            className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
            style={{ fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)" }}
          >
            a 3d creator driven by crafting striking and unforgettable projects
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20} duration={0.7}>
          <ContactButton />
        </FadeIn>
      </div>

      {/* Hero Portrait */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <FadeIn delay={0.6} y={30} duration={0.8}>
          <Magnet strength={30} padding={80} className="pointer-events-auto">
            <img
              src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a"
              alt="Jack 3D Portrait"
              className="w-[200px] sm:w-[260px] md:w-[320px] lg:w-[380px] object-contain"
            />
          </Magnet>
        </FadeIn>
      </div>
    </section>
  );
}
