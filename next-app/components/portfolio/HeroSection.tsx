"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Magnet from "./Magnet";
import ContactButton from "./ContactButton";

export default function HeroSection() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "About", href: "#about" },
    { label: "Price", href: "#services" },
    { label: "Projects", href: "#projects" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <section
      className="relative h-screen w-full flex flex-col overflow-hidden"
      style={{ overflowX: "clip" }}
    >
      <nav className="flex items-center justify-between px-5 sm:px-8 md:px-10 pt-5 sm:pt-6 md:pt-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: scrolled ? 0 : 1, y: scrolled ? -20 : 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1"
        >
          <a
            href="#"
            className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg"
          >
            Jack
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-8 sm:gap-12 md:gap-16 lg:gap-24"
        >
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-xl"
            >
              {link.label}
            </a>
          ))}
        </motion.div>
      </nav>

      <div className="flex-1 flex items-center justify-center relative">
        <div className="w-full overflow-hidden">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="hero-heading text-[14vw] sm:text-[15vw] md:text-[16vw] lg:text-[17.5vw] font-black uppercase tracking-tight leading-none whitespace-nowrap w-full mt-6 sm:mt-4 md:-mt-5"
          >
            Hi, i&apos;m jack
          </motion.h1>
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Magnet strength={0.2} padding={150} className="pointer-events-auto">
            <motion.img
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.6,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a"
              alt="Jack Portrait"
              className="w-[120px] sm:w-[160px] md:w-[200px] lg:w-[250px] h-auto rounded-full"
            />
          </Magnet>
        </div>
      </div>

      <div className="flex justify-between items-end pb-7 sm:pb-8 md:pb-10 px-5 sm:px-8 md:px-10 z-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.35,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
          style={{ fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)" }}
        >
          a 3d creator driven by crafting striking and unforgettable projects
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          <ContactButton />
        </motion.div>
      </div>
    </section>
  );
}
