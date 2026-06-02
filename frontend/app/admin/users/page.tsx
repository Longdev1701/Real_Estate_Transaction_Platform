"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
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

import { AdminShell, NeonCard, StatCard } from "@/components/admin/AdminShell";
import {
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUser,
  type AdminUser,
  type AdminUserListItem,
  type AdminUsersData,
  type AdminUsersFilter,
} from "@/lib/admin";

type UserQuickTab = "ALL" | "USER" | "ADMIN" | "AGENT" | "ACTIVE" | "BANNED";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "Admin",
  USER: "User",
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
  const [filter, setFilter] = useState<AdminUsersFilter>({
    page: 1,
    limit: 10,
    keyword: "",
    role: "",
    status: "",
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [quickTab, setQuickTab] = useState<UserQuickTab>("ALL");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [data, setData] = useState<AdminUsersData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSelectedUser, setIsLoadingSelectedUser] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [error, setError] = useState("");
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

    const loadUsers = async () => {
      try {
        setIsLoading(true);
        setError("");
        const result = await getAdminUsers(filter);
        if (!ignore) setData(result);
      } catch {
        if (!ignore) setError("Không thể tải danh sách người dùng.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    };

    loadUsers();
    return () => {
      ignore = true;
    };
  }, [filter, refreshKey]);

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    let ignore = false;

    const loadUserDetail = async () => {
      try {
        setIsLoadingSelectedUser(true);
        const result = await getAdminUserDetail(selectedUserId);
        if (!ignore) {
          setSelectedUser(result);
        }
      } catch {
        if (!ignore) {
          setError("Không thể tải chi tiết người dùng.");
        }
      } finally {
        if (!ignore) {
          setIsLoadingSelectedUser(false);
        }
      }
    };

    loadUserDetail();

    return () => {
      ignore = true;
    };
  }, [selectedUserId]);

  const counts = useMemo(() => {
    const total = data?.stats.totalUsers.total ?? 0;
    const admins = data?.stats.admins.total ?? 0;
    const banned = data?.stats.bannedUsers.total ?? 0;
    const active = data?.stats.activeUsers.total ?? 0;
    const users = Math.max(0, total - admins);

    return { total, admins, users, active, banned, agents: 0 };
  }, [data]);

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

  const startIndex = data?.meta.total
    ? (data.meta.page - 1) * data.meta.limit + 1
    : 0;
  const endIndex = data
    ? Math.min(data.meta.page * data.meta.limit, data.meta.total)
    : 0;

  const applyQuickTab = (tab: UserQuickTab) => {
    setQuickTab(tab);
    setFilter((current) => ({
      ...current,
      page: 1,
      role: tab === "ADMIN" || tab === "USER" ? tab : "",
      status: tab === "ACTIVE" || tab === "BANNED" ? tab : "",
    }));
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
      setError("");
      const updatedUser = await updateAdminUser(userId, input);

      setData((current) =>
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
      setSelectedUser((current) =>
        current?.id === updatedUser.id ? updatedUser : current,
      );
      setRefreshKey((current) => current + 1);
    } catch {
      setError("Không thể cập nhật người dùng.");
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
          <NeonCard className="border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
            {error}
          </NeonCard>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            compact
            icon={Users}
            title="Tổng người dùng"
            value={formatNumber(counts.total)}
            delta={`${formatNumber(counts.total)} tài khoản`}
            tone="blue"
          />
          <StatCard
            compact
            icon={ShieldCheck}
            title="Đang hoạt động"
            value={formatNumber(counts.active)}
            delta={`${formatNumber(counts.active)} tài khoản`}
            tone="green"
          />
          <StatCard
            compact
            icon={Shield}
            title="Admin"
            value={formatNumber(counts.admins)}
            delta={`${formatNumber(counts.admins)} tài khoản`}
            tone="violet"
          />
          <StatCard
            compact
            icon={Ban}
            title="Đã khóa"
            value={formatNumber(counts.banned)}
            delta={`${formatNumber(counts.banned)} tài khoản`}
            tone="red"
          />
        </section>

        <NeonCard className="p-3">
          <div className="grid items-center gap-2 xl:grid-cols-[minmax(260px,1.45fr)_170px_170px_170px_auto]">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-gray-400">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-500"
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
                { value: "", label: "Role" },
                { value: "ADMIN", label: "Admin" },
                { value: "USER", label: "User" },
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
                { value: "", label: "Status" },
                { value: "ACTIVE", label: "Active" },
                { value: "BANNED", label: "Banned" },
              ]}
            />

            <input
              type="date"
              className="h-10 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-gray-300 outline-none"
              aria-label="Registration Date"
            />

            <button
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-blue-300/20 bg-white/5 px-3 text-sm font-medium text-gray-200 transition hover:bg-blue-500/10 disabled:opacity-60"
              disabled={isLoading}
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
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
                  ? "border-blue-400/60 bg-[linear-gradient(135deg,rgba(37,99,235,0.42),rgba(14,165,233,0.18))] text-white shadow-[0_0_22px_rgba(37,99,235,0.42)]"
                  : "border-white/10 bg-white/[0.04] text-gray-300 hover:border-blue-400/30 hover:bg-blue-500/10"
              }`}
              onClick={() => applyQuickTab(tab.key)}
            >
              {tab.label}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-blue-100">
                {formatNumber(tab.count)}
              </span>
            </button>
          ))}
        </section>

        <NeonCard className="overflow-hidden">
          <div className="grid grid-cols-[minmax(240px,1.35fr)_minmax(220px,1.1fr)_120px_150px_130px_130px_120px] border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <div>User</div>
            <div>Email</div>
            <div>Vai trò</div>
            <div>Hoạt động</div>
            <div>Ngày tham gia</div>
            <div>Trạng thái</div>
            <div className="text-right">Thao tác</div>
          </div>

          <div className="min-h-[52vh] divide-y divide-white/5">
            {isLoading && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
                Đang tải người dùng...
              </div>
            )}

            {!isLoading && !data?.items.length && (
              <div className="px-5 py-10 text-center text-sm text-gray-400">
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

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-3 text-sm text-gray-300">
            <span>
              Hiển thị {startIndex} - {endIndex} của{" "}
              {formatNumber(data?.meta.total ?? 0)} người dùng
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

      <UserDrawer
        user={selectedUser}
        isLoading={isLoadingSelectedUser}
        onClose={() => {
          setSelectedUserId(null);
          setSelectedUser(null);
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
      className="grid w-full cursor-pointer grid-cols-[minmax(240px,1.35fr)_minmax(220px,1.1fr)_120px_150px_130px_130px_120px] items-center px-4 py-3 text-left text-sm text-gray-200 transition hover:bg-blue-500/[0.04] focus:outline-none focus-visible:bg-blue-500/[0.06] focus-visible:ring-2 focus-visible:ring-blue-400/40"
    >
      <div className="flex min-w-0 items-center gap-3 pr-3">
        <UserAvatar user={user} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{user.fullName}</p>
          <p className="mt-1 truncate text-xs text-gray-500">
            {user.phone || "Chưa có số điện thoại"}
          </p>
        </div>
      </div>

      <div className="truncate whitespace-nowrap pr-3 text-gray-300">
        {user.email}
      </div>
      <RoleBadge role={user.role} />
      <ActivityBadge label={activity.label} tone={activity.tone} />
      <div className="whitespace-nowrap text-gray-300">
        {formatDate(user.createdAt)}
      </div>
      <StatusBadge status={user.status} />
      <div
        className="flex justify-end gap-1.5"
        onClick={(event) => event.stopPropagation()}
      >
        <ActionButton title="View" onClick={onOpen}>
          <Eye className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title={`Set ${nextRole}`}
          disabled={isUpdating}
          onClick={() => onUpdate(user.id, { role: nextRole })}
          className="border-violet-400/25 bg-violet-500/10 text-violet-300"
        >
          <Shield className="h-3.5 w-3.5" />
        </ActionButton>
        <ActionButton
          title={nextStatus === "BANNED" ? "Ban User" : "Activate User"}
          disabled={isUpdating}
          onClick={() => onUpdate(user.id, { status: nextStatus })}
          className={
            nextStatus === "BANNED"
              ? "border-red-400/25 bg-red-500/10 text-red-300"
              : "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
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
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm">
        <aside className="h-full w-full max-w-[450px] overflow-y-auto border-l border-blue-300/20 bg-[#061225]/95 p-5 shadow-[0_0_60px_rgba(37,99,235,0.22)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">User detail</h2>
            <button
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <NeonCard className="p-5">
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-white/10" />
                  <div className="h-4 w-24 rounded bg-white/10" />
                  <div className="h-3 w-28 rounded bg-white/10" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-10 rounded-xl bg-white/10" />
                <div className="h-10 rounded-xl bg-white/10" />
                <div className="h-10 rounded-xl bg-white/10" />
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/55 backdrop-blur-sm">
      <aside className="h-full w-full max-w-[450px] overflow-y-auto border-l border-blue-300/20 bg-[#061225]/95 p-5 shadow-[0_0_60px_rgba(37,99,235,0.22)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">User detail</h2>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
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
              <p className="text-sm text-blue-200">{makeUsername(user)}</p>
              <p className="text-xs text-gray-500">{makeUserCode(user.id)}</p>
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
          <DrawerMetric label="Posts" value={user._count.posts} />
          <DrawerMetric label="Comments" value={user._count.comments} />
          <DrawerMetric label="Saved" value={user._count.savedPosts} />
          <DrawerMetric label="Reports" value={user._count.reports} />
        </div>

        <NeonCard className="mt-4 p-4">
          <h3 className="mb-3 font-semibold">Hoạt động gần đây</h3>
          <div className="space-y-2 text-sm text-gray-300">
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
                <div
                  key={post.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                >
                  <p className="line-clamp-1 text-sm font-semibold text-white">
                    {post.title}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(post.createdAt)} • {post.status}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400">
                Người dùng chưa có bài đăng.
              </p>
            )}
          </div>
        </NeonCard>

        <div className="mt-4 grid gap-2">
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(user.id, { role: nextRole })}
            className="h-11 rounded-xl border border-violet-400/25 bg-violet-500/10 font-semibold text-violet-200 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Chuyển vai trò sang {roleLabels[nextRole]}
          </button>
          <button
            disabled={isUpdating}
            onClick={() => onUpdate(user.id, { status: nextStatus })}
            className={`h-11 rounded-xl border font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              nextStatus === "BANNED"
                ? "border-red-400/25 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
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
      className={`${className} shrink-0 rounded-full border border-blue-300/25 object-cover`}
    />
  ) : (
    <div
      className={`${className} grid shrink-0 place-items-center rounded-full border border-blue-300/25 bg-blue-500/15 font-bold text-blue-100`}
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
      className="h-10 min-w-0 rounded-xl border border-blue-300/20 bg-slate-950/55 px-3 text-sm text-white outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-slate-950 text-white"
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
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${isAdmin ? "border-violet-400/30 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/[0.04] text-gray-300"}`}
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
      className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${active ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300" : "border-red-400/30 bg-red-500/10 text-red-300"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-400" : "bg-red-400"}`}
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
    online: "bg-emerald-400 text-emerald-300",
    away: "bg-amber-400 text-amber-300",
    offline: "bg-slate-500 text-slate-300",
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
  className = "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10",
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
      <Icon className="h-4 w-4 text-blue-200" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="truncate font-medium text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function DrawerMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className="text-lg font-bold text-white">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
