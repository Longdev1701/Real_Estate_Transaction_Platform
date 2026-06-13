"use client";

import { useConfirmStore } from "@/stores/confirm.store";
import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function ConfirmContainer() {
  const { isOpen, title, message, confirmLabel, cancelLabel, onSelect } = useConfirmStore();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onSelect(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--popover)] p-6 shadow-2xl md:max-w-[420px]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
                <AlertTriangle className="h-7 w-7 text-[var(--danger-foreground)]" />
              </div>

              <h3 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h3>
              
              <p className="mt-3 text-[14px] leading-6 text-[var(--muted-foreground)]">
                {message}
              </p>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => onSelect(false)}
                className="flex-1 rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] active:scale-95"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => onSelect(true)}
                className="flex-1 rounded-[16px] bg-[var(--danger)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--danger-hover)] active:scale-95 shadow-[var(--shadow-glow)]"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
