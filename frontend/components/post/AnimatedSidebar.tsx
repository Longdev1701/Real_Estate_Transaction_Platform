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
    <>
      <style>{`
        @keyframes gpu-heartbeat {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
          50% { transform: scale(1.03); box-shadow: 0 0 20px rgba(59, 130, 246, 0.55); }
        }
        @keyframes gpu-shimmer {
          0% { transform: translateX(-200%) skewX(-25deg); }
          100% { transform: translateX(300%) skewX(-25deg); }
        }
        .gpu-pulse-btn {
          animation: gpu-heartbeat 3s infinite ease-in-out;
          will-change: transform, box-shadow;
        }
        .gpu-shimmer-effect {
          animation: gpu-shimmer 3s infinite ease-in-out;
          will-change: transform;
        }
      `}</style>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`relative overflow-hidden group border border-[var(--accent-border)] bg-gradient-to-r from-[var(--accent)] to-[#4facfe] text-white gpu-pulse-btn cursor-pointer ${className.replace("theme-button-primary", "")}`}
      >
        {/* Hiệu ứng tia sáng lướt qua (Shimmer) bằng GPU keyframes */}
        <div
          className="absolute inset-0 z-0 w-[50%] bg-gradient-to-r from-transparent via-white/30 to-transparent gpu-shimmer-effect"
        />
        
        {/* Vòng sáng viền (Glow Overlay) */}
        <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]" />

        {/* Nội dung */}
        <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-md">
          {children}
        </span>
      </button>
    </>
  );
}
