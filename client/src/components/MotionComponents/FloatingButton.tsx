import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface FloatingButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FloatingButton = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
}: FloatingButtonProps) => {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#D4AF37] to-[#6B4AA3] text-white',
    secondary: 'bg-transparent border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0F2942]',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      animate={{ y: [0, -6, 0] }}
      transition={{
        hover: { duration: 0.2 },
        tap: { duration: 0.1 },
        y: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
      }}
      onClick={onClick}
      className={`rounded-lg font-semibold transition-all duration-300 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};
