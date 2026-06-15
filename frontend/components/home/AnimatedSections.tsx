"use client";

import { motion, Variants } from "framer-motion";
import { ReactNode } from "react";

const heroContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export function AnimatedHeroContent({ children }: { children: ReactNode[] }) {
  return (
    <motion.div
      variants={heroContainerVariants}
      initial="hidden"
      animate="show"
      className="max-w-2xl"
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={heroItemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export function AnimatedHeroSearch({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, type: "spring", stiffness: 300, damping: 24 }}
      className="mt-4 mb-12 lg:mb-4 lg:mt-auto"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedSection({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
}
