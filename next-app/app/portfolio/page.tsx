"use client";

import HeroSection from "@/components/portfolio/HeroSection";
import MarqueeSection from "@/components/portfolio/MarqueeSection";
import AboutSection from "@/components/portfolio/AboutSection";
import ServicesSection from "@/components/portfolio/ServicesSection";
import ProjectsSection from "@/components/portfolio/ProjectsSection";

export default function PortfolioPage() {
  return (
    <main
      className="bg-[#0C0C0C] min-h-screen"
      style={{ overflowX: "clip", fontFamily: "'Kanit', sans-serif" }}
    >
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </main>
  );
}
