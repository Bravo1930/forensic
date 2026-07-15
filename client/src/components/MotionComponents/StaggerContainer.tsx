import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StaggerContainerProps {
  children: ReactNode;
  staggerDelay?: number;
  direction?: 'vertical' | 'horizontal';
  className?: string;
}

export const StaggerContainer = ({
  children,
  staggerDelay = 0.1,
  direction = 'vertical',
  className = '',
}: StaggerContainerProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      ...(direction === 'vertical' ? { y: 20 } : { x: 20 }),
    },
    visible: {
      opacity: 1,
      ...(direction === 'vertical' ? { y: 0 } : { x: 0 }),
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className={`space-y-4 ${className}`}
    >
      {Array.isArray(children)
        ? children.map((child, index) => (
            <motion.div key={index} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
};
