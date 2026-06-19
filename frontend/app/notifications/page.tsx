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
  X,
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
  { type: "MESSAGE", label: "Tin nhắn", icon: MessageCircle, className: "theme-public-icon-green" },
  { type: "POST", label: "Bài đăng", icon: FileText, className: "theme-public-icon-blue" },
  { type: "REPORT", label: "Báo cáo", icon: MessageSquare, className: "theme-public-icon-violet" },
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterAnchorTime, setFilterAnchorTime] = useState(() => Date.now());
  const cacheKey = user ? `notifications:list:${user.id}` : "notifications:list";

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    if (!hasHydrated || isLoadingUser || !user || !accessToken) {
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
  }, [accessToken, cacheKey, hasHydrated, isLoadingUser, user]);

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

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterOpen]);

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
    const maxAgeMs = timeFilter === "7d" ? 7 * 24 * 60 * 60 * 1000 : timeFilter === "30d" ? 30 * 24 * 60 * 60 * 1000 : null;

    return items.filter((item) => {
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "unread" ? !item.isRead : item.isRead);
      const createdAt = new Date(item.createdAt).getTime();
      const itemAgeMs = !Number.isNaN(createdAt)
        ? filterAnchorTime - createdAt
        : Number.POSITIVE_INFINITY;
      const matchesTime = !maxAgeMs || itemAgeMs <= maxAgeMs;
      return matchesType && matchesStatus && matchesTime;
    });
  }, [filterAnchorTime, items, statusFilter, timeFilter, typeFilter]);

  useEffect(() => {
    setFilterAnchorTime(Date.now());
  }, [items, statusFilter, timeFilter, typeFilter]);

  const activeFilterCount =
    (typeFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (timeFilter !== "7d" ? 1 : 0);

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
    <div className="px-4 py-6 lg:px-6 xl:h-[calc(100vh-5rem)] xl:overflow-hidden">
      <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:h-full xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <aside className="glass-card -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x h-fit p-2 overflow-x-auto no-scrollbar xl:p-3.5 xl:max-h-full xl:overflow-y-auto">
          <nav className="flex gap-2 snap-x xl:grid xl:grid-cols-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = typeFilter === item.type;

              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={(e) => {
                    setTypeFilter(item.type);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`flex shrink-0 snap-center items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition xl:w-full xl:py-3 ${
                    active
                      ? "border-[var(--info-border)] bg-[var(--info-soft)] text-[var(--foreground)] shadow-[var(--shadow-glow)]"
                      : "border-transparent text-[var(--secondary-foreground)] hover:border-[var(--border)] hover:bg-[var(--hover)]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4.5 w-4.5" />
                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  </span>
                  <span className="theme-surface-soft rounded-full px-2 py-0.5 text-xs font-semibold">
                    {counts[item.type]}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="theme-surface-soft mt-4 hidden rounded-2xl p-3.5 lg:block">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="theme-button-primary flex h-10 w-10 items-center justify-center rounded-xl">
                <Bookmark className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Theo dõi nhanh</h2>
                <p className="theme-text-muted text-xs">Tình trạng hộp thông báo</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="theme-surface-muted rounded-xl p-2.5">
                <p className="text-xl font-bold text-[var(--foreground)]">{items.length}</p>
                <p className="theme-text-muted mt-0.5 text-[10px]">Tổng thông báo</p>
              </div>
              <div className="theme-button-info rounded-xl p-2.5">
                <p className="text-xl font-bold">{unreadCount}</p>
                <p className="theme-text-muted mt-0.5 text-[10px]">Chưa đọc</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex min-h-0 flex-col mt-4 xl:mt-0 xl:h-full">
          <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Thông báo</h1>
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="theme-surface-soft inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] xl:hidden"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--accent)]" />
                <span className="hidden sm:inline">Bộ lọc</span>
                {activeFilterCount > 0 ? (
                  <span className="theme-badge-info inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5 text-[10px] sm:text-xs">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                title="Đánh dấu tất cả đã đọc"
                className="theme-link inline-flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-2 rounded-xl sm:rounded-none bg-[var(--surface-soft)] sm:bg-transparent text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Đánh dấu tất cả đã đọc</span>
              </button>
            </div>
          </div>

          {error ? (
            <div className="theme-button-danger-solid mb-4 shrink-0 rounded-xl p-4 text-sm">
              {error}
            </div>
          ) : null}

          <div className="no-scrollbar min-h-0 flex-1 pb-6 xl:overflow-y-auto xl:pr-1">
            {isLoading ? (
              <div className="theme-surface-soft flex h-full min-h-[300px] items-center justify-center rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="theme-text-secondary inline-flex items-center gap-3">
                  <LoaderCircle className="h-5 w-5 animate-spin text-[var(--primary)]" />
                  Đang tải thông báo...
                </div>
              </div>
            ) : (
              <div key={typeFilter} className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                {filteredItems.length === 0 ? (
                  <div className="theme-surface-soft theme-empty-state flex h-full min-h-[300px] items-center justify-center rounded-2xl border-dashed p-8 text-center">
                    Không có thông báo phù hợp.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredItems.map((notification) => {
                      const Icon = getTypeIcon(notification.type);
                      const href = getNotificationHref(notification);

                      return (
                        <Link
                          key={notification.id}
                          href={href}
                          onClick={() => markOneAsRead(notification)}
                          className={`block rounded-2xl border p-3.5 sm:p-4 transition hover:brightness-95 ${
                            notification.isRead
                              ? "theme-surface-soft border-transparent"
                              : "border-[var(--info-border)] bg-[var(--info-soft)] shadow-[var(--shadow-glow)]"
                          }`}
                        >
                          <div className="flex gap-3 sm:gap-4 items-start">
                            <div className="flex items-center gap-2 pt-1 sm:pt-0">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${notification.isRead ? "theme-notification-dot-read" : "theme-notification-dot-unread"}`} />
                              <span className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full ${notification.isRead ? "theme-surface-soft text-[var(--secondary-foreground)]" : "theme-button-primary"}`}>
                                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex justify-between gap-2 items-start">
                                <h2 className="line-clamp-1 text-sm sm:text-base font-semibold text-[var(--foreground)]">{notification.title}</h2>
                                <span className="theme-text-muted shrink-0 whitespace-nowrap text-xs">{formatNotificationTime(notification.createdAt)}</span>
                              </div>
                              <p className="theme-text-secondary mt-1 line-clamp-2 text-xs sm:text-sm leading-5 sm:leading-6">{notification.content}</p>
                              
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1">
                                  {getActionLabel(notification.type)}
                                  <ChevronRight className="h-3 w-3" />
                                </span>
                                {!notification.isRead && (
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--info)] bg-[var(--info-soft)] px-2 py-0.5 rounded-md border border-[var(--info-border)]">Mới</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <aside className="hidden lg:block space-y-4 pb-6 lg:col-span-2 xl:col-span-1 xl:max-h-full xl:overflow-y-auto no-scrollbar">
          <section className="hidden glass-card p-4 xl:block">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">Bộ lọc thông báo</h2>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setStatusFilter("all");
                    setTimeFilter("7d");
                  }}
                  className="text-sm font-medium text-[var(--info)] hover:underline"
                >
                  Đặt lại
                </button>
              ) : (
                <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />
              )}
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="theme-input-label mb-1.5 block text-xs font-medium">Loại thông báo</span>
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | NotificationType)} className="input-dark py-2 text-sm">
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div>
                <span className="theme-input-label mb-1.5 block text-xs font-medium">Trạng thái</span>
                <div className="theme-surface-soft grid grid-cols-3 overflow-hidden rounded-xl">
                  {[
                    ["all", "Tất cả"],
                    ["unread", "Chưa đọc"],
                    ["read", "Đã đọc"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value as StatusFilter)}
                      className={`px-2 py-2 text-xs font-medium transition ${
                        statusFilter === value ? "theme-button-primary" : "text-[var(--secondary-foreground)] hover:bg-[var(--hover)]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="theme-input-label mb-1.5 block text-xs font-medium">Khoảng thời gian</span>
                <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="input-dark py-2 text-sm">
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="all">Tất cả thời gian</option>
                </select>
              </label>

              <button type="button" className="btn-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm">
                <Filter className="h-4.5 w-4.5" />
                Áp dụng bộ lọc
              </button>
            </div>
          </section>

          <section className="glass-card p-4">
            <h2 className="mb-4 text-xl font-semibold text-[var(--foreground)]">Tóm tắt</h2>
            <div className="space-y-2.5">
              <div className="theme-surface-soft flex items-center justify-between rounded-xl p-2.5">
                <span className="flex items-center gap-2.5">
                  <span className="theme-button-primary flex h-10 w-10 items-center justify-center rounded-lg">
                    <Bell className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--foreground)]">Tổng chưa đọc</span>
                    <span className="theme-text-muted text-[11px]">Thông báo chưa đọc</span>
                  </span>
                </span>
                <span className="text-2xl font-bold text-[var(--foreground)]">{unreadCount}</span>
              </div>

              {summaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.type} className="theme-surface-soft flex items-center justify-between rounded-xl p-2.5">
                    <span className="flex items-center gap-2.5">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.className}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                        <span className="theme-text-muted text-[11px]">{notificationTypeLabels[item.type]} chưa đọc</span>
                      </span>
                    </span>
                    <span className="text-2xl font-bold text-[var(--foreground)]">{unreadCounts[item.type]}</span>
                  </div>
                );
              })}

            </div>
          </section>
        </aside>
      </div>

      {isFilterOpen ? (
        <div className="theme-overlay-dim fixed inset-0 z-50 backdrop-blur-sm xl:hidden" onClick={() => setIsFilterOpen(false)}>
          <div
            className="theme-drawer-surface absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-[28px] sm:left-auto sm:right-4 sm:top-24 sm:w-[360px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Bộ lọc thông báo</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Tinh gọn giao diện và giữ bộ lọc cố định khi xem thông báo.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="theme-surface-soft inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                aria-label="Đóng bộ lọc"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="no-scrollbar h-full overflow-y-auto p-4 pb-24">
              <section className="glass-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Bộ lọc thông báo</h2>
                  {activeFilterCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTypeFilter("all");
                        setStatusFilter("all");
                        setTimeFilter("7d");
                      }}
                      className="text-sm font-medium text-[var(--info)] hover:underline"
                    >
                      Đặt lại
                    </button>
                  ) : (
                    <SlidersHorizontal className="h-4 w-4 text-[var(--primary)]" />
                  )}
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="theme-input-label mb-1.5 block text-xs font-medium">Loại thông báo</span>
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "all" | NotificationType)} className="input-dark py-2 text-sm">
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>

                  <div>
                    <span className="theme-input-label mb-1.5 block text-xs font-medium">Trạng thái</span>
                    <div className="theme-surface-soft grid grid-cols-3 overflow-hidden rounded-xl">
                      {[
                        ["all", "Tất cả"],
                        ["unread", "Chưa đọc"],
                        ["read", "Đã đọc"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setStatusFilter(value as StatusFilter)}
                          className={`px-2 py-2 text-xs font-medium transition ${
                            statusFilter === value ? "theme-button-primary" : "text-[var(--secondary-foreground)] hover:bg-[var(--hover)]"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="block">
                    <span className="theme-input-label mb-1.5 block text-xs font-medium">Khoảng thời gian</span>
                    <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeFilter)} className="input-dark py-2 text-sm">
                      <option value="7d">7 ngày qua</option>
                      <option value="30d">30 ngày qua</option>
                      <option value="all">Tất cả thời gian</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="btn-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
                  >
                    <Filter className="h-4.5 w-4.5" />
                    Xong
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
