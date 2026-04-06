import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';

export const PremiumLoading = () => (
  <motion.div 
    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{ background: 'var(--bg, #0A0A0F)' }}
  >
    {/* Ambient glows */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(var(--primary-rgb), 0.08) 0%, transparent 70%)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)' }}
        animate={{ scale: [1.3, 1, 1.3], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>

    {/* Main loader */}
    <div className="relative flex items-center justify-center">
      {/* Outer ring */}
      <motion.div
        className="absolute w-24 h-24 rounded-full border-2 border-primary/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Middle ring */}
      <motion.div
        className="absolute w-20 h-20 rounded-full border-[2px] border-transparent border-t-primary/40 border-r-primary/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner spinner */}
      <motion.div
        className="w-14 h-14 rounded-full border-[3px] border-transparent border-t-primary"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />

      {/* Center icon */}
      <motion.div
        className="absolute"
        animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Zap size={20} className="text-primary" />
      </motion.div>

      {/* Pulse ring */}
      <motion.div
        className="absolute w-28 h-28 rounded-full border border-primary/20"
        animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
      />
    </div>

    {/* Text */}
    <motion.div
      className="mt-8 flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary/60">
        Carregando
      </span>
      <motion.div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
          />
        ))}
      </motion.div>
    </motion.div>
  </motion.div>
);
