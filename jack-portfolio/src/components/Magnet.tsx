import { motion, useMotionValue, useSpring } from "framer-motion";
import { ReactNode, useRef } from "react";

type MagnetProps = {
  children: ReactNode;
  className?: string;
  strength?: number;
  padding?: number;
};

export default function Magnet({
  children,
  className,
  strength = 20,
  padding = 100,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  function handleMouseMove(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distX = e.clientX - centerX;
    const distY = e.clientY - centerY;

    const dist = Math.sqrt(distX * distX + distY * distY);
    if (dist > padding + Math.max(rect.width, rect.height) / 2) {
      x.set(0);
      y.set(0);
      return;
    }

    x.set(distX / strength);
    y.set(distY / strength);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY, willChange: "transform" }}
      transition={{ type: "tween", ease: "easeOut", duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}
