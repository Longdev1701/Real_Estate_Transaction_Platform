"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  FileWarning,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";

import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminReports,
  getAdminReportsStats,
  resolveAdminReport,
  reviewAdminReportAppeal,
  type AdminAppealDecision,
  type AdminReport,
  type AdminReportsData,
  type AdminReportsFilter,
  type AdminReportsStats,
  type AdminReportStatus,
} from "@/lib/admin";
import { formatPrice } from "@/lib/posts";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

const statusLabels: Record<AdminReportStatus, string> = {
  PENDING: "Chờ xử lý",
  RESOLVED: "Đã xử lý",
  REJECTED: "Từ chối",
};

const statusStyles: Record<AdminReportStatus, string> = {
  PENDING: "border-amber-400/30 bg-amber-500/12 text-amber-200",
  RESOLVED: "border-emerald-400/30 bg-emerald-500/12 text-emerald-200",
  REJECTED: "border-red-400/30 bg-red-500/12 text-red-200",
};

const numberFormatter = new Intl.NumberFormat("vi-VN");

const formatNumber = (value: number) => numberFormatter.format(value);

const formatDelta = (current: number, total: number) => {
  if (!total) return "0% tổng báo cáo";
  return `${((current / total) * 100).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}% tổng báo cáo`;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const makeReportCode = (id: string) => `RPT-${id.slice(-6).toUpperCase()}`;

const getLocation = (report: AdminReport) =>
  [report.post.district, report.post.city].filter(Boolean).join(", ") || report.post.address;

const hasPendingAppeal = (report: AdminReport) => report.appealStatus === "PENDING";

const getAppealState = (report: AdminReport) => {
  if (report.appealStatus === "NONE") {
    return null;
  }

  if (report.appealStatus === "PENDING") {
    return {
      label: "Có khiếu nại",
      detail: "Người đăng đã gửi khiếu nại và đang chờ admin xem xét.",
      className: "border-rose-400/30 bg-rose-500/12 text-rose-100",
    };
  }

  if (report.post.status === "ACTIVE") {
    return {
      label: "Đã chấp nhận khiếu nại",
      detail: "Admin đã mở lại bài đăng sau khi xem xét khiếu nại.",
      className: "border-emerald-400/30 bg-emerald-500/12 text-emerald-100",
    };
  }

  return {
    label: "Đã bác khiếu nại",
    detail: "Admin đã xem xét và giữ nguyên quyết định khóa bài.",
    className: "border-amber-400/30 bg-amber-500/12 text-amber-100",
  };
};

type ReportTab = "ALL" | AdminReportStatus;

export default function AdminReportsPage() {
  const [filter, setFilter] = useState<AdminReportsFilter>({
    page: 1,
    limit: 8,
    status: "",
  });
  const [data, setData] = useState<AdminReportsData | null>(null);
  const [stats, setStats] = useState<AdminReportsStats | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    const loadReports = async () => {
      try {
        setIsLoading(true);
        setError("");
        const [reportsResult, statsResult] = await Promise.all([
          getAdminReports(filter),
          getAdminReportsStats(),
        ]);

        if (ignore) return;
        setData(reportsResult);
        setStats(statsResult);
        setSelectedReportId((current) => current ?? reportsResult.items[0]?.id ?? null);
      } catch {
        if (!ignore) {
          setError("Không thể tải danh sách báo cáo.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      ignore = true;
    };
  }, [filter, refreshKey]);

  const filteredItems = useMemo(() => {
    const keyword = keywordInput.trim().toLowerCase();
    if (!keyword) return data?.items ?? [];

    return (data?.items ?? []).filter((report) =>
      [
        makeReportCode(report.id),
        report.post.title,
        report.reporter.fullName,
        report.reporter.email,
        report.reason,
        report.description ?? "",
        report.appealMessage ?? "",
        report.appealEvidence ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [data?.items, keywordInput]);

  const selectedReport =
    filteredItems.find((report) => report.id === selectedReportId) ??
    filteredItems[0] ??
    null;

  const tabs = [
    { key: "ALL" as const, label: "Tất cả", count: stats?.total ?? 0 },
    { key: "PENDING" as const, label: "Chờ xử lý", count: stats?.pending ?? 0 },
    { key: "RESOLVED" as const, label: "Đã xử lý", count: stats?.resolved ?? 0 },
    { key: "REJECTED" as const, label: "Từ chối", count: stats?.rejected ?? 0 },
  ];

  const pageButtons = useMemo(() => {
    const totalPages = data?.meta.totalPages ?? 1;
    const currentPage = data?.meta.page ?? filter.page;
    const pages = new Set<number>([
      1,
      totalPages,
      currentPage,
      Math.max(1, currentPage - 1),
      Math.min(totalPages, currentPage + 1),
    ]);
    return Array.from(pages).sort((a, b) => a - b);
  }, [data?.meta.page, data?.meta.totalPages, filter.page]);

  const startIndex = data?.meta.total ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const endIndex = data ? Math.min(data.meta.page * data.meta.limit, data.meta.total) : 0;

  const applyTab = (tab: ReportTab) => {
    setActiveTab(tab);
    setFilter((current) => ({
      ...current,
      page: 1,
      status: tab === "ALL" ? "" : tab,
    }));
  };

  const openDetail = (reportId: string) => {
    setSelectedReportId(reportId);
    setIsDetailOpen(true);
  };

  const handleResolve = async (reportId: string, status: "RESOLVED" | "REJECTED") => {
    try {
      setIsUpdating(true);
      setError("");
      const updatedReport = await resolveAdminReport(reportId, status);

      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updatedReport.id ? updatedReport : item,
              ),
            }
          : current,
      );
      setStats((current) =>
        current
          ? {
              total: current.total,
              pending: Math.max(0, current.pending - 1),
              resolved: current.resolved + (status === "RESOLVED" ? 1 : 0),
              rejected: current.rejected + (status === "REJECTED" ? 1 : 0),
            }
          : current,
      );
      setRefreshKey((current) => current + 1);
    } catch {
      setError("Không thể cập nhật trạng thái báo cáo.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReviewAppeal = async (
    reportId: string,
    decision: AdminAppealDecision,
  ) => {
    try {
      setIsUpdating(true);
      setError("");
      const updatedReport = await reviewAdminReportAppeal(reportId, decision);

      setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updatedReport.id ? updatedReport : item,
              ),
            }
          : current,
      );
    } catch {
      setError("Không thể xử lý khiếu nại của người đăng.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminShell
      title="Quản lý báo cáo"
      subtitle="Danh sách các bài báo cáo vi phạm từ người dùng và công cụ xử lý khiếu nại."
    >
      <div className="space-y-4">
        {error ? (
          <NeonCard className="border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
            {error}
          </NeonCard>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            compact
            icon={FileWarning}
            title="Tổng báo cáo"
            value={isLoading ? "..." : formatNumber(stats?.total ?? 0)}
            delta={isLoading ? "..." : formatDelta(stats?.total ?? 0, stats?.total ?? 0)}
            tone="blue"
          />
          <StatCard
            compact
            icon={Clock3}
            title="Chờ xử lý"
            value={isLoading ? "..." : formatNumber(stats?.pending ?? 0)}
            delta={isLoading ? "..." : formatDelta(stats?.pending ?? 0, stats?.total ?? 0)}
            tone="orange"
          />
          <StatCard
            compact
            icon={CheckCircle2}
            title="Đã xử lý"
            value={isLoading ? "..." : formatNumber(stats?.resolved ?? 0)}
            delta={isLoading ? "..." : formatDelta(stats?.resolved ?? 0, stats?.total ?? 0)}
            tone="green"
          />
          <StatCard
            compact
            icon={AlertTriangle}
            title="Từ chối"
            value={isLoading ? "..." : formatNumber(stats?.rejected ?? 0)}
            delta={isLoading ? "..." : formatDelta(stats?.rejected ?? 0, stats?.total ?? 0)}
            tone="red"
          />
        </section>

        <section className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "border-blue-400/60 bg-blue-600/20 text-white shadow-[0_0_22px_rgba(37,99,235,0.42)]"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-blue-400/30 hover:bg-blue-500/10"
              }`}
              onClick={() => applyTab(tab.key)}
            >
              {tab.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-blue-100">
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </section>

        <NeonCard className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.6fr)_220px_auto]">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-gray-400">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
                placeholder="Tìm theo mã báo cáo, bài đăng, người báo cáo, khiếu nại..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>

            <SelectBox
              value={filter.status}
              onChange={(value) => {
                const next = value as AdminReportsFilter["status"];
                setActiveTab(next || "ALL");
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  status: next,
                }));
              }}
              options={[
                { value: "", label: "Tất cả trạng thái" },
                { value: "PENDING", label: "Chờ xử lý" },
                { value: "RESOLVED", label: "Đã xử lý" },
                { value: "REJECTED", label: "Từ chối" },
              ]}
            />

            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/20 bg-white/5 px-3 text-sm font-medium text-gray-200 transition hover:bg-blue-500/10 disabled:opacity-60"
              disabled={isLoading}
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </NeonCard>

        <NeonCard className="overflow-hidden">
          <div className="hidden grid-cols-[128px_minmax(0,2fr)_minmax(0,1.15fr)_minmax(0,1.5fr)_148px_200px_132px] gap-4 border-b border-white/10 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 2xl:grid">
            <div>Mã báo cáo</div>
            <div>Bài đăng bị báo cáo</div>
            <div>Người báo cáo</div>
            <div>Lý do và khiếu nại</div>
            <div>Ngày gửi</div>
            <div>Trạng thái</div>
            <div className="text-right">Thao tác</div>
          </div>

          <div className="divide-y divide-white/5">
            {isLoading ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Đang tải báo cáo...
              </div>
            ) : null}

            {!isLoading && !filteredItems.length ? (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Không tìm thấy báo cáo phù hợp.
              </div>
            ) : null}

            {!isLoading
              ? filteredItems.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    selected={selectedReport?.id === report.id}
                    isUpdating={isUpdating}
                    onOpenDetail={() => openDetail(report.id)}
                    onResolve={handleResolve}
                  />
                ))
              : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-3 text-sm text-gray-300">
            <span>
              Hiển thị {startIndex} - {endIndex} của {formatNumber(data?.meta.total ?? 0)} báo cáo
            </span>
            <div className="flex items-center gap-2">
              {pageButtons.map((page) => (
                <button
                  key={page}
                  className={`min-w-10 rounded-lg border px-3 py-2 ${
                    page === data?.meta.page
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-white/10 bg-white/5"
                  }`}
                  disabled={isLoading}
                  onClick={() => setFilter((current) => ({ ...current, page }))}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </NeonCard>
      </div>

      <ReportDetailModal
        open={isDetailOpen}
        report={selectedReport}
        isUpdating={isUpdating}
        onClose={() => setIsDetailOpen(false)}
        onResolve={handleResolve}
        onReviewAppeal={handleReviewAppeal}
      />
    </AdminShell>
  );
}

function ReportRow({
  report,
  selected,
  isUpdating,
  onOpenDetail,
  onResolve,
}: {
  report: AdminReport;
  selected: boolean;
  isUpdating: boolean;
  onOpenDetail: () => void;
  onResolve: (reportId: string, status: "RESOLVED" | "REJECTED") => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpenDetail}
        className={`block w-full px-4 py-4 text-left transition 2xl:hidden ${
          selected ? "bg-blue-500/[0.06]" : "hover:bg-blue-500/[0.04]"
        }`}
      >
        <div className="flex gap-3">
          <img
            src={report.post.images[0]?.imageUrl ?? imageFallback}
            alt={report.post.title}
            className="h-20 w-28 shrink-0 rounded-xl border border-white/10 object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{makeReportCode(report.id)}</p>
              <StatusBadge status={report.status} />
              <AppealPill report={report} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-blue-50">{report.post.title}</p>
            <p className="mt-1 text-xs text-gray-400">
              {report.reporter.fullName} • {report.reporter.email}
            </p>
            <p className="mt-2 line-clamp-2 text-xs text-gray-300">{report.reason}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>{formatDateTime(report.createdAt)}</span>
              <span>•</span>
              <span>{getLocation(report)}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <MiniActionButton
                title="Xem chi tiết"
                className="border-blue-400/30 bg-blue-600/15 text-blue-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetail();
                }}
              >
                Xem chi tiết
              </MiniActionButton>
              {report.status === "PENDING" ? (
                <>
                  <MiniActionButton
                    title="Từ chối báo cáo"
                    className="border-white/10 bg-white/5 text-gray-200"
                    disabled={isUpdating}
                    onClick={(event) => {
                      event.stopPropagation();
                      onResolve(report.id, "REJECTED");
                    }}
                  >
                    Bỏ qua
                  </MiniActionButton>
                  <MiniActionButton
                    title="Xử lý báo cáo"
                    className="border-emerald-400/30 bg-emerald-500/12 text-emerald-100"
                    disabled={isUpdating}
                    onClick={(event) => {
                      event.stopPropagation();
                      onResolve(report.id, "RESOLVED");
                    }}
                  >
                    Đã xử lý
                  </MiniActionButton>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      <div
        className={`hidden grid-cols-[128px_minmax(0,2fr)_minmax(0,1.15fr)_minmax(0,1.5fr)_148px_200px_132px] items-center gap-4 px-5 py-3 text-sm transition 2xl:grid ${
          selected ? "bg-blue-500/[0.06]" : "hover:bg-blue-500/[0.04]"
        }`}
      >
        <button type="button" onClick={onOpenDetail} className="min-w-0 text-left">
          <p className="font-semibold text-white">{makeReportCode(report.id)}</p>
          <p className="mt-1 text-xs text-gray-500">ID: {report.id.slice(-8)}</p>
        </button>

        <button type="button" onClick={onOpenDetail} className="flex min-w-0 items-center gap-3 text-left">
          <img
            src={report.post.images[0]?.imageUrl ?? imageFallback}
            alt={report.post.title}
            className="h-16 w-24 shrink-0 rounded-xl border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <p className="line-clamp-2 font-semibold text-white">{report.post.title}</p>
            <p className="mt-1 line-clamp-1 text-xs text-gray-500">{getLocation(report)}</p>
          </div>
        </button>

        <button type="button" onClick={onOpenDetail} className="min-w-0 text-left">
          <p className="truncate font-medium text-white">{report.reporter.fullName}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{report.reporter.email}</p>
        </button>

        <button type="button" onClick={onOpenDetail} className="min-w-0 text-left">
          <p className="line-clamp-2 text-gray-200">{report.reason}</p>
          <p className="mt-1 line-clamp-1 text-xs text-gray-500">
            {report.description || "Không có mô tả thêm"}
          </p>
          <AppealPill report={report} className="mt-2" />
        </button>

        <button type="button" onClick={onOpenDetail} className="text-left text-gray-300">
          {formatDateTime(report.createdAt)}
        </button>

        <button type="button" onClick={onOpenDetail} className="space-y-2 text-left">
          <StatusBadge status={report.status} />
          <p className="text-xs text-gray-500">
            {hasPendingAppeal(report)
              ? "Đang chờ duyệt khiếu nại"
              : report.appealStatus === "REVIEWED"
                ? "Khiếu nại đã xem xét"
                : "Chưa có khiếu nại"}
          </p>
        </button>

        <div className="flex justify-end gap-1.5">
          <IconButton
            title="Xem chi tiết"
            className="border-blue-400/30 bg-blue-600/15 text-blue-100 hover:bg-blue-600/25"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetail();
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </IconButton>
          <IconLink href={`/posts/${report.post.id}`} title="Mở bài đăng">
            <ShieldAlert className="h-3.5 w-3.5" />
          </IconLink>
          <IconButton
            title="Từ chối"
            disabled={isUpdating || report.status !== "PENDING"}
            className="border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
            onClick={(event) => {
              event.stopPropagation();
              onResolve(report.id, "REJECTED");
            }}
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            title="Đã xử lý"
            disabled={isUpdating || report.status !== "PENDING"}
            className="border-emerald-400/30 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/20"
            onClick={(event) => {
              event.stopPropagation();
              onResolve(report.id, "RESOLVED");
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </>
  );
}

function ReportDetailModal({
  open,
  report,
  isUpdating,
  onClose,
  onResolve,
  onReviewAppeal,
}: {
  open: boolean;
  report: AdminReport | null;
  isUpdating: boolean;
  onClose: () => void;
  onResolve: (reportId: string, status: "RESOLVED" | "REJECTED") => void;
  onReviewAppeal: (reportId: string, decision: AdminAppealDecision) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-md">
      <button
        type="button"
        aria-label="Đóng chi tiết báo cáo"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-5xl">
        <NeonCard className="max-h-[88vh] overflow-hidden border-blue-300/30 shadow-[0_0_60px_rgba(37,99,235,0.18)]">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
            <div>
              <h2 className="text-xl font-bold text-white">Chi tiết báo cáo</h2>
              <p className="mt-1 text-sm text-gray-400">
                Kiểm tra nội dung báo cáo, bài đăng và xử lý khiếu nại trong cùng một cửa sổ.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {report ? <StatusBadge status={report.status} /> : null}
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-gray-200 transition hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!report ? (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              Không có dữ liệu báo cáo.
            </div>
          ) : (
            <div className="max-h-[calc(88vh-88px)] overflow-y-auto p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="mb-3 text-sm font-semibold text-blue-100">Bài đăng bị báo cáo</p>
                    <div className="flex gap-3">
                      <img
                        src={report.post.images[0]?.imageUrl ?? imageFallback}
                        alt={report.post.title}
                        className="h-32 w-40 shrink-0 rounded-2xl border border-white/10 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-lg font-semibold text-white">{report.post.title}</p>
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-300">
                          <UserRound className="h-4 w-4 text-blue-200" />
                          <span className="truncate">{report.post.author.fullName}</span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-blue-100">
                          {formatPrice(report.post.price)}
                        </div>
                        <div className="mt-2 flex items-start gap-2 text-sm text-gray-400">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-200" />
                          <span className="line-clamp-3">{getLocation(report)}</span>
                        </div>
                        <div className="mt-4">
                          <Link
                            href={`/posts/${report.post.id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-600/15 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-600/25"
                          >
                            <Eye className="h-4 w-4" />
                            Mở bài đăng
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Thông tin báo cáo
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailItem label="Mã báo cáo" value={makeReportCode(report.id)} />
                      <DetailItem label="Thời gian gửi" value={formatDateTime(report.createdAt)} />
                      <DetailItem
                        label="Người báo cáo"
                        value={report.reporter.fullName}
                        subValue={report.reporter.email}
                      />
                      <DetailItem
                        label="Thời gian xử lý"
                        value={report.resolvedAt ? formatDateTime(report.resolvedAt) : "Đang chờ xử lý"}
                      />
                    </div>
                    <DetailItem label="Lý do báo cáo" value={report.reason} wrap />
                    <DetailItem
                      label="Mô tả"
                      value={report.description || "Người dùng không cung cấp mô tả thêm."}
                      wrap
                    />
                  </section>
                </div>

                <div className="space-y-5">
                  {report.appealStatus !== "NONE" ? (
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                        Khiếu nại từ người đăng
                      </h3>
                      <AppealReviewCard
                        report={report}
                        isUpdating={isUpdating}
                        onReviewAppeal={onReviewAppeal}
                      />
                    </section>
                  ) : null}

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Lịch sử xử lý
                    </h3>
                    <TimelineItem
                      title="Báo cáo được gửi"
                      time={formatDateTime(report.createdAt)}
                      tone="amber"
                    />
                    <TimelineItem
                      title="Đã tiếp nhận báo cáo"
                      time={formatDateTime(report.createdAt)}
                      tone="blue"
                    />
                    <TimelineItem
                      title={statusLabels[report.status]}
                      time={report.resolvedAt ? formatDateTime(report.resolvedAt) : "Đang chờ admin xử lý"}
                      tone={
                        report.status === "REJECTED"
                          ? "red"
                          : report.status === "RESOLVED"
                            ? "green"
                            : "slate"
                      }
                    />
                    {hasPendingAppeal(report) ? (
                      <TimelineItem
                        title="Người đăng đã gửi khiếu nại"
                        time={report.appealedAt ? formatDateTime(report.appealedAt) : "--"}
                        tone="rose"
                      />
                    ) : null}
                    {report.appealStatus === "REVIEWED" ? (
                      <TimelineItem
                        title={report.post.status === "ACTIVE" ? "Khiếu nại được chấp nhận" : "Khiếu nại bị bác bỏ"}
                        time={report.appealedAt ? formatDateTime(report.appealedAt) : "--"}
                        tone={report.post.status === "ACTIVE" ? "green" : "amber"}
                      />
                    ) : null}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Hành động nhanh
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        disabled={isUpdating || report.status !== "PENDING"}
                        onClick={() => onResolve(report.id, "REJECTED")}
                        className="h-11 rounded-xl border border-white/10 bg-white/5 font-semibold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Bỏ qua
                      </button>
                      <button
                        disabled={isUpdating || report.status !== "PENDING"}
                        onClick={() => onResolve(report.id, "RESOLVED")}
                        className="h-11 rounded-xl border border-emerald-400/30 bg-emerald-500/12 font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Đánh dấu đã xử lý
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </NeonCard>
      </div>
    </div>
  );
}

function SelectBox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-10 min-w-0 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-white outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-slate-950 text-white">
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusBadge({ status }: { status: AdminReportStatus }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${statusStyles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      {statusLabels[status]}
    </span>
  );
}

function AppealPill({
  report,
  className = "",
}: {
  report: AdminReport;
  className?: string;
}) {
  const appeal = getAppealState(report);

  if (!appeal) {
    return null;
  }

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${appeal.className} ${className}`}
      title={appeal.detail}
    >
      {appeal.label}
    </span>
  );
}

function AppealReviewCard({
  report,
  isUpdating,
  onReviewAppeal,
}: {
  report: AdminReport;
  isUpdating: boolean;
  onReviewAppeal: (reportId: string, decision: AdminAppealDecision) => void;
}) {
  const appeal = getAppealState(report);

  if (!appeal) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-rose-400/20 bg-[linear-gradient(140deg,rgba(157,23,77,0.17),rgba(15,23,42,0.96))]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${appeal.className}`}>
            {appeal.label}
          </span>
          <span className="text-xs text-gray-400">
            {report.appealedAt ? formatDateTime(report.appealedAt) : "Chưa rõ thời gian gửi"}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-gray-200">{appeal.detail}</p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {report.appealMessage ? (
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs uppercase tracking-wide text-rose-200/80">Nội dung khiếu nại</p>
            <p className="mt-2 text-sm leading-6 text-white">{report.appealMessage}</p>
          </div>
        ) : null}

        {report.appealEvidence ? (
          <div className="rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="text-xs uppercase tracking-wide text-blue-200/80">Bằng chứng bổ sung</p>
            <p className="mt-2 text-sm leading-6 text-gray-200">{report.appealEvidence}</p>
          </div>
        ) : null}

        {hasPendingAppeal(report) ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              disabled={isUpdating}
              onClick={() => onReviewAppeal(report.id, "REJECT")}
              className="h-11 rounded-xl border border-amber-400/30 bg-amber-500/12 font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Giữ nguyên khóa bài
            </button>
            <button
              disabled={isUpdating}
              onClick={() => onReviewAppeal(report.id, "APPROVE")}
              className="h-11 rounded-xl border border-emerald-400/30 bg-emerald-500/12 font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Chấp nhận khiếu nại
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-gray-300">
            {report.post.status === "ACTIVE"
              ? "Khiếu nại đã được chấp nhận và bài đăng hiện đã hoạt động lại."
              : "Khiếu nại đã được xem xét, quyết định khóa bài vẫn được giữ nguyên."}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  subValue,
  wrap = false,
}: {
  label: string;
  value: string;
  subValue?: string;
  wrap?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm text-white ${wrap ? "" : "truncate"}`}>{value}</p>
      {subValue ? <p className="mt-1 text-xs text-gray-500">{subValue}</p> : null}
    </div>
  );
}

function TimelineItem({
  title,
  time,
  tone,
}: {
  title: string;
  time: string;
  tone: "amber" | "blue" | "green" | "red" | "rose" | "slate";
}) {
  const colors = {
    amber: "bg-amber-400",
    blue: "bg-blue-400",
    green: "bg-emerald-400",
    red: "bg-red-400",
    rose: "bg-rose-400",
    slate: "bg-slate-500",
  };

  return (
    <div className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colors[tone]}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs text-gray-400">{time}</p>
      </div>
    </div>
  );
}

function IconLink({
  href,
  title,
  children,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-gray-200 transition hover:border-blue-300/30 hover:bg-blue-500/15 hover:text-blue-100"
    >
      {children}
    </Link>
  );
}

function IconButton({
  title,
  children,
  className,
  disabled,
  onClick,
}: {
  title: string;
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}

function MiniActionButton({
  title,
  className,
  disabled,
  onClick,
  children,
}: {
  title: string;
  className: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}
