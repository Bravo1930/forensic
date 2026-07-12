import AnimatedText from "./AnimatedText";
import ContactButton from "./ContactButton";
import FadeIn from "./FadeIn";

export default function AboutSection() {
  return (
    <section className="relative min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center px-5 sm:px-8 md:px-10 py-20 overflow-hidden">
      {/* Decorative corner images */}
      {/* Top-left: Moon */}
      <FadeIn
        delay={0.1}
        x={-80}
        y={0}
        duration={0.9}
        className="absolute top-[4%] left-[1%] sm:left-[2%] md:left-[4%] z-10"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png"
          alt=""
          className="w-[120px] sm:w-[160px] md:w-[210px] object-contain"
        />
      </FadeIn>

      {/* Bottom-left: 3D icon */}
      <FadeIn
        delay={0.2}
        x={-80}
        y={0}
        duration={0.9}
        className="absolute bottom-[8%] left-[3%] sm:left-[6%] md:left-[10%] z-10"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/moon_icon.11395d36.png"
          alt=""
          className="w-[120px] sm:w-[160px] md:w-[210px] object-contain opacity-60"
        />
      </FadeIn>

      {/* Top-right: Lego */}
      <FadeIn
        delay={0.15}
        x={80}
        y={0}
        duration={0.9}
        className="absolute top-[4%] right-[1%] sm:right-[2%] md:right-[4%] z-10"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/lego_icon-1.703bb594.png"
          alt=""
          className="w-[120px] sm:w-[160px] md:w-[210px] object-contain"
        />
      </FadeIn>

      {/* Bottom-right: 3D Group */}
      <FadeIn
        delay={0.3}
        x={80}
        y={0}
        duration={0.9}
        className="absolute bottom-[8%] right-[3%] sm:right-[6%] md:right-[10%] z-10"
      >
        <img
          src="https://shrug-person-78902957.figma.site/_components/v2/ebb2b8f25d8e24d5f0a5ca8af4c950de81aa2fd7/Group_134-1.2e04f3ce.png"
          alt=""
          className="w-[130px] sm:w-[170px] md:w-[220px] object-contain"
        />
      </FadeIn>

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center gap-10 sm:gap-14 md:gap-16 max-w-5xl mx-auto text-center">
        <FadeIn delay={0} y={40} duration={0.7} as="h2">
          <h2
            className="hero-heading font-black uppercase leading-none tracking-tight"
            style={{ fontSize: "clamp(3rem, 12vw, 160px)" }}
          >
            About me
          </h2>
        </FadeIn>

        <AnimatedText
          text="I'm Jack, a 3D creator passionate about building immersive digital experiences. From concept to final render, I craft visuals that leave a lasting impression. Every project is an opportunity to push boundaries and explore new creative frontiers."
          className="text-[#D7E2EA] font-light text-base sm:text-lg md:text-xl leading-relaxed max-w-3xl"
        />

        <FadeIn delay={0.3} y={20} duration={0.7}>
          <ContactButton />
        </FadeIn>
      </div>
    </section>
  );
}
