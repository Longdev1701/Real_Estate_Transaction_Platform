"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function AnimatedSidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.aside>
  );
}

export function PulseButton({ children, onClick, disabled, className = "" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Loại bỏ theme-button-primary mặc định và thay bằng bg gradient xịn sò
      className={`relative overflow-hidden group border border-[var(--accent-border)] bg-gradient-to-r from-[var(--accent)] to-[#4facfe] text-white shadow-lg ${className.replace("theme-button-primary", "")}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        boxShadow: [
          "0px 4px 10px rgba(59, 130, 246, 0.3)",
          "0px 0px 25px rgba(59, 130, 246, 0.7)",
          "0px 4px 10px rgba(59, 130, 246, 0.3)",
        ],
        scale: [1, 1, 1.05, 0.98, 1.02, 1, 1], // Hiệu ứng nhịp đập tim (Heartbeat)
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Hiệu ứng tia sáng lướt qua (Shimmer) */}
      <motion.div
        className="absolute inset-0 z-0 w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg]"
        initial={{ x: "-200%" }}
        animate={{ x: "300%" }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.5,
        }}
      />
      
      {/* Vòng sáng viền (Glow Overlay) */}
      <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />

      {/* Nội dung với hiệu ứng lắc nhẹ icon */}
      <motion.span 
        className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md"
        animate={{ y: [0, -3, 0, 0, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
