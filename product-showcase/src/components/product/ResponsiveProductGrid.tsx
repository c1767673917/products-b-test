import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ResponsiveProductGridProps {
  children: React.ReactNode;
  gridClass: string;
  columns: number;
  cardWidth: number;
  className?: string;
}

const ResponsiveProductGrid: React.FC<ResponsiveProductGridProps> = ({
  children,
  gridClass,
  columns,
  cardWidth,
  className
}) => {
  return (
    <motion.div
      layout
      className={cn(
        'mb-8',
        gridClass,
        className
      )}
      style={{
        '--card-width': `${cardWidth}px`,
        willChange: 'grid-template-columns, gap'
      } as React.CSSProperties}
      transition={{
        layout: {
          duration: 0.3,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }}
    >
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResponsiveProductGrid;
