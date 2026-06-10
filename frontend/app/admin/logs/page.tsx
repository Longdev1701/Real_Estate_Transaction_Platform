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

import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import { adminQueryKeys } from "@/lib/admin-query-keys";
import {
  getAdminSystemLogsStats,
  type AdminLogCategory,
  getAdminSystemLogs,
  type AdminLogSeverity,
  type AdminLogStatus,
  type AdminSystemLog,
  type AdminSystemLogModule,
  type AdminSystemLogsData,
  type AdminSystemLogsFilter,
} from "@/lib/admin";
import { useAdminQuery } from "@/hooks/useAdminQuery";

type LogCategory = AdminLogCategory;

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
  INFO: "theme-badge-info",
  WARNING: "theme-badge-warning",
  SECURITY: "theme-badge-premium",
  ERROR: "theme-badge-danger",
};

const statusTone: Record<AdminLogStatus, string> = {
  SUCCESS: "theme-badge-success",
  FAILED: "theme-badge-danger",
  BLOCKED: "theme-badge-warning",
};

const categoryTabs: { key: LogCategory; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "AUTH", label: "Auth" },
  { key: "USER", label: "Người dùng" },
  { key: "POST", label: "Bài đăng" },
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
    LOGIN_FAILED: "Đăng nhập thất bại",
    LOGOUT: "Logout",
    REFRESH_TOKEN: "Làm mới phiên đăng nhập",
    REFRESH_TOKEN_FAILED: "Làm mới phiên đăng nhập thất bại",
    REGISTER: "Register",
    CREATE_REPORT: "Tạo báo cáo",
    REPORT_RESOLVED: "Xử lý báo cáo",
    REPORT_REJECTED: "Từ chối báo cáo",
    UPDATE_USER_ROLE: "Cập nhật vai trò người dùng",
    BAN_USER: "Khóa người dùng",
    ACTIVATE_USER: "Kích hoạt người dùng",
    CREATE_POST: "Tạo bài đăng",
    HIDE_POST: "Ẩn bài đăng",
    ADD_POST_IMAGES: "Thêm ảnh bài đăng",
    DELETE_POST_IMAGE: "Xóa ảnh bài đăng",
    UPDATE_POST_STATUS_ACTIVE: "Duyệt bài đăng",
    UPDATE_POST_STATUS_HIDDEN: "Ẩn trạng thái bài đăng",
    UPDATE_POST_STATUS_BANNED: "Đánh dấu bài đăng vi phạm",
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
          ? "Người dùng"
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
    category: "ALL",
    module: "",
    severity: "",
    status: "",
    dateFrom: todayInput,
    dateTo: todayInput,
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [category, setCategory] = useState<LogCategory>("ALL");
  const [selectedLog, setSelectedLog] = useState<ViewLog | null>(null);

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
    setFilter((current) =>
      current.category === category
        ? current
        : {
            ...current,
            page: 1,
            category,
          },
    );
  }, [category]);

  const logsQuery = useAdminQuery<AdminSystemLogsData>({
    queryKey: adminQueryKeys.logs.list(filter),
    queryFn: () => getAdminSystemLogs(filter),
    errorMessage: "Không thể tải nhật ký hệ thống.",
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: 7_500,
  });

  const logStatsQuery = useAdminQuery({
    queryKey: adminQueryKeys.logs.stats({
      keyword: filter.keyword,
      module: filter.module,
      severity: filter.severity,
      status: filter.status,
      dateFrom: filter.dateFrom,
      dateTo: filter.dateTo,
    }),
    queryFn: () =>
      getAdminSystemLogsStats({
        keyword: filter.keyword,
        module: filter.module,
        severity: filter.severity,
        status: filter.status,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
      }),
    errorMessage: "Không thể tải thống kê nhật ký hệ thống.",
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: 7_500,
  });

  const data = logsQuery.data;
  const statsData = logStatsQuery.data;
  const isLoading = logsQuery.isLoading || logStatsQuery.isLoading;
  const error = logsQuery.error || logStatsQuery.error;

  const mappedLogs = useMemo(() => (data?.items ?? []).map(buildViewLog), [data]);

  const filteredLogs = mappedLogs;

  const stats = useMemo(
    () => ({
      total: statsData?.total ?? 0,
      security: statsData?.security ?? 0,
      errors: statsData?.errors ?? 0,
      admin: statsData?.admin ?? 0,
    }),
    [statsData],
  );

  const categoryCounts = useMemo(
    () =>
      statsData?.categoryCounts ?? {
        ALL: 0,
        AUTH: 0,
        USER: 0,
        POST: 0,
        ADMIN: 0,
        ERROR: 0,
      },
    [statsData],
  );

  const modules = useMemo(
    () => statsData?.modules ?? [],
    [statsData],
  );

  const totalPages = data?.meta.totalPages ?? 1;
  const currentPage = data?.meta.page ?? filter.page;
  const startIndex = data?.meta.total ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const endIndex = data ? Math.min(data.meta.page * data.meta.limit, data.meta.total) : 0;

  const resetFilters = () => {
    setKeywordInput("");
    setCategory("ALL");
    setFilter({
      page: 1,
      limit: 10,
      keyword: "",
      category: "ALL",
      module: "",
      severity: "",
      status: "",
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
          <NeonCard className="theme-badge-danger p-3 text-sm">
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
            <label className="theme-admin-input flex h-10 items-center gap-2 rounded-xl px-3 text-[var(--muted-foreground)]">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
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
                { value: "", label: "Mô-đun" },
                ...modules.map((module) => ({
                  value: module,
                  label: module,
                })),
              ]}
            />

            <input
              type="date"
              className="theme-admin-select h-10 rounded-xl px-3 text-sm outline-none [color-scheme:inherit]"
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
              className="theme-admin-select h-10 rounded-xl px-3 text-sm outline-none [color-scheme:inherit]"
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
              className="theme-admin-toolbar-button inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition"
              onClick={() => {
                logsQuery.reload();
                logStatsQuery.reload();
              }}
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
                  ? "theme-admin-tab-active"
                  : "theme-admin-tab"
              }`}
              onClick={() => setCategory(tab.key)}
            >
              {tab.label}
              <span className="theme-admin-tab-count rounded-full px-2 py-0.5 text-xs">
                {categoryCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <NeonCard className="overflow-hidden">
          <div className="theme-admin-table-head grid grid-cols-[190px_220px_minmax(280px,1fr)_90px_110px_110px_72px] border-b px-3 py-3 text-xs font-semibold uppercase tracking-wide">
            <div>Thời gian</div>
            <div>Người thực hiện</div>
            <div>Mô tả</div>
            <div className="text-center">Mô-đun</div>
            <div className="text-center">Mức độ</div>
            <div className="text-center">Trạng thái</div>
            <div className="text-right">Thao tác</div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {isLoading && (
              <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                Đang tải nhật ký hệ thống...
              </div>
            )}

            {!isLoading && !filteredLogs.length && (
              <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                Không tìm thấy sự kiện phù hợp.
              </div>
            )}

            {!isLoading &&
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[190px_220px_minmax(280px,1fr)_90px_110px_110px_72px] items-center px-3 py-3 text-sm text-[var(--secondary-foreground)] transition hover:bg-[var(--accent-soft)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                    {formatDateTime(log.time)}
                  </div>

                  <div className="flex min-w-0 items-center gap-3 pr-3">
                    <ActorAvatar actor={log.actor} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{log.actor.name}</p>
                      <p className="truncate text-xs text-[var(--muted-foreground)]">{log.actor.role}</p>
                    </div>
                  </div>

                  <div className="line-clamp-2 pr-4 text-sm leading-6 text-[var(--secondary-foreground)]">
                    {log.description}
                  </div>
                  <div className="text-center text-[var(--secondary-foreground)]">{log.module}</div>
                  <div className="flex justify-center">
                    <Badge text={log.severity} tone={severityTone[log.severity]} />
                  </div>
                  <div className="flex justify-center">
                    <Badge text={log.status} tone={statusTone[log.status]} />
                  </div>

                  <div className="flex justify-end">
                    <button
                      className="theme-admin-action grid h-8 w-8 place-items-center rounded-lg transition"
                      title="Xem chi tiết"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="theme-admin-table-head flex flex-wrap items-center justify-between gap-4 border-t px-5 py-3 text-sm text-[var(--secondary-foreground)]">
            <span>
              Hiển thị {startIndex} - {endIndex} của {data?.meta.total ?? 0} kết quả
            </span>

            <div className="flex items-center gap-3">
              <span>Hiển thị</span>
              <select
                className="theme-admin-select h-10 rounded-xl px-3 text-sm outline-none"
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

            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              isLoading={isLoading}
              onPageChange={(page) =>
                setFilter((current) => ({
                  ...current,
                  page,
                }))
              }
            />
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
    <div className="theme-modal-backdrop fixed inset-0 z-50 flex justify-end backdrop-blur-sm">
      <aside className="theme-admin-drawer h-full w-full max-w-[420px] overflow-y-auto p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Chi tiết sự kiện</h2>
          <button
            className="theme-admin-action grid h-9 w-9 place-items-center rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <DrawerLine label="Event ID">
            <span className="text-sm text-[var(--foreground)]">{log.eventId}</span>
          </DrawerLine>

          <DrawerLine label="Thời gian">
            <span className="text-sm text-[var(--foreground)]">{formatDateTime(log.time)}</span>
          </DrawerLine>

          <DrawerLine label="Người thực hiện">
            <div className="flex items-center gap-3">
              <ActorAvatar actor={log.actor} />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{log.actor.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{log.actor.role}</p>
              </div>
            </div>
          </DrawerLine>

          <DrawerLine label="Hành động">
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--foreground)]">{log.action}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{log.actionCode}</p>
            </div>
          </DrawerLine>

          <DrawerLine label="Mô tả">
            <p className="text-sm leading-6 text-[var(--secondary-foreground)]">{log.description}</p>
          </DrawerLine>

          <DrawerLine label="Mô-đun">
            <span className="text-sm text-[var(--foreground)]">{log.module}</span>
          </DrawerLine>

          <DrawerLine label="IP Address">
            <span className="text-sm text-[var(--foreground)]">{log.ipAddress}</span>
          </DrawerLine>

          <DrawerLine label="Trình duyệt / thiết bị">
            <p className="text-sm leading-6 text-[var(--secondary-foreground)]">{log.userAgent}</p>
          </DrawerLine>

          <DrawerLine label="Mức độ">
            <Badge text={log.severity} tone={severityTone[log.severity]} />
          </DrawerLine>

          <DrawerLine label="Trạng thái">
            <Badge text={log.status} tone={statusTone[log.status]} />
          </DrawerLine>

          <div className="theme-subtle-card rounded-xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileJson className="h-4 w-4 text-[var(--accent)]" />
              <h3 className="font-semibold">Metadata (JSON)</h3>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-xs leading-6 text-[var(--secondary-foreground)]">
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
      className="theme-admin-select h-10 min-w-0 rounded-xl px-3 text-sm outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
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
      className="h-9 w-9 rounded-full border border-[var(--accent-border)] object-cover"
    />
  ) : (
    <div className="theme-admin-avatar grid h-9 w-9 place-items-center rounded-full text-sm font-semibold">
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
    <div className="theme-subtle-card rounded-xl px-4 py-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      {children}
    </div>
  );
}
