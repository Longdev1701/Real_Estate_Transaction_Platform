"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { AxiosError } from "axios";

import { createPostReport } from "@/lib/reports";

const reportReasons = [
  "Thông tin sai sự thật",
  "Spam / quảng cáo",
  "Giá cả không hợp lý",
  "Nội dung không phù hợp",
  "Hình ảnh gây hiểu lầm",
  "Khác",
] as const;

export function ReportPostDialog({
  open,
  postId,
  postTitle,
  onClose,
}: {
  open: boolean;
  postId: string;
  postTitle: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<(typeof reportReasons)[number]>(reportReasons[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setReason(reportReasons[0]);
    setDescription("");
    setError(null);
    setIsSubmitting(false);
    setIsSuccess(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      await createPostReport({
        postId,
        reason,
        description,
      });
      setIsSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể gửi báo cáo. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-blue-400/20 bg-[#081224] shadow-[0_24px_80px_rgba(2,8,23,0.7)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-red-200">
              <TriangleAlert className="h-3.5 w-3.5" />
              Báo cáo bài đăng
            </p>
            <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-white">{postTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Đóng báo cáo"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="space-y-5 px-5 py-6 md:px-6">
            <div className="flex items-start gap-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-white">Đã gửi báo cáo thành công</p>
                <p className="mt-1 text-sm leading-6 text-emerald-100/85">
                  Quản trị viên sẽ xem xét nội dung bạn vừa gửi trong hàng đợi kiểm duyệt.
                </p>
              </div>
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
            <div>
              <label htmlFor="report-reason" className="mb-2 block text-sm font-medium text-gray-200">
                Lý do báo cáo
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value as (typeof reportReasons)[number])}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/40"
              >
                {reportReasons.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-description" className="mb-2 block text-sm font-medium text-gray-200">
                Mô tả thêm
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Mô tả ngắn gọn lý do bạn cho rằng bài đăng này cần được kiểm tra."
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-400/40"
              />
              <p className="mt-2 text-xs text-gray-500">{description.trim().length}/2000 ký tự</p>
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
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TriangleAlert className="h-4 w-4" />}
                {isSubmitting ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
