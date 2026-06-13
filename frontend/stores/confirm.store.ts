import { create } from "zustand";

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolveConfirm: ((value: boolean) => void) | null;
  confirm: (options: { title?: string; message: string; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
  onSelect: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  title: "Xác nhận",
  message: "",
  confirmLabel: "Xác nhận",
  cancelLabel: "Hủy",
  resolveConfirm: null,
  confirm: (options) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        title: options.title || "Xác nhận",
        message: options.message,
        confirmLabel: options.confirmLabel || "Xác nhận",
        cancelLabel: options.cancelLabel || "Hủy",
        resolveConfirm: resolve,
      });
    });
  },
  onSelect: (value) => {
    const resolve = get().resolveConfirm;
    if (resolve) resolve(value);
    set({
      isOpen: false,
      resolveConfirm: null,
    });
  },
}));

export const confirm = (options: { title?: string; message: string; confirmLabel?: string; cancelLabel?: string }) => 
  useConfirmStore.getState().confirm(options);
