import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  onClick?: () => void;
  hoverEffect?: 'lift' | 'glow' | 'scale';
}

export const GlassCard = ({
  children,
  className = '',
  delay = 0,
  onClick,
  hoverEffect = 'lift',
}: GlassCardProps) => {
  const hoverVariants = {
    lift: {
      y: -8,
      boxShadow: '0 20px 40px rgba(212, 175, 55, 0.2)',
    },
    glow: {
      boxShadow: '0 0 30px rgba(107, 74, 163, 0.4)',
    },
    scale: {
      scale: 1.02,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={hoverVariants[hoverEffect]}
      transition={{
        duration: 0.4,
        delay,
        ease: 'easeOut',
      }}
      className={`glass-effect p-6 cursor-pointer transition-all ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
