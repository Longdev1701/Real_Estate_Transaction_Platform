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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-red-400/20 bg-[#081224] shadow-[0_24px_80px_rgba(2,8,23,0.7)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Khiếu nại bài bị khóa
            </p>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-white">{postTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="space-y-5 px-5 py-6 md:px-6">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
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
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 md:px-6">
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
              <p className="font-semibold text-white">Lý do bài đăng bị khóa</p>
              <p className="mt-2">{banContext.reason}</p>
              <p className="mt-2 text-red-100/80">
                {banContext.description || "Quản trị viên xác định bài đăng có dấu hiệu vi phạm chính sách hiển thị nội dung."}
              </p>
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
              <div className="mb-2 flex items-center gap-2 font-semibold text-white">
                <FileText className="h-4 w-4 text-blue-300" />
                Hướng dẫn khiếu nại
              </div>
              <p>
                Nếu bạn cho rằng việc khóa bài là chưa chính xác, hãy trình bày rõ bối cảnh,
                nguồn thông tin, giấy tờ liên quan và mọi bằng chứng giúp admin đối chiếu lại.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Nội dung khiếu nại</label>
              <textarea
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Trình bày vì sao bạn cho rằng quyết định khóa bài là chưa chính xác."
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-200">Bằng chứng bổ sung</label>
              <textarea
                rows={5}
                value={evidence}
                onChange={(event) => setEvidence(event.target.value)}
                placeholder="Đính kèm mô tả giấy tờ, đường link, ảnh chụp hoặc các thông tin chứng minh khác."
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
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
