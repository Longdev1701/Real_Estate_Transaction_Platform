"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Flag,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminPosts,
  getAdminPostsStats,
  updateAdminPostStatus,
  type AdminPost,
  type AdminPostsData,
  type AdminPostsFilter,
  type AdminPostsStats,
  type AdminPostStatus,
} from "@/lib/admin";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin-query-keys";
import {
  formatPrice,
  POST_TYPES,
  postTypeLabels,
  PROPERTY_TYPES,
  propertyTypeLabels,
} from "@/lib/posts";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const statusLabels: Record<AdminPostStatus, string> = {
  ACTIVE: "Đang hiện thị",
  HIDDEN: "Đã ẩn",
  BANNED: "Vi phạm",
};

const statusStyles: Record<AdminPostStatus, string> = {
  ACTIVE: "theme-badge-success",
  HIDDEN: "theme-badge-warning",
  BANNED: "theme-badge-danger",
};

const formatNumber = (value: number) => numberFormatter.format(value);

const formatDelta = (value: number) => {
  const prefix = value >= 0 ? "↑" : "↓";
  return `${prefix} ${Math.abs(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 1,
  })}%`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

const getLocation = (post: AdminPost) =>
  [post.district, post.city].filter(Boolean).join(", ") || post.address;

const getFullAddress = (post: AdminPost) =>
  [post.address, post.ward, post.district, post.city].filter(Boolean).join(", ");

const buildPostPatch = (
  post: AdminPost,
  input: Partial<Pick<AdminPost, "status">>,
): AdminPost => ({
  ...post,
  ...input,
  updatedAt: new Date().toISOString(),
});

type StatusTab = "ALL" | "ACTIVE" | "BANNED" | "HIDDEN";

export default function AdminPostsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminPostsFilter>({
    page: 1,
    limit: 10,
    keyword: "",
    status: "",
    propertyType: "",
    postType: "",
    minPrice: "",
    maxPrice: "",
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [isUpdating, setIsUpdating] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const [selectedPost, setSelectedPost] = useState<AdminPost | null>(null);

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

  const postsQuery = useAdminQuery<AdminPostsData>({
    queryKey: adminQueryKeys.posts.list(filter),
    queryFn: () => getAdminPosts(filter),
    errorMessage: "Không thể tải danh sách bài đăng.",
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const postStatsQuery = useAdminQuery<AdminPostsStats>({
    queryKey: adminQueryKeys.posts.stats(),
    queryFn: getAdminPostsStats,
    errorMessage: "Không thể tải thống kê bài đăng.",
    staleTime: 10_000,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const data = postsQuery.data;
  const stats = postStatsQuery.data;
  const isLoading = postsQuery.isLoading;
  const isLoadingStats = postStatsQuery.isLoading;
  const error = mutationError || postsQuery.error || postStatsQuery.error;

  const tabs = useMemo(
    () => [
      { key: "ALL" as const, label: "Tất cả", count: stats?.totalPosts.total ?? 0 },
      {
        key: "ACTIVE" as const,
        label: "Đang hiện thị",
        count: stats?.activePosts.total ?? 0,
      },
      { key: "BANNED" as const, label: "Vi phạm", count: stats?.bannedPosts.total ?? 0 },
      { key: "HIDDEN" as const, label: "Đã ẩn", count: stats?.hiddenPosts.total ?? 0 },
    ],
    [stats],
  );

  const startIndex = data?.meta.total ? (data.meta.page - 1) * data.meta.limit + 1 : 0;
  const endIndex = data ? Math.min(data.meta.page * data.meta.limit, data.meta.total) : 0;
  const currentPage = data?.meta.page ?? filter.page;
  const totalPages = data?.meta.totalPages ?? 1;

  const applyTab = (tab: StatusTab) => {
    setActiveTab(tab);
    setFilter((current) => ({
      ...current,
      page: 1,
      status: tab === "ALL" ? "" : tab,
    }));
  };

  const syncPost = (patchedPost: AdminPost) => {
    postsQuery.setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === patchedPost.id ? patchedPost : item,
            ),
          }
        : current,
    );
    setSelectedPost((current) =>
      current?.id === patchedPost.id ? patchedPost : current,
    );
  };

  const updateStatus = async (post: AdminPost, status: AdminPostStatus) => {
    if (isUpdating || post.status === status) return;

    try {
      setIsUpdating(true);
      setMutationError("");
      await updateAdminPostStatus(post.id, status);
      syncPost(buildPostPatch(post, { status }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "posts"] }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.posts.stats() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
      ]);
    } catch {
      setMutationError("Không thể cập nhật trạng thái bài đăng.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetail = (post: AdminPost) => {
    setSelectedPost(post);
  };

  const closeDrawer = () => {
    setSelectedPost(null);
  };

  return (
    <AdminShell
      title="Quản lý bài đăng"
      subtitle="Theo dõi, lọc và xử lý trạng thái bài đăng bất động sản trên hệ thống"
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
            icon={ClipboardList}
            title="Tổng bài đăng"
            value={isLoadingStats ? "..." : formatNumber(stats?.totalPosts.total ?? 0)}
            delta={isLoadingStats ? "..." : formatDelta(stats?.totalPosts.deltaPercent ?? 0)}
            tone="blue"
          />
          <StatCard
            compact
            icon={Flag}
            title="Báo cáo chờ xử lý"
            value={isLoadingStats ? "..." : formatNumber(stats?.pendingReports.total ?? 0)}
            delta={isLoadingStats ? "..." : formatDelta(stats?.pendingReports.deltaPercent ?? 0)}
            tone="orange"
          />
          <StatCard
            compact
            icon={CheckCircle2}
            title="Đang hiện thị"
            value={isLoadingStats ? "..." : formatNumber(stats?.activePosts.total ?? 0)}
            delta={isLoadingStats ? "..." : formatDelta(stats?.activePosts.deltaPercent ?? 0)}
            tone="green"
          />
          <StatCard
            compact
            icon={ShieldAlert}
            title="Ẩn / vi phạm"
            value={
              isLoadingStats
                ? "..."
                : formatNumber(
                    (stats?.hiddenPosts.total ?? 0) +
                      (stats?.bannedPosts.total ?? 0),
                  )
            }
            delta={isLoadingStats ? "..." : formatDelta(stats?.bannedPosts.deltaPercent ?? 0)}
            tone="red"
          />
        </section>

        <NeonCard className="p-3">
          <div className="grid items-center gap-2 xl:grid-cols-[minmax(260px,1.45fr)_150px_170px_165px_minmax(250px,0.9fr)_auto]">
            <label className="theme-admin-input flex h-10 items-center gap-2 rounded-xl px-3 text-[var(--muted-foreground)]">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                placeholder="Tìm tiêu đề, người đăng, vị trí..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>

            <SelectBox
              value={filter.status}
              onChange={(value) => {
                setActiveTab(value ? (value as StatusTab) : "ALL");
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  status: value as AdminPostsFilter["status"],
                }));
              }}
              options={[
                { value: "", label: "Trạng thái" },
                { value: "ACTIVE", label: "Đang hiện thị" },
                { value: "HIDDEN", label: "Đã ẩn" },
                { value: "BANNED", label: "Vi phạm" },
              ]}
            />

            <SelectBox
              value={filter.propertyType}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  propertyType: value as AdminPostsFilter["propertyType"],
                }))
              }
              options={[
                { value: "", label: "Loại BDS" },
                ...PROPERTY_TYPES.map((type) => ({
                  value: type,
                  label: propertyTypeLabels[type],
                })),
              ]}
            />

            <SelectBox
              value={filter.postType}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  postType: value as AdminPostsFilter["postType"],
                }))
              }
              options={[
                { value: "", label: "Giao dịch" },
                ...POST_TYPES.map((type) => ({
                  value: type,
                  label: postTypeLabels[type],
                })),
              ]}
            />

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                type="number"
                min={0}
                className="theme-admin-input h-10 min-w-0 rounded-xl px-3 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
                placeholder="Giá từ"
                value={filter.minPrice}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    page: 1,
                    minPrice: event.target.value,
                  }))
                }
              />
              <span className="text-[var(--muted-foreground)]">-</span>
              <input
                type="number"
                min={0}
                className="theme-admin-input h-10 min-w-0 rounded-xl px-3 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
                placeholder="Giá đến"
                value={filter.maxPrice}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    page: 1,
                    maxPrice: event.target.value,
                  }))
                }
              />
            </div>

            <button
              className="theme-admin-toolbar-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition disabled:opacity-60"
              disabled={isLoading}
              onClick={() => {
                postsQuery.reload();
                postStatsQuery.reload();
              }}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
          </div>
        </NeonCard>

        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "theme-admin-tab-active"
                  : "theme-admin-tab"
              }`}
              onClick={() => applyTab(tab.key)}
            >
              {tab.label}
              <span className="theme-admin-tab-count rounded-full px-2 py-0.5 text-xs">
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </div>

        <NeonCard className="overflow-hidden">
          <div className="theme-admin-table-head grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.85fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_110px_125px_136px] border-b px-3 py-3 text-xs font-semibold uppercase tracking-wide">
            <div>Bài đăng</div>
            <div>Người đăng</div>
            <div>Loại BDS</div>
            <div>Giá</div>
            <div>Vị trí</div>
            <div>Ngày đăng</div>
            <div>Trạng thái</div>
            <div className="text-right">Hành động</div>
          </div>

          <div className="theme-admin-table-divider divide-y">
            {isLoading && (
              <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                Đang tải bài đăng...
              </div>
            )}

            {!isLoading && !data?.items.length && (
              <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                Không tìm thấy bài đăng phù hợp.
              </div>
            )}

            {!isLoading &&
              data?.items.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  isUpdating={isUpdating}
                  onOpenDetail={openDetail}
                  onUpdateStatus={updateStatus}
                />
              ))}
          </div>

          <div className="theme-admin-table-head flex flex-wrap items-center justify-between gap-4 border-t px-5 py-3 text-sm text-[var(--secondary-foreground)]">
            <span>
              Hiển thị {startIndex} - {endIndex} của {formatNumber(data?.meta.total ?? 0)} bài đăng
            </span>
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              isLoading={isLoading}
              onPageChange={(page) =>
                setFilter((current) => ({ ...current, page }))
              }
            />
          </div>
        </NeonCard>
      </div>

      {selectedPost && (
        <PostDetailDrawer
          post={selectedPost}
          isUpdating={isUpdating}
          onClose={closeDrawer}
          onUpdateStatus={updateStatus}
        />
      )}
    </AdminShell>
  );
}

function PostRow({
  post,
  isUpdating,
  onOpenDetail,
  onUpdateStatus,
}: {
  post: AdminPost;
  isUpdating: boolean;
  onOpenDetail: (post: AdminPost) => void;
  onUpdateStatus: (post: AdminPost, status: AdminPostStatus) => void;
}) {
  return (
    <div className="theme-admin-table-row grid grid-cols-[minmax(0,1.8fr)_minmax(0,0.85fr)_minmax(0,0.6fr)_minmax(0,0.7fr)_minmax(0,0.9fr)_110px_125px_136px] items-center gap-0 px-3 py-3 text-sm transition">
      <div className="flex min-w-0 items-center gap-3 pr-3">
        <img
          src={post.images[0]?.imageUrl ?? imageFallback}
          alt={post.title}
          className="h-16 w-24 shrink-0 rounded-xl border border-[var(--border)] object-cover"
        />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold leading-5 text-[var(--foreground)]">{post.title}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">#{post.id.slice(-6).toUpperCase()}</p>
          <p className="mt-1 text-xs text-[var(--accent)]">{postTypeLabels[post.postType]}</p>
        </div>
      </div>

      <div className="min-w-0 pr-3">
        <p className="truncate font-medium text-[var(--foreground)]">{post.author.fullName}</p>
        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{post.author.email}</p>
      </div>

      <div className="line-clamp-2 pr-3 text-[var(--secondary-foreground)]">
        {propertyTypeLabels[post.propertyType]}
      </div>
      <div className="break-words pr-3 font-semibold leading-5 text-[var(--accent)]">
        {formatPrice(post.price)}
      </div>
      <div className="line-clamp-2 pr-3 text-[var(--secondary-foreground)]">{getLocation(post)}</div>
      <div className="pr-3 text-[var(--secondary-foreground)]">{formatDate(post.createdAt)}</div>
      <StatusBadge status={post.status} />

      <div className="flex justify-end gap-1">
        <ActionButton
          title="Xem chi tiết"
          className="theme-admin-action-info"
          onClick={() => onOpenDetail(post)}
        >
          <Eye className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title="Đánh dấu vi phạm"
          disabled={isUpdating}
          className="theme-admin-action-danger"
          onClick={() => onUpdateStatus(post, "BANNED")}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title="Ẩn bài"
          disabled={isUpdating}
          className="theme-admin-action-warn"
          onClick={() => onUpdateStatus(post, "HIDDEN")}
        >
          <Ban className="h-3.5 w-3.5" />
        </ActionButton>
      </div>
    </div>
  );
}

function PostDetailDrawer({
  post,
  isUpdating,
  onClose,
  onUpdateStatus,
}: {
  post: AdminPost;
  isUpdating: boolean;
  onClose: () => void;
  onUpdateStatus: (post: AdminPost, status: AdminPostStatus) => void;
}) {
  const canActivate = post.status !== "ACTIVE";
  const canHide = post.status !== "HIDDEN";
  const canBan = post.status !== "BANNED";

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-50 flex justify-end backdrop-blur-sm">
      <aside className="theme-admin-drawer h-full w-full max-w-[520px] overflow-y-auto p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Chi tiết bài đăng</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Mã bài đăng #{post.id.slice(-6).toUpperCase()}</p>
          </div>
          <button
            className="theme-admin-action grid h-9 w-9 place-items-center rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <NeonCard className="overflow-hidden p-0">
          <img
            src={post.images[0]?.imageUrl ?? imageFallback}
            alt={post.title}
            className="h-56 w-full object-cover"
          />
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-[var(--foreground)]">{post.title}</h3>
                <p className="mt-1 text-sm text-[var(--accent)]">{postTypeLabels[post.postType]}</p>
              </div>
              <StatusBadge status={post.status} />
            </div>

            <p className="mt-4 text-2xl font-bold text-[var(--foreground)]">{formatPrice(post.price)}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{post.area} m²</p>

            <div className="mt-5 grid gap-3 text-sm">
              <InfoRow icon={MapPin} label="Địa chỉ" value={getFullAddress(post)} />
              <InfoRow
                icon={ClipboardList}
                label="Loại bất động sản"
                value={propertyTypeLabels[post.propertyType]}
              />
              <InfoRow
                icon={CalendarDays}
                label="Ngày đăng"
                value={formatDateTime(post.createdAt)}
              />
              <InfoRow
                icon={CalendarDays}
                label="Cập nhật cuối"
                value={formatDateTime(post.updatedAt)}
              />
            </div>
          </div>
        </NeonCard>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DrawerMetric label="Báo cáo" value={post._count.reports} />
          <DrawerMetric label="Bình luận" value={post._count.comments} />
          <DrawerMetric label="Lượt lưu" value={post._count.savedBy} />
        </div>

        <NeonCard className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Người đăng</h3>
          <div className="theme-subtle-card rounded-xl p-4">
            <p className="text-base font-semibold text-[var(--foreground)]">{post.author.fullName}</p>
            <div className="mt-3 grid gap-3 text-sm">
              <InfoRow icon={Mail} label="Email" value={post.author.email} />
              <InfoRow
                icon={Phone}
                label="Số điện thoại"
                value={post.author.phone || "Chưa cập nhật"}
              />
            </div>
          </div>
        </NeonCard>

        <NeonCard className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Mô tả bài đăng</h3>
          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--secondary-foreground)]">
            {post.description || "Bài đăng chưa có mô tả."}
          </p>
        </NeonCard>

        {post.images.length > 1 && (
          <NeonCard className="mt-4 p-4">
            <h3 className="mb-3 font-semibold">Hình ảnh khác</h3>
            <div className="grid grid-cols-3 gap-2">
              {post.images.slice(1).map((image) => (
                <img
                  key={image.id}
                  src={image.imageUrl}
                  alt={post.title}
                  className="h-20 w-full rounded-xl border border-[var(--border)] object-cover"
                />
              ))}
            </div>
          </NeonCard>
        )}
        <div className="mt-4 grid gap-2">
          {canActivate && (
            <button
              disabled={isUpdating}
              onClick={() => onUpdateStatus(post, "ACTIVE")}
              className="theme-admin-action-info h-11 rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hiển thị lại bài đăng
            </button>
          )}

          {canHide && (
            <button
              disabled={isUpdating}
              onClick={() => onUpdateStatus(post, "HIDDEN")}
              className="theme-admin-action-warn h-11 rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ẩn bài đăng
            </button>
          )}

          {canBan && (
            <button
              disabled={isUpdating}
              onClick={() => onUpdateStatus(post, "BANNED")}
              className="theme-admin-action-danger h-11 rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Đánh dấu vi phạm
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="theme-subtle-card flex items-start gap-3 rounded-xl px-3 py-3">
      <div className="theme-admin-action-primary mt-0.5 rounded-lg p-2">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
        <p className="mt-1 text-sm text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

function DrawerMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <NeonCard className="p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-lg font-bold text-[var(--foreground)]">{formatNumber(value)}</p>
    </NeonCard>
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
      className="theme-admin-select h-11 min-w-0 rounded-xl px-3 text-sm outline-none"
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

function StatusBadge({ status }: { status: AdminPostStatus }) {
  const Icon = status === "ACTIVE" ? CheckCircle2 : status === "BANNED" ? ShieldAlert : EyeOff;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${statusStyles[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}

function ActionButton({
  title,
  children,
  className,
  disabled,
  onClick,
}: {
  title: string;
  children: ReactNode;
  className: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {children}
    </button>
  );
}
