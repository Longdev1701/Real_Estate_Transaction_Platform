"use client";

import { useToastStore } from "@/stores/toast.store";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="h-5 w-5 text-sky-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-emerald-950/20";
      case "error":
        return "border-rose-500/30 bg-rose-950/20";
      case "warning":
        return "border-amber-500/30 bg-amber-950/20";
      default:
        return "border-sky-500/30 bg-sky-950/20";
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 10, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 w-full rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all ${getBorderColor(
              toast.type
            )}`}
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-sm font-medium text-slate-100 leading-5">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
