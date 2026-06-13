"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  useQueryClient,
} from "@tanstack/react-query";
import {
  Ban,
  CalendarDays,
  Eye,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminUserDetail,
  getAdminUsers,
  getAdminUsersStats,
  updateAdminUser,
  type AdminUser,
  type AdminUserListItem,
  type AdminUsersData,
  type AdminUsersFilter,
  type AdminUsersStats,
} from "@/lib/admin";
import { useAdminQuery } from "@/hooks/useAdminQuery";
import { adminQueryKeys } from "@/lib/admin-query-keys";

type UserQuickTab = "ALL" | "USER" | "ADMIN" | "AGENT" | "ACTIVE" | "BANNED";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "Admin",
  USER: "Người dùng",
};

const statusLabels: Record<AdminUser["status"], string> = {
  ACTIVE: "Active",
  BANNED: "Banned",
};

const formatNumber = (value: number) => numberFormatter.format(value);

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const shiftDate = (value: string, days: number) => {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return "";
  }

  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
};

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "U";

const makeUserCode = (id: string) => `USR-${id.slice(-6).toUpperCase()}`;

const makeUsername = (user: AdminUser) =>
  `@${
    user.email
      .split("@")[0]
      ?.replace(/[^a-zA-Z0-9_.-]/g, "")
      .slice(0, 18) || user.id.slice(-6)
  }`;

const getActivity = (user: Pick<AdminUserListItem, "updatedAt">) => {
  const updatedAt = new Date(user.updatedAt).getTime();
  if (Number.isNaN(updatedAt)) {
    return { label: "Không hoạt động", tone: "offline" as const };
  }

  const minutes = Math.floor((Date.now() - updatedAt) / 60_000);
  if (minutes <= 5) return { label: "Online now", tone: "online" as const };
  if (minutes < 60)
    return { label: `${minutes} phút trước`, tone: "away" as const };

  const hours = Math.max(1, Math.floor(minutes / 60));
  if (hours < 24)
    return { label: `${hours} giờ trước`, tone: "offline" as const };

  const days = Math.max(1, Math.floor(hours / 24));
  return { label: `${days} ngày trước`, tone: "offline" as const };
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const defaultFilter: AdminUsersFilter = {
    page: 1,
    limit: 10,
    keyword: "",
    role: "",
    status: "",
    dateFrom: "",
    dateTo: "",
  };
  const [filter, setFilter] = useState<AdminUsersFilter>({
    ...defaultFilter,
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [quickTab, setQuickTab] = useState<UserQuickTab>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [mutationError, setMutationError] = useState("");

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

  const usersQuery = useAdminQuery<AdminUsersData>({
    queryKey: adminQueryKeys.users.list(filter),
    queryFn: () => getAdminUsers(filter),
    errorMessage: "Không thể tải danh sách người dùng.",
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const userStatsQuery = useAdminQuery<AdminUsersStats>({
    queryKey: adminQueryKeys.users.stats(),
    queryFn: getAdminUsersStats,
    errorMessage: "Không thể tải thống kê người dùng.",
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const selectedUserQuery = useAdminQuery<AdminUser>({
    enabled: Boolean(selectedUserId),
    queryKey: adminQueryKeys.users.detail(selectedUserId),
    queryFn: () => getAdminUserDetail(selectedUserId!),
    errorMessage: "Không thể tải chi tiết người dùng.",
    staleTime: 10_000,
  });

  const data = usersQuery.data;
  const stats = userStatsQuery.data;
  const selectedUser = selectedUserQuery.data;
  const isLoading = usersQuery.isLoading;
  const isRefreshing =
    usersQuery.isFetching || userStatsQuery.isFetching || selectedUserQuery.isFetching;
  const isLoadingStats = userStatsQuery.isLoading;
  const isLoadingSelectedUser = selectedUserQuery.isLoading;
  const error =
    mutationError ||
    usersQuery.error ||
    userStatsQuery.error ||
    selectedUserQuery.error;

  const counts = useMemo(() => {
    const total = stats?.totalUsers.total ?? 0;
    const admins = stats?.admins.total ?? 0;
    const banned = stats?.bannedUsers.total ?? 0;
    const active = stats?.activeUsers.total ?? 0;
    const users = Math.max(0, total - admins);

    return { total, admins, users, active, banned, agents: 0 };
  }, [stats]);

  const startIndex = data?.meta.total
    ? (data.meta.page - 1) * data.meta.limit + 1
    : 0;
  const endIndex = data
    ? Math.min(data.meta.page * data.meta.limit, data.meta.total)
    : 0;
  const currentPage = data?.meta.page ?? filter.page;
  const totalPages = data?.meta.totalPages ?? 1;

  const applyQuickTab = (tab: UserQuickTab) => {
    setQuickTab(tab);
    setFilter((current) => ({
      ...current,
      page: 1,
      role: tab === "ADMIN" || tab === "USER" ? tab : "",
      status: tab === "ACTIVE" || tab === "BANNED" ? tab : "",
    }));
  };

  const resetFilters = () => {
    setKeywordInput("");
    setQuickTab("ALL");
    setFilter(defaultFilter);
  };

  const handleDateFromChange = (value: string) => {
    setFilter((current) => {
      const nextFilter: AdminUsersFilter = {
        ...current,
        page: 1,
        dateFrom: value,
      };

      if (value && current.dateTo && value >= current.dateTo) {
        nextFilter.dateTo = "";
      }

      return nextFilter;
    });
  };

  const handleDateToChange = (value: string) => {
    setFilter((current) => {
      const nextFilter: AdminUsersFilter = {
        ...current,
        page: 1,
        dateTo: value,
      };

      if (value && current.dateFrom && value <= current.dateFrom) {
        nextFilter.dateFrom = "";
      }

      return nextFilter;
    });
  };

  const handleUpdateUser = async (
    userId: string,
    input: {
      role?: AdminUser["role"];
      status?: AdminUser["status"];
    },
  ) => {
    try {
      setIsUpdatingUser(true);
      setMutationError("");
      const updatedUser = await updateAdminUser(userId, input);

      usersQuery.setData((current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) =>
                item.id === updatedUser.id
                  ? {
                      ...item,
                      email: updatedUser.email,
                      fullName: updatedUser.fullName,
                      phone: updatedUser.phone,
                      avatarUrl: updatedUser.avatarUrl,
                      role: updatedUser.role,
                      status: updatedUser.status,
                      createdAt: updatedUser.createdAt,
                      updatedAt: updatedUser.updatedAt,
                    }
                  : item,
              ),
            }
          : current,
      );
      selectedUserQuery.setData((current) =>
        current?.id === updatedUser.id ? updatedUser : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.users.stats() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.dashboard() }),
        selectedUserId === updatedUser.id
          ? queryClient.invalidateQueries({
              queryKey: adminQueryKeys.users.detail(updatedUser.id),
            })
          : Promise.resolve(),
      ]);
    } catch {
      setMutationError("Không thể cập nhật người dùng.");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  return (
    <AdminShell
      title="Quản lý người dùng"
      subtitle="Quản lý, kiểm soát quyền và theo dõi hoạt động tài khoản trên hệ thống"
    >
      <div className="space-y-5">
        {error && (
          <NeonCard className="theme-badge-danger p-3 text-sm">
            {error}
          </NeonCard>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              compact
              icon={Users}
              title="Tổng người dùng"
              value={isLoadingStats ? "..." : formatNumber(counts.total)}
              delta={`${formatNumber(counts.total)} tài khoản`}
              tone="blue"
            />
          <StatCard
            compact
              icon={ShieldCheck}
              title="Đang hoạt động"
              value={isLoadingStats ? "..." : formatNumber(counts.active)}
              delta={`${formatNumber(counts.active)} tài khoản`}
              tone="green"
            />
          <StatCard
            compact
              icon={Shield}
              title="Admin"
              value={isLoadingStats ? "..." : formatNumber(counts.admins)}
              delta={`${formatNumber(counts.admins)} tài khoản`}
              tone="violet"
            />
          <StatCard
            compact
              icon={Ban}
              title="Đã khóa"
              value={isLoadingStats ? "..." : formatNumber(counts.banned)}
              delta={`${formatNumber(counts.banned)} tài khoản`}
              tone="red"
            />
        </section>

        <NeonCard className="p-3">
          <div className="grid items-center gap-2 xl:grid-cols-[minmax(260px,1.45fr)_170px_170px_170px_170px_auto]">
            <label className="theme-admin-input flex h-10 items-center gap-2 rounded-xl px-3 text-[var(--muted-foreground)]">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                placeholder="Tìm theo tên, email, số điện thoại hoặc ID người dùng..."
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </label>

            <SelectBox
              value={filter.role}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  role: value as AdminUsersFilter["role"],
                }))
              }
              options={[
                { value: "", label: "Vai trò" },
                { value: "ADMIN", label: "Admin" },
                { value: "USER", label: "Người dùng" },
              ]}
            />

            <SelectBox
              value={filter.status}
              onChange={(value) =>
                setFilter((current) => ({
                  ...current,
                  page: 1,
                  status: value as AdminUsersFilter["status"],
                }))
              }
              options={[
                { value: "", label: "Trạng thái" },
                { value: "ACTIVE", label: "Active" },
                { value: "BANNED", label: "Banned" },
              ]}
            />

            <input
              type="date"
              className="theme-admin-input h-10 rounded-xl px-3 text-sm text-[var(--foreground)] outline-none"
              aria-label="Registration Date From"
              value={filter.dateFrom}
              max={filter.dateTo ? shiftDate(filter.dateTo, -1) : undefined}
              onChange={(event) => handleDateFromChange(event.target.value)}
            />

            <input
              type="date"
              className="theme-admin-input h-10 rounded-xl px-3 text-sm text-[var(--foreground)] outline-none"
              aria-label="Registration Date To"
              value={filter.dateTo}
              min={filter.dateFrom ? shiftDate(filter.dateFrom, 1) : undefined}
              onChange={(event) => handleDateToChange(event.target.value)}
            />

            <button
              className="theme-admin-toolbar-button inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-medium transition disabled:opacity-60"
              disabled={isRefreshing}
              onClick={resetFilters}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>
        </NeonCard>

        <section className="flex flex-wrap gap-2">
          {[
            { key: "ALL" as const, label: "Tất cả", count: counts.total },
            { key: "USER" as const, label: "Người dùng", count: counts.users },
            { key: "ADMIN" as const, label: "Admin", count: counts.admins },
            { key: "AGENT" as const, label: "Môi giới", count: counts.agents },
            {
              key: "ACTIVE" as const,
              label: "Đang hoạt động",
              count: counts.active,
            },
            { key: "BANNED" as const, label: "Đã khóa", count: counts.banned },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                quickTab === tab.key
                  ? "theme-admin-tab-active"
                  : "theme-admin-tab"
              }`}
              onClick={() => applyQuickTab(tab.key)}
            >
              {tab.label}
              <span className="theme-admin-tab-count rounded-full px-2 py-0.5 text-xs">
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </section>

        <NeonCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="theme-admin-table-head grid grid-cols-[minmax(240px,1.35fr)_minmax(220px,1.1fr)_120px_150px_130px_130px_120px] border-b px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                <div>Người dùng</div>
                <div>Email</div>
                <div>Vai trò</div>
                <div>Hoạt động</div>
                <div>Ngày tham gia</div>
                <div>Trạng thái</div>
                <div className="text-right">Thao tác</div>
              </div>

              <div className="theme-admin-table-divider min-h-[52vh] divide-y">
                {isLoading && (
                  <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    Đang tải người dùng...
                  </div>
                )}

                {!isLoading && !data?.items.length && (
                  <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                    Không tìm thấy người dùng phù hợp.
                  </div>
                )}

                {!isLoading &&
                  data?.items.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onOpen={() => setSelectedUserId(user.id)}
                      onUpdate={handleUpdateUser}
                      isUpdating={isUpdatingUser}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div className="theme-admin-table-head flex flex-wrap items-center justify-between gap-4 border-t px-5 py-3 text-sm text-[var(--secondary-foreground)]">
            <span>
              Hiển thị {startIndex} - {endIndex} của{" "}
              {formatNumber(data?.meta.total ?? 0)} người dùng
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

      <UserDrawer
        user={selectedUser}
        isLoading={isLoadingSelectedUser}
        onClose={() => {
          setSelectedUserId(null);
          selectedUserQuery.setData(null);
        }}
        onUpdate={handleUpdateUser}
        isUpdating={isUpdatingUser}
      />
    </AdminShell>
  );
}

function UserRow({
  user,
  onOpen,
  onUpdate,
  isUpdating,
}: {
  user: AdminUserListItem;
  onOpen: () => void;
  onUpdate: (
    userId: string,
    input: { role?: AdminUserListItem["role"]; status?: AdminUserListItem["status"] },
  ) => void;
  isUpdating: boolean;
}) {
  const activity = getActivity(user);
  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  const nextStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="theme-admin-table-row grid w-full cursor-pointer grid-cols-[minmax(240px,1.35fr)_minmax(220px,1.1fr)_120px_150px_130px_130px_120px] items-center px-4 py-3 text-left text-sm transition focus:outline-none focus-visible:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-[var(--accent-border)]"
    >
      <div className="flex min-w-0 items-center gap-3 pr-3">
        <UserAvatar user={user} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-[var(--foreground)]">{user.fullName}</p>
          <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
            {user.phone || "Chưa có số điện thoại"}
          </p>
        </div>
      </div>

      <div className="truncate whitespace-nowrap pr-3 text-[var(--secondary-foreground)]">
        {user.email}
      </div>
      <RoleBadge role={user.role} />
      <ActivityBadge label={activity.label} tone={activity.tone} />
      <div className="whitespace-nowrap text-[var(--secondary-foreground)]">
        {formatDate(user.createdAt)}
      </div>
      <StatusBadge status={user.status} />
      <div
        className="flex justify-end gap-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        <ActionButton title="Xem chi tiết" onClick={onOpen}>
          <Eye className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title={nextRole === "ADMIN" ? "Cấp quyền quản trị" : "Chuyển về người dùng"}
          disabled={isUpdating}
          onClick={() => onUpdate(user.id, { role: nextRole })}
          className="theme-admin-action-accent"
        >
          <Shield className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title={nextStatus === "BANNED" ? "Khóa tài khoản" : "Kích hoạt tài khoản"}
          disabled={isUpdating}
          onClick={() => onUpdate(user.id, { status: nextStatus })}
          className={
            nextStatus === "BANNED"
              ? "theme-admin-action-danger"
              : "theme-admin-action-primary"
          }
        >
          {nextStatus === "BANNED" ? (
            <Ban className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
        </ActionButton>
      </div>
    </div>
  );
}

function UserDrawer({
  user,
  isLoading,
  onClose,
  onUpdate,
  isUpdating,
}: {
  user: AdminUser | null;
  isLoading: boolean;
  onClose: () => void;
  onUpdate: (
    userId: string,
    input: { role?: AdminUser["role"]; status?: AdminUser["status"] },
  ) => void;
  isUpdating: boolean;
}) {
  if (!user && !isLoading) return null;

  if (isLoading || !user) {
    return (
      <div className="theme-modal-backdrop fixed inset-0 z-50 flex justify-end backdrop-blur-sm">
        <aside className="theme-admin-drawer h-full w-full max-w-[450px] overflow-y-auto p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">Chi tiết người dùng</h2>
            <button
              className="theme-admin-action grid h-9 w-9 place-items-center rounded-lg"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <NeonCard className="p-5">
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="theme-skeleton h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="theme-skeleton h-5 w-40 rounded" />
                  <div className="theme-skeleton h-4 w-24 rounded" />
                  <div className="theme-skeleton h-3 w-28 rounded" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="theme-skeleton h-10 rounded-xl" />
                <div className="theme-skeleton h-10 rounded-xl" />
                <div className="theme-skeleton h-10 rounded-xl" />
              </div>
            </div>
          </NeonCard>
        </aside>
      </div>
    );
  }

  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  const nextStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";

  return (
    <div className="theme-modal-backdrop fixed inset-0 z-50 flex justify-end backdrop-blur-sm">
      <aside className="theme-admin-drawer h-full w-full max-w-[450px] overflow-y-auto p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Chi tiết người dùng</h2>
          <button
            className="theme-admin-action grid h-9 w-9 place-items-center rounded-lg"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <NeonCard className="p-5">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold">{user.fullName}</h3>
              <p className="text-sm text-[var(--accent)]">{makeUsername(user)}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{makeUserCode(user.id)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <InfoRow icon={Mail} label="Email" value={user.email} />
            <InfoRow
              icon={Phone}
              label="SĐT"
              value={user.phone || "Chưa cập nhật"}
            />
            <InfoRow
              icon={Shield}
              label="Vai trò"
              value={roleLabels[user.role]}
            />
            <InfoRow
              icon={CalendarDays}
              label="Ngày tham gia"
              value={formatDate(user.createdAt)}
            />
          </div>
        </NeonCard>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <DrawerMetric label="Bài đăng" value={user._count.posts} />
          <DrawerMetric label="Bình luận" value={user._count.comments} />
          <DrawerMetric label="Lượt lưu" value={user._count.savedPosts} />
          <DrawerMetric label="Báo cáo" value={user._count.reports} />
        </div>

        <NeonCard className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Hoạt động gần đây</h3>
          <div className="space-y-2 text-sm text-[var(--secondary-foreground)]">
            <p>• Cập nhật hồ sơ: {formatDate(user.updatedAt)}</p>
            <p>• Tổng bài đăng đã tạo: {formatNumber(user._count.posts)}</p>
            <p>• Tổng bình luận: {formatNumber(user._count.comments)}</p>
          </div>
        </NeonCard>

        <NeonCard className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Bài đăng mới nhất</h3>
          <div className="space-y-2">
            {user.posts.length ? (
              user.posts.map((post) => (
                <div key={post.id} className="theme-subtle-card rounded-xl p-3">
                  <p className="line-clamp-1 text-sm font-semibold text-[var(--foreground)]">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {formatDate(post.createdAt)} • {post.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Người dùng chưa có bài đăng.
              </p>
            )}
          </div>
        </NeonCard>

        <div className="mt-4 grid gap-2">
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(user.id, { role: nextRole })}
            className="theme-admin-action-accent h-11 rounded-xl font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            Chuyển vai trò sang {roleLabels[nextRole]}
          </button>
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(user.id, { status: nextStatus })}
            className={`h-11 rounded-xl border font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              nextStatus === "BANNED"
                ? "theme-admin-action-danger"
                : "theme-admin-action-primary"
            }`}
          >
            {nextStatus === "BANNED" ? "Khóa người dùng" : "Mở khóa người dùng"}
          </button>
        </div>
      </aside>
    </div>
  );
}

function UserAvatar({
  user,
  size,
}: {
  user: Pick<AdminUserListItem, "avatarUrl" | "fullName">;
  size: "md" | "lg";
}) {
  const className = size === "lg" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";

  return user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.fullName}
      className={`${className} shrink-0 rounded-full theme-admin-avatar object-cover`}
    />
  ) : (
    <div
      className={`${className} theme-admin-avatar grid shrink-0 place-items-center rounded-full font-bold`}
    >
      {getInitial(user.fullName)}
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
        <option
          key={option.value}
          value={option.value}
          className=""
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  const isAdmin = role === "ADMIN";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${isAdmin ? "theme-badge-premium" : "theme-chip"}`}
    >
      {isAdmin ? (
        <Shield className="h-3.5 w-3.5" />
      ) : (
        <Users className="h-3.5 w-3.5" />
      )}
      {roleLabels[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${active ? "theme-badge-success" : "theme-badge-danger"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[var(--success-foreground)]" : "bg-[var(--danger-foreground)]"}`}
      />
      {statusLabels[status]}
    </span>
  );
}

function ActivityBadge({
  label,
  tone,
}: {
  label: string;
  tone: "online" | "away" | "offline";
}) {
  const colors = {
    online: "bg-[var(--success-foreground)] text-[var(--success-foreground)]",
    away: "bg-[var(--warning-foreground)] text-[var(--warning-foreground)]",
    offline: "bg-[var(--muted-foreground)] text-[var(--muted-foreground)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold ${colors[tone].split(" ")[1]}`}
    >
      <span className={`h-2 w-2 rounded-full ${colors[tone].split(" ")[0]}`} />
      {label}
    </span>
  );
}

function ActionButton({
  title,
  children,
  className = "theme-admin-action",
  onClick,
  disabled = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-7 w-7 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-[var(--accent)]" />
      <div className="min-w-0">
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
        <p className="truncate font-medium text-[var(--foreground)]">{value}</p>
      </div>
    </div>
  );
}

function DrawerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="theme-subtle-card rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-[var(--foreground)]">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{label}</p>
    </div>
  );
}
