"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { AlertTriangle, FileText, LoaderCircle, ShieldCheck, X } from "lucide-react";

import { submitReportAppeal } from "@/lib/reports";
import type { PostBanContext } from "@/lib/posts";

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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setEvidence("");
    setError(null);
    setIsSubmitting(false);
    setIsSuccess(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      await submitReportAppeal({
        reportId: banContext.reportId,
        message,
        evidence,
      });
      setIsSuccess(true);
      onSubmitted?.();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể gửi khiếu nại. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="theme-modal-surface w-full max-w-2xl overflow-hidden rounded-3xl border border-[var(--danger-border)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 md:px-6">
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

        {isSuccess ? (
          <div className="space-y-5 px-5 py-6 md:px-6">
            <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-soft)] p-4 text-sm leading-6 text-[var(--success-foreground)]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[var(--foreground)]">
                <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
                Khiếu nại đã được gửi
              </div>
              <p>
                Yêu cầu khiếu nại của bạn đã được chuyển tới quản trị viên trong mục báo cáo.
                Vui lòng chờ phản hồi sau khi admin kiểm tra bằng chứng bạn cung cấp.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="btn-primary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 md:px-6">
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

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Nội dung khiếu nại</label>
              <textarea
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Trình bày vì sao bạn cho rằng quyết định khóa bài là chưa chính xác."
                className="theme-public-input w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Bằng chứng bổ sung</label>
              <textarea
                rows={5}
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Đính kèm mô tả giấy tờ, đường link, ảnh chụp hoặc các thông tin chứng minh khác."
                className="theme-public-input w-full resize-none rounded-2xl px-4 py-3 text-sm leading-6"
              />
            </div>

            {error ? (
              <div className="theme-badge-danger rounded-2xl px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="theme-button-secondary inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="theme-button-danger-solid inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                {isSubmitting ? "Đang gửi..." : "Gửi khiếu nại"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
