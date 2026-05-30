"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  FileText,
  Filter,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { AxiosError } from "axios";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import {
  formatNotificationTime,
  getNotificationHref,
  notificationTypeLabels,
  type NotificationItem,
  type NotificationListData,
  type NotificationType,
} from "@/lib/notifications";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";

type StatusFilter = "all" | "unread" | "read";
type TimeFilter = "all" | "7d" | "30d";

const typeOptions: Array<{ value: "all" | NotificationType; label: string }> = [
  { value: "all", label: "Tất cả loại" },
  { value: "MESSAGE", label: "Tin nhắn" },
  { value: "POST", label: "Bài đăng" },
  { value: "REPORT", label: "Báo cáo" },
  { value: "SYSTEM", label: "Hệ thống" },
];

const navItems: Array<{ type: "all" | NotificationType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: "all", label: "Tất cả thông báo", icon: Bell },
  { type: "MESSAGE", label: "Tin nhắn", icon: MessageCircle },
  { type: "POST", label: "Bài đăng", icon: FileText },
  { type: "REPORT", label: "Báo cáo", icon: MessageSquare },
  { type: "SYSTEM", label: "Hệ thống", icon: Settings },
];

const summaryItems: Array<{ type: NotificationType; label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = [
  { type: "MESSAGE", label: "Tin nhắn", icon: MessageCircle, className: "bg-emerald-500" },
  { type: "POST", label: "Bài đăng", icon: FileText, className: "bg-blue-600" },
  { type: "REPORT", label: "Báo cáo", icon: MessageSquare, className: "bg-violet-600" },
];

const getTypeIcon = (type: NotificationType) => {
  if (type === "MESSAGE") return MessageCircle;
  if (type === "POST") return FileText;
  if (type === "REPORT") return ShieldCheck;
  return Bell;
};

const getActionLabel = (type: NotificationType) => {
  if (type === "MESSAGE") return "Trả lời";
  if (type === "POST") return "Xem bài đăng";
  return "Xem chi tiết";
};

const emitUnreadCountChanged = (count: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("notifications:unread-count", { detail: count }));
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | NotificationType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7d");
  const cacheKey = user ? `notifications:list:${user.id}` : "notifications:list";

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const cached = readSessionCache<NotificationListData>(cacheKey);
        if (cached && isMounted) {
          setItems(cached.items);
          setUnreadCount(cached.unreadCount);
          emitUnreadCountChanged(cached.unreadCount);
          setIsLoading(false);
        }

        const response = await api.get<{ data: NotificationListData }>("/notifications?limit=50");
        if (isMounted) {
          setItems(response.data.data.items);
          setUnreadCount(response.data.data.unreadCount);
          emitUnreadCountChanged(response.data.data.unreadCount);
          writeSessionCache(cacheKey, response.data.data);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải thông báo.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, hasHydrated, user]);

  useEffect(() => {
    if (!socket || !user) return;

    const handleNotificationCreated = (notification: NotificationItem) => {
      if (notification.userId !== user.id) return;

      setItems((currentItems) => {
        if (currentItems.some((item) => item.id === notification.id)) {
          return currentItems;
        }

        const nextItems = [notification, ...currentItems];
        const nextUnreadCount = nextItems.filter((item) => !item.isRead).length;
        setUnreadCount(nextUnreadCount);
        emitUnreadCountChanged(nextUnreadCount);
        writeSessionCache(cacheKey, {
          items: nextItems,
          unreadCount: nextUnreadCount,
          meta: {
            page: 1,
            limit: 50,
            total: nextItems.length,
            totalPages: 1,
            hasMore: false,
          },
        });
        return nextItems;
      });
    };

    socket.on("notification_created", handleNotificationCreated);

    return () => {
      socket.off("notification_created", handleNotificationCreated);
    };
  }, [cacheKey, socket, user]);

  const counts = useMemo(() => {
    const initial: Record<"all" | NotificationType, number> = {
      all: items.length,
      MESSAGE: 0,
      POST: 0,
      REPORT: 0,
      SYSTEM: 0,
    };

    items.forEach((item) => {
      initial[item.type] += 1;
    });

    return initial;
  }, [items]);

  const unreadCounts = useMemo(() => {
    const initial: Record<NotificationType, number> = {
      MESSAGE: 0,
      POST: 0,
      REPORT: 0,
      SYSTEM: 0,
    };

    items.forEach((item) => {
      if (!item.isRead) {
        initial[item.type] += 1;
      }
    });

    return initial;
  }, [items]);

  const filteredItems = useMemo(() => {
    const now = Date.now();
    const maxAgeMs = timeFilter === "7d" ? 7 * 24 * 60 * 60 * 1000 : timeFilter === "30d" ? 30 * 24 * 60 * 60 * 1000 : null;

    return items.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "unread" ? !item.isRead : item.isRead);
      const createdAt = new Date(item.createdAt).getTime();
      const matchesTime = !maxAgeMs || (!Number.isNaN(createdAt) && now - createdAt <= maxAgeMs);
      return matchesType && matchesStatus && matchesTime;
    });
  }, [items, statusFilter, timeFilter, typeFilter]);

  const updateCache = (nextItems: NotificationItem[]) => {
    const nextUnreadCount = nextItems.filter((item) => !item.isRead).length;
    setItems(nextItems);
    setUnreadCount(nextUnreadCount);
    emitUnreadCountChanged(nextUnreadCount);
    writeSessionCache(cacheKey, {
      items: nextItems,
      unreadCount: nextUnreadCount,
      meta: {
        page: 1,
        limit: 50,
        total: nextItems.length,
        totalPages: 1,
        hasMore: false,
      },
    });
  };

  const markOneAsRead = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      const nextItems = items.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item));
      updateCache(nextItems);
      await api.patch(`/notifications/${notification.id}/read`);
    }
  };

  const markAllAsRead = async () => {
    const nextItems = items.map((item) => ({ ...item, isRead: true }));
    updateCache(nextItems);
    await api.patch("/notifications/read-all");
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 py-6 lg:px-6">
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_390px]">
        <aside className="glass-card h-fit p-4 xl:sticky xl:top-24">
          <nav className="space-y-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = typeFilter === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setTypeFilter(item.type)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-blue-400/40 bg-blue-600/20 text-white shadow-[0_0_30px_rgba(37,99,235,0.25)]"
                      : "border-transparent text-gray-300 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-sm font-semibold">
                    {counts[item.type]}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-[0_0_22px_rgba(37,99,235,0.35)]">
                <Bookmark className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-white">Theo dõi nhanh</h2>
                <p className="text-sm text-gray-400">Tình trạng hộp thông báo</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
                <p className="text-2xl font-bold text-white">{items.length}</p>
                <p className="mt-1 text-xs text-gray-400">Tổng thông báo</p>
              </div>
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
                <p className="text-2xl font-bold text-blue-200">{unreadCount}</p>
                <p className="mt-1 text-xs text-gray-400">Chưa đọc</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-white">Thông báo</h1>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 transition hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          {error ? (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="inline-flex items-center gap-3 text-gray-300">
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
                Đang tải thông báo...
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
              Không có thông báo phù hợp.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((notification) => {
                const Icon = getTypeIcon(notification.type);
                const href = getNotificationHref(notification);

                return (
                  <article
                    key={notification.id}
                    className={`rounded-xl border p-4 transition ${
                      notification.isRead
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-blue-400/45 bg-blue-500/10 shadow-[0_0_30px_rgba(37,99,235,0.18)]"
                    }`}
                  >
                    <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                      <div className="flex items-center gap-3">
                        <span className={`h-3 w-3 rounded-full ${notification.isRead ? "bg-slate-600" : "bg-blue-500"}`} />
                        <span className={`flex h-14 w-14 items-center justify-center rounded-full ${notification.isRead ? "bg-slate-700 text-gray-200" : "bg-blue-600 text-white"}`}>
                          <Icon className="h-6 w-6" />
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h2 className="line-clamp-1 font-semibold text-white">{notification.title}</h2>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-gray-300">{notification.content}</p>
                        <p className="mt-1 text-sm text-gray-400">{formatNotificationTime(notification.createdAt)}</p>
                      </div>

                      <div className="flex items-center gap-2 md:flex-col md:items-end">
                        <Link
                          href={href}
                          onClick={() => markOneAsRead(notification)}
                          className="inline-flex min-w-32 justify-center rounded-lg border border-blue-400/25 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          {getActionLabel(notification.type)}
                        </Link>
                        <button
                          type="button"
                          onClick={() => markOneAsRead(notification)}
                          disabled={notification.isRead}
                          className="rounded-lg border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200 transition hover:bg-blue-500/20 disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-400"
                        >
                          {notification.isRead ? "Đã đọc" : "Chưa đọc"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <aside className="space-y-5">
          <section className="glass-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-white">Bộ lọc thông báo</h2>
              <SlidersHorizontal className="h-5 w-5 text-blue-300" />
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-200">Loại thông báo</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | NotificationType)} className="input-dark">
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="mb-2 block text-sm font-medium text-gray-200">Trạng thái</span>
                <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/10">
                  {[
                    ["all", "Tất cả"],
                    ["unread", "Chưa đọc"],
                    ["read", "Đã đọc"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value as StatusFilter)}
                      className={`px-3 py-3 text-sm font-medium transition ${
                        statusFilter === value ? "bg-blue-600 text-white" : "bg-white/[0.02] text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-200">Khoảng thời gian</span>
                <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="input-dark">
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="all">Tất cả thời gian</option>
                </select>
              </label>

              <button type="button" className="btn-primary inline-flex w-full items-center justify-center gap-2">
                <Filter className="h-4 w-4" />
                Áp dụng bộ lọc
              </button>
            </div>
          </section>

          <section className="glass-card p-5">
            <h2 className="mb-5 text-2xl font-semibold text-white">Tóm tắt</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                <span className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Bell className="h-6 w-6" />
                  </span>
                  <span>
                    <span className="block font-medium text-white">Tổng chưa đọc</span>
                    <span className="text-sm text-gray-400">Thông báo chưa đọc</span>
                  </span>
                </span>
                <span className="text-3xl font-bold text-white">{unreadCount}</span>
              </div>

              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="flex items-center gap-3">
                      <span className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${item.className}`}>
                        <Icon className="h-6 w-6" />
                      </span>
                      <span>
                        <span className="block font-medium text-white">{item.label}</span>
                        <span className="text-sm text-gray-400">{notificationTypeLabels[item.type]} chưa đọc</span>
                      </span>
                    </span>
                    <span className="text-3xl font-bold text-white">{unreadCounts[item.type]}</span>
                  </div>
                );
              })}

              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-blue-300 transition hover:bg-white/5">
                Xem tất cả thống kê
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
