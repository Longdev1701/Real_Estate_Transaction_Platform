"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { AlertTriangle, FileText, LoaderCircle, X } from "lucide-react";

import { submitReportAppeal } from "@/lib/reports";
import type { PostBanContext } from "@/lib/posts";
import { useToastStore } from "@/stores/toast.store";

export function AppealBanDialog({
  open,
  postTitle,
  banContext,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  postTitle: string;
  banContext: PostBanContext;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [evidence, setEvidence] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setEvidence("");
    setIsSubmitting(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const cleanMessage = message.trim();
    const cleanEvidence = evidence.trim();

    if (cleanMessage.length < 20) {
      addToast("Nội dung khiếu nại phải dài ít nhất 20 ký tự.", "error");
      return;
    }

    if (cleanEvidence.length < 10) {
      addToast("Bằng chứng bổ sung phải dài ít nhất 10 ký tự.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      await submitReportAppeal({
        reportId: banContext.reportId,
        message: cleanMessage,
        evidence: cleanEvidence,
      });
      addToast("Khiếu nại đã được gửi tới quản trị viên.", "success");
      onSubmitted?.();
      onClose();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      addToast(axiosError.response?.data?.message ?? "Không thể gửi khiếu nại. Vui lòng thử lại.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="theme-modal-surface w-full max-w-[92vw] md:max-w-5xl overflow-hidden rounded-3xl border border-[var(--danger-border)] flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 md:px-6 shrink-0">
          <div className="min-w-0">
            <p className="theme-badge-danger inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              <AlertTriangle className="h-3.5 w-3.5" />
              Khiếu nại bài bị khóa
            </p>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-[var(--foreground)]">{postTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-icon-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
 
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden max-h-[calc(92vh-80px)]">
          <div className="flex-1 overflow-y-auto space-y-5 px-5 py-6 md:px-6 scrollbar-thin">
            <div className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4 text-sm leading-6 text-[var(--danger-foreground)]">
              <p className="font-semibold text-[var(--foreground)]">Lý do bài đăng bị khóa</p>
              <p className="mt-2">{banContext.reason}</p>
              <p className="mt-2 text-[var(--secondary-foreground)]">
                {banContext.description || "Quản trị viên xác định bài đăng có dấu hiệu vi phạm chính sách hiển thị nội dung."}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--info-border)] bg-[var(--info-soft)] p-4 text-sm leading-6 text-[var(--info-foreground)]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--foreground)]">
                <FileText className="h-4 w-4 text-[var(--accent)]" />
                Hướng dẫn khiếu nại
              </div>
              <p>
                Nếu bạn cho rằng việc khóa bài là chưa chính xác, hãy trình bày rõ bối cảnh,
                nguồn thông tin, giấy tờ liên quan và mọi bằng chứng giúp admin đối chiếu lại.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Nội dung khiếu nại (tối thiểu 20 ký tự)</label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Trình bày vì sao bạn cho rằng quyết định khóa bài là chưa chính xác."
                  className="theme-public-input w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6"
                  required
                  minLength={20}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Bằng chứng bổ sung (tối thiểu 10 ký tự)</label>
                <textarea
                  rows={4}
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="Đính kèm mô tả giấy tờ, đường link, ảnh chụp hoặc các thông tin chứng minh khác."
                  className="theme-public-input w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6"
                  required
                  minLength={10}
                />
              </div>
            </div>
          </div>

          {/* Sticky/Fixed Footer - Always visible at the bottom of the modal */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end border-t border-[var(--border)] px-5 py-4 md:px-6 shrink-0 bg-[var(--surface-muted)] bg-opacity-40">
            <button
              type="button"
              onClick={onClose}
              className="theme-button-secondary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="theme-button-danger-solid inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
            >
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
              {isSubmitting ? "Đang gửi..." : "Gửi khiếu nại"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
