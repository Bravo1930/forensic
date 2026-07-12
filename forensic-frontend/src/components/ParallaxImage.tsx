"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ParallaxImageProps {
  src: string;
  alt: string;
  className?: string;
  scale?: number;
  speed?: number;
}

export default function ParallaxImage({
  src,
  alt,
  className = "",
  scale = 1.3,
  speed = 0.5,
}: ParallaxImageProps) {
  const imgRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = imgRef.current;
    const image = imageRef.current;

    if (!container || !image) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        image,
        { scale: 1, y: 0 },
        {
          scale,
          yPercent: 30 * speed,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, [scale, speed]);

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ height: "500px", width: "100%" }}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ transformOrigin: "center center" }}
      />
    </div>
  );
}
