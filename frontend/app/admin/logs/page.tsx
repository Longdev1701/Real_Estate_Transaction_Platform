"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Eye,
  FileJson,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle2,
  X,
} from "lucide-react";

import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminSystemLogs,
  type AdminLogSeverity,
  type AdminLogStatus,
  type AdminSystemLog,
  type AdminSystemLogModule,
  type AdminSystemLogsData,
  type AdminSystemLogsFilter,
} from "@/lib/admin";

type LogCategory = "ALL" | "AUTH" | "USER" | "POST" | "ADMIN" | "ERROR";

type ViewLog = {
  id: string;
  eventId: string;
  time: string;
  actor: {
    name: string;
    role: string;
    avatarUrl?: string | null;
  };
  actionCode: string;
  action: string;
  description: string;
  category: Exclude<LogCategory, "ALL">;
  module: AdminSystemLogModule;
  ipAddress: string;
  userAgent: string;
  severity: AdminLogSeverity;
  status: AdminLogStatus;
  metadata: Record<string, string | number | boolean | null>;
};

const severityTone: Record<AdminLogSeverity, string> = {
  INFO: "border-blue-400/25 bg-blue-500/12 text-blue-200",
  WARNING: "border-amber-400/25 bg-amber-500/12 text-amber-200",
  SECURITY: "border-violet-400/25 bg-violet-500/12 text-violet-200",
  ERROR: "border-red-400/25 bg-red-500/12 text-red-200",
};

const statusTone: Record<AdminLogStatus, string> = {
  SUCCESS: "border-emerald-400/25 bg-emerald-500/12 text-emerald-200",
  FAILED: "border-red-400/25 bg-red-500/12 text-red-200",
  BLOCKED: "border-amber-400/25 bg-amber-500/12 text-amber-200",
};

const categoryTabs: { key: LogCategory; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "AUTH", label: "Auth" },
  { key: "USER", label: "User" },
  { key: "POST", label: "Post" },
  { key: "ADMIN", label: "Admin" },
  { key: "ERROR", label: "Error" },
];

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const toInputDate = (value: string) => value.slice(0, 10);

const getTodayInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "A";

const readMetadataValue = (metadata: AdminSystemLog["metadata"], key: string) => {
  if (!metadata || typeof metadata !== "object" || !(key in metadata)) {
    return null;
  }

  const value = metadata[key as keyof typeof metadata];
  return value == null ? null : String(value);
};

const prettifyAction = (action: string) => {
  const actionMap: Record<string, string> = {
    LOGIN: "Login",
    LOGIN_FAILED: "Login Failed",
    LOGOUT: "Logout",
    REFRESH_TOKEN: "Refresh Token",
    REFRESH_TOKEN_FAILED: "Refresh Token Failed",
    REGISTER: "Register",
    CREATE_REPORT: "Create Report",
    REPORT_RESOLVED: "Report Resolved",
    REPORT_REJECTED: "Report Rejected",
    UPDATE_USER_ROLE: "Update User Role",
    BAN_USER: "Ban User",
    ACTIVATE_USER: "Activate User",
    CREATE_POST: "Create Post",
    HIDE_POST: "Hide Post",
    ADD_POST_IMAGES: "Add Post Images",
    DELETE_POST_IMAGE: "Delete Post Image",
    UPDATE_POST_STATUS_ACTIVE: "Update Post Status Active",
    UPDATE_POST_STATUS_HIDDEN: "Update Post Status Hidden",
    UPDATE_POST_STATUS_BANNED: "Update Post Status Banned",
  };

  return actionMap[action] ?? action.replaceAll("_", " ");
};

const prettifyDescription = (log: AdminSystemLog) => {
  const email = readMetadataValue(log.metadata, "email");
  const role = readMetadataValue(log.metadata, "role");
  const status = readMetadataValue(log.metadata, "status");
  const postId = readMetadataValue(log.metadata, "postId") ?? log.targetId;
  const reportId = readMetadataValue(log.metadata, "reportId") ?? log.targetId;
  const imageId = readMetadataValue(log.metadata, "imageId");

  const descriptionMap: Record<string, string> = {
    LOGIN: `Người dùng${email ? ` ${email}` : ""} đã đăng nhập thành công vào hệ thống.`,
    LOGIN_FAILED: `Có một lần đăng nhập thất bại${email ? ` với tài khoản ${email}` : ""}.`,
    LOGOUT: "Người dùng đã đăng xuất khỏi hệ thống.",
    REFRESH_TOKEN: "Phiên đăng nhập đã được làm mới thành công.",
    REFRESH_TOKEN_FAILED: "Yêu cầu làm mới phiên đăng nhập đã thất bại.",
    REGISTER: `Tài khoản mới${email ? ` ${email}` : ""} đã được đăng ký thành công.`,
    CREATE_REPORT: `Tạo báo cáo vi phạm${postId ? ` cho bài đăng #${postId}` : ""}.`,
    REPORT_RESOLVED: `Báo cáo${reportId ? ` #${reportId}` : ""} đã được xử lý thành công.`,
    REPORT_REJECTED: `Báo cáo${reportId ? ` #${reportId}` : ""} đã bị từ chối xử lý.`,
    UPDATE_USER_ROLE: `Cập nhật vai trò người dùng${role ? ` thành ${role}` : ""}.`,
    BAN_USER: "Tài khoản người dùng đã bị khóa.",
    ACTIVATE_USER: "Tài khoản người dùng đã được mở khóa.",
    CREATE_POST: `Tạo bài đăng mới${postId ? ` #${postId}` : ""}.`,
    HIDE_POST: `Ẩn bài đăng${postId ? ` #${postId}` : ""} khỏi hệ thống.`,
    ADD_POST_IMAGES: `Thêm ảnh cho bài đăng${postId ? ` #${postId}` : ""}.`,
    DELETE_POST_IMAGE: `Xóa ảnh${imageId ? ` #${imageId}` : ""}${postId ? ` khỏi bài đăng #${postId}` : ""}.`,
    UPDATE_POST_STATUS_ACTIVE: `Chuyển bài đăng${postId ? ` #${postId}` : ""} sang trạng thái hiển thị.`,
    UPDATE_POST_STATUS_HIDDEN: `Chuyển bài đăng${postId ? ` #${postId}` : ""} sang trạng thái ẩn.`,
    UPDATE_POST_STATUS_BANNED: `Đánh dấu bài đăng${postId ? ` #${postId}` : ""} là vi phạm.`,
  };

  if (descriptionMap[log.action]) {
    return descriptionMap[log.action];
  }

  if (log.description?.trim()) {
    return log.description;
  }

  return `${prettifyAction(log.action)}${status ? ` • ${status}` : ""}.`;
};

const deriveCategory = (module: AdminSystemLogModule): Exclude<LogCategory, "ALL"> => {
  if (module === "AUTH") return "AUTH";
  if (module === "USER") return "USER";
  if (module === "POST") return "POST";
  if (module === "ADMIN" || module === "REPORT") return "ADMIN";
  return "ERROR";
};

const buildViewLog = (log: AdminSystemLog): ViewLog => ({
  id: log.id,
  eventId: `EVT-${toInputDate(log.createdAt).replaceAll("-", "")}-${log.id.slice(-8).toUpperCase()}`,
  time: log.createdAt,
  actor: {
    name: log.actor?.fullName || "System",
    role:
      log.actor?.role === "ADMIN"
        ? "Administrator"
        : log.actor?.role === "USER"
          ? "User"
          : "Service",
    avatarUrl: log.actor?.avatarUrl,
  },
  actionCode: log.action,
  action: prettifyAction(log.action),
  description: prettifyDescription(log),
  category: deriveCategory(log.module),
  module: log.module,
  ipAddress: log.ipAddress || "Không có dữ liệu",
  userAgent: log.userAgent || "Không có dữ liệu",
  severity: log.severity,
  status: log.status,
  metadata: {
    target_id: log.targetId ?? null,
    target_type: log.targetType ?? null,
    actor_id: log.actorId ?? null,
    description: log.description ?? null,
    performed_at: log.createdAt,
    ...(log.metadata ?? {}),
  },
});

export default function AdminLogsPage() {
  const todayInput = getTodayInput();
  const [filter, setFilter] = useState<AdminSystemLogsFilter>({
    page: 1,
    limit: 10,
    keyword: "",
    module: "",
    severity: "",
    dateFrom: todayInput,
    dateTo: todayInput,
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [category, setCategory] = useState<LogCategory>("ALL");
  const [data, setData] = useState<AdminSystemLogsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState<ViewLog | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilter((current) => ({
        ...current,
        page: 1,
        keyword: keywordInput,
      }));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [keywordInput]);

  useEffect(() => {
    let ignore = false;

    const loadLogs = async () => {
      try {
        setIsLoading(true);
        setError("");
        const result = await getAdminSystemLogs(filter);
        if (!ignore) {
          setData(result);
        }
      } catch {
        if (!ignore) {
          setError("Không thể tải nhật ký hệ thống.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      ignore = true;
    };
  }, [filter, refreshKey]);

  const mappedLogs = useMemo(() => (data?.items ?? []).map(buildViewLog), [data]);

  const filteredLogs = useMemo(
    () =>
      mappedLogs.filter((log) => {
        if (category !== "ALL" && log.category !== category) {
          return false;
        }

        return true;
      }),
    [category, mappedLogs],
  );

  const stats = useMemo(
    () => ({
      total: data?.meta.total ?? 0,
      security: mappedLogs.filter(
        (log) => log.severity === "SECURITY" || log.status === "BLOCKED",
      ).length,
      errors: mappedLogs.filter((log) => log.severity === "ERROR").length,
      admin: mappedLogs.filter((log) => log.category === "ADMIN").length,
    }),
    [data?.meta.total, mappedLogs],
  );

  const categoryCounts = useMemo(
    () =>
      categoryTabs.reduce<Record<LogCategory, number>>((acc, item) => {
        acc[item.key] =
          item.key === "ALL"
            ? mappedLogs.length
            : mappedLogs.filter((log) => log.category === item.key).length;
        return acc;
      }, {} as Record<LogCategory, number>),
    [mappedLogs],
  );

  const modules = useMemo(
    () => Array.from(new Set((data?.items ?? []).map((log) => log.module).filter(Boolean))),
    [data?.items],
  );

  const totalPages = data?.meta.totalPages ?? 1;
  const startIndex = data?.meta.total ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const endIndex = data ? Math.min(data.meta.page * data.meta.limit, data.meta.total) : 0;

  const resetFilters = () => {
    setKeywordInput("");
    setCategory("ALL");
    setFilter({
      page: 1,
      limit: 10,
      keyword: "",
      module: "",
      severity: "",
      dateFrom: todayInput,
      dateTo: todayInput,
    });
    setSelectedLog(null);
  };

  return (
    <AdminShell
      title="Nhật ký hệ thống"
      subtitle="Theo dõi hoạt động, bảo mật và các sự kiện quan trọng trên hệ thống"
    >
      <div className="space-y-4">
        {error && (
          <NeonCard className="border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
            {error}
          </NeonCard>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            compact
            icon={CalendarDays}
            title="Tổng sự kiện"
            value={String(stats.total)}
            delta="↑ 12.6%"
            tone="blue"
          />
          <StatCard
            compact
            icon={ShieldCheck}
            title="Cảnh báo bảo mật"
            value={String(stats.security)}
            delta="↑ 9.5%"
            tone="orange"
          />
          <StatCard
            compact
            icon={AlertTriangle}
            title="Lỗi hệ thống"
            value={String(stats.errors)}
            delta="↑ 40.0%"
            tone="red"
          />
          <StatCard
            compact
            icon={UserCircle2}
            title="Hoạt động admin"
            value={String(stats.admin)}
            delta="↑ 8.3%"
            tone="violet"
          />
        </section>

        <NeonCard className="p-3">
          <div className="grid gap-2 xl:grid-cols-[minmax(280px,1.5fr)_180px_180px_180px_180px_auto]">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-gray-400">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
                placeholder="Tìm theo hành động, mô tả, người dùng hoặc module..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>

            <SelectBox
              value={filter.severity}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  severity: value,
                }))
              }
              options={[
                { value: "", label: "Mức độ" },
                { value: "INFO", label: "INFO" },
                { value: "WARNING", label: "WARNING" },
                { value: "SECURITY", label: "SECURITY" },
                { value: "ERROR", label: "ERROR" },
              ]}
            />

            <SelectBox
              value={filter.module}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  module: value,
                }))
              }
              options={[
                { value: "", label: "Module" },
                ...modules.map((module) => ({
                  value: module,
                  label: module,
                })),
              ]}
            />

            <input
              type="date"
              className="h-10 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-white outline-none"
              value={filter.dateFrom}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  dateFrom: event.target.value,
                }))
              }
            />

            <input
              type="date"
              className="h-10 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-white outline-none"
              value={filter.dateTo}
              onChange={(event) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  dateTo: event.target.value,
                }))
              }
            />

            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/20 bg-white/5 px-4 text-sm font-medium text-gray-200 transition hover:bg-blue-500/10"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </NeonCard>

        <div className="flex flex-wrap gap-2">
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                category === tab.key
                  ? "border-blue-400/60 bg-blue-600/20 text-white shadow-[0_0_22px_rgba(37,99,235,0.42)]"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-blue-400/30 hover:bg-blue-500/10"
              }`}
              onClick={() => setCategory(tab.key)}
            >
              {tab.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-blue-100">
                {categoryCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <NeonCard className="overflow-hidden">
          <div className="grid grid-cols-[190px_220px_minmax(280px,1fr)_90px_110px_110px_72px] border-b border-white/10 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <div>Thời gian</div>
            <div>Người thực hiện</div>
            <div>Mô tả</div>
            <div className="text-center">Module</div>
            <div className="text-center">Mức độ</div>
            <div className="text-center">Trạng thái</div>
            <div className="text-right">Thao tác</div>
          </div>

          <div className="divide-y divide-white/5">
            {isLoading && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Đang tải nhật ký hệ thống...
              </div>
            )}

            {!isLoading && !filteredLogs.length && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Không tìm thấy sự kiện phù hợp.
              </div>
            )}

            {!isLoading &&
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[190px_220px_minmax(280px,1fr)_90px_110px_110px_72px] items-center px-3 py-3 text-sm text-gray-200 transition hover:bg-blue-500/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    {formatDateTime(log.time)}
                  </div>

                  <div className="flex min-w-0 items-center gap-3 pr-3">
                    <ActorAvatar actor={log.actor} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{log.actor.name}</p>
                      <p className="truncate text-xs text-gray-500">{log.actor.role}</p>
                    </div>
                  </div>

                  <div className="line-clamp-2 pr-4 text-sm leading-6 text-gray-300">
                    {log.description}
                  </div>
                  <div className="text-center text-gray-300">{log.module}</div>
                  <div className="flex justify-center">
                    <Badge text={log.severity} tone={severityTone[log.severity]} />
                  </div>
                  <div className="flex justify-center">
                    <Badge text={log.status} tone={statusTone[log.status]} />
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-gray-200 transition hover:border-blue-300/30 hover:bg-blue-500/15 hover:text-blue-100"
                      title="Xem chi tiết"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-3 text-sm text-gray-300">
            <span>
              Hiển thị {startIndex} - {endIndex} của {data?.meta.total ?? 0} kết quả
            </span>

            <div className="flex items-center gap-3">
              <span>Hiển thị</span>
              <select
                className="h-10 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-white outline-none"
                value={filter.limit}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    page: 1,
                    limit: Number(event.target.value),
                  }))
                }
              >
                {[10, 20, 30].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>kết quả/trang</span>
            </div>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(0, 5)
                .map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={`min-w-10 rounded-lg border px-3 py-2 ${
                      pageNumber === filter.page
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-white/10 bg-white/5"
                    }`}
                    onClick={() =>
                      setFilter((current) => ({
                        ...current,
                        page: pageNumber,
                      }))
                    }
                  >
                    {pageNumber}
                  </button>
                ))}
            </div>
          </div>
        </NeonCard>
      </div>

      {selectedLog && (
        <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </AdminShell>
  );
}

function LogDetailDrawer({
  log,
  onClose,
}: {
  log: ViewLog;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm">
      <aside className="h-full w-full max-w-[420px] overflow-y-auto border-l border-blue-300/20 bg-[#061225]/95 p-5 shadow-[0_0_60px_rgba(37,99,235,0.22)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Chi tiết sự kiện</h2>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <DrawerLine label="Event ID">
            <span className="text-sm text-gray-200">{log.eventId}</span>
          </DrawerLine>

          <DrawerLine label="Thời gian">
            <span className="text-sm text-gray-200">{formatDateTime(log.time)}</span>
          </DrawerLine>

          <DrawerLine label="Người thực hiện">
            <div className="flex items-center gap-3">
              <ActorAvatar actor={log.actor} />
              <div>
                <p className="text-sm font-medium text-white">{log.actor.name}</p>
                <p className="text-xs text-gray-500">{log.actor.role}</p>
              </div>
            </div>
          </DrawerLine>

          <DrawerLine label="Hành động">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{log.action}</p>
              <p className="text-xs text-gray-500">{log.actionCode}</p>
            </div>
          </DrawerLine>

          <DrawerLine label="Mô tả">
            <p className="text-sm leading-6 text-gray-300">{log.description}</p>
          </DrawerLine>

          <DrawerLine label="Module">
            <span className="text-sm text-gray-200">{log.module}</span>
          </DrawerLine>

          <DrawerLine label="IP Address">
            <span className="text-sm text-gray-200">{log.ipAddress}</span>
          </DrawerLine>

          <DrawerLine label="User Agent">
            <p className="text-sm leading-6 text-gray-300">{log.userAgent}</p>
          </DrawerLine>

          <DrawerLine label="Mức độ">
            <Badge text={log.severity} tone={severityTone[log.severity]} />
          </DrawerLine>

          <DrawerLine label="Trạng thái">
            <Badge text={log.status} tone={statusTone[log.status]} />
          </DrawerLine>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileJson className="h-4 w-4 text-blue-200" />
              <h3 className="font-semibold">Metadata (JSON)</h3>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/65 p-4 text-xs leading-6 text-blue-100">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        </div>
      </aside>
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

function Badge({
  text,
  tone,
}: {
  text: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
}

function ActorAvatar({ actor }: { actor: ViewLog["actor"] }) {
  return actor.avatarUrl ? (
    <img
      src={actor.avatarUrl}
      alt={actor.name}
      className="h-9 w-9 rounded-full border border-blue-300/25 object-cover"
    />
  ) : (
    <div className="grid h-9 w-9 place-items-center rounded-full border border-blue-300/25 bg-blue-500/15 text-sm font-semibold text-blue-100">
      {getInitial(actor.name)}
    </div>
  );
}

function DrawerLine({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">{label}</p>
      {children}
    </div>
  );
}
