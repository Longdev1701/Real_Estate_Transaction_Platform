"use client";

import { useToastStore } from "@/stores/toast.store";
import { CheckCircle2, X, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-24 sm:bottom-4 left-1/2 sm:left-auto sm:right-4 -translate-x-1/2 sm:translate-x-0 z-[9999] flex flex-col gap-3 pointer-events-none w-[90vw] sm:w-auto max-w-[400px]">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--popover)] px-4 py-3 shadow-xl"
          >
            {toast.type === "success" && (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" />
            )}
            {toast.type === "error" && (
              <X className="h-5 w-5 shrink-0 text-[var(--danger)]" />
            )}
            {toast.type === "info" && (
              <Info className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            )}

            <p className="flex-1 text-sm font-medium text-[var(--foreground)] line-clamp-2">
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
