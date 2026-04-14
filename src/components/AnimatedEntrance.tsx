import React from 'react';
import { motion } from 'motion/react';

interface AnimatedEntranceProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';
  duration?: number;
  className?: string;
  once?: boolean;
}

export const AnimatedEntrance: React.FC<AnimatedEntranceProps> = ({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.6,
  className = '',
  once = true,
}) => {
  const getInitial = () => {
    switch (direction) {
      case 'up': return { opacity: 0, y: 40 };
      case 'down': return { opacity: 0, y: -40 };
      case 'left': return { opacity: 0, x: 40 };
      case 'right': return { opacity: 0, x: -40 };
      case 'scale': return { opacity: 0, scale: 0.85 };
      case 'none': return { opacity: 0 };
    }
  };

  const getAnimate = () => {
    switch (direction) {
      case 'up':
      case 'down': return { opacity: 1, y: 0 };
      case 'left':
      case 'right': return { opacity: 1, x: 0 };
      case 'scale': return { opacity: 1, scale: 1 };
      case 'none': return { opacity: 1 };
    }
  };

  return (
    <motion.div
      initial={getInitial()}
      whileInView={getAnimate()}
      viewport={{ once, margin: '-50px' }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.08,
  className = '',
}) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-30px' }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const FloatingElement: React.FC<{
  children: React.ReactNode;
  amplitude?: number;
  duration?: number;
  className?: string;
}> = ({ children, amplitude = 10, duration = 6, className = '' }) => (
  <motion.div
    animate={{
      y: [-amplitude, amplitude, -amplitude],
    }}
    transition={{
      duration,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

export const GlowPulse: React.FC<{
  children: React.ReactNode;
  className?: string;
  color?: string;
}> = ({ children, className = '', color = 'var(--primary)' }) => (
  <motion.div
    animate={{
      boxShadow: [
        `0 0 20px ${color}33, 0 0 40px ${color}11`,
        `0 0 30px ${color}55, 0 0 60px ${color}22`,
        `0 0 20px ${color}33, 0 0 40px ${color}11`,
      ],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);
