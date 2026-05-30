"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  FileText,
  Home,
  MessageSquare,
  MoreVertical,
  Scale,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";

export interface ConversationListItem {
  id: string;
  buyer: { id: string; fullName: string; avatarUrl: string | null };
  seller: { id: string; fullName: string; avatarUrl: string | null };
  post: { id: string; title: string; price: number; images: { imageUrl: string }[] };
  messages: { id: string; content: string; createdAt: string; messageType: string; isRead: boolean }[];
  _count: { messages: number };
}

const navItems = [
  { href: "/", label: "Trang chủ", icon: Home },
  { href: "/posts", label: "Tin đăng", icon: FileText },
  { href: "/messages", label: "Tin nhắn", icon: MessageSquare },
  { href: "/compare", label: "So sánh", icon: Scale },
];

function formatConversationTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay = now.toDateString() === date.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) {
    return date.toLocaleDateString("vi-VN", { weekday: "short" });
  }

  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatConversationPreview(message?: ConversationListItem["messages"][number]) {
  if (!message) return "Bắt đầu cuộc trò chuyện";
  if (message.messageType === "IMAGE") return "Đã gửi hình ảnh";

  const plainText = message.content.replace(/\s+/g, " ").trim();
  return plainText || "Tin nhắn trống";
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated } = useAuthStore();
  const { socket, isConnected } = useSocketStore();
  const router = useRouter();
  const pathname = usePathname();

  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/auth/login");
    }
  }, [hasHydrated, router, user]);

  const fetchConversations = async (pageNum: number, isLoadMore = false) => {
    try {
      if (!isLoadMore) setLoading(true);
      else setIsLoadingMore(true);

      const { data } = await api.get(`/conversations?page=${pageNum}&limit=20`);

      if (isLoadMore) {
        setConversations((prev) => [...prev, ...data.data.conversations]);
      } else {
        setConversations(data.data.conversations);
      }
      setHasMore(data.data.pagination?.hasMore ?? false);
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations(1, false);
      setPage(1);
    }
  }, [user]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleReceiveMessage = (message: any) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === message.conversationId);
        if (index === -1) return prev; // Optionally fetch if not found

        const conversation = prev[index];
        const isIncoming = message.senderId !== user?.id;
        const updatedConversation = {
          ...conversation,
          messages: [message],
          _count: {
            messages: isIncoming ? conversation._count.messages + 1 : conversation._count.messages,
          },
        };

        const newConversations = [...prev];
        newConversations.splice(index, 1);
        newConversations.unshift(updatedConversation);
        return newConversations;
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [isConnected, socket, user]);

  useEffect(() => {
    if (!pathname?.startsWith("/messages/")) return;

    const conversationId = pathname.split("/messages/")[1];
    if (!conversationId) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId && conversation._count.messages > 0
          ? { ...conversation, _count: { messages: 0 } }
          : conversation,
      ),
    );
  }, [pathname]);

  const filteredConversations = useMemo(() => {
    if (!user) return [];
    return conversations.filter((conversation) => {
      const otherUser = conversation.buyer.id === user.id ? conversation.seller : conversation.buyer;
      const matchesSearch =
        otherUser.fullName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        conversation.post.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || conversation._count.messages > 0;
      return matchesSearch && matchesTab;
    });
  }, [conversations, debouncedSearchQuery, activeTab, user]);

  if (!hasHydrated || !user) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasMore && !isLoadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchConversations(nextPage, true);
    }
  };

  const isMobileDetailView = pathname !== "/messages";

  const handleDeleteConversation = async (event: React.MouseEvent, conversationId: string) => {
    event.preventDefault();

    if (!window.confirm("Xóa đoạn chat này?")) {
      setOpenConvMenuId(null);
      return;
    }

    try {
      await api.delete(`/conversations/${conversationId}`);
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
      if (pathname === `/messages/${conversationId}`) {
        router.push("/messages");
      }
    } catch (error) {
      console.error("Failed to delete conversation", error);
    }

    setOpenConvMenuId(null);
  };

  return (
    <div className="mx-auto h-full max-w-[1520px] p-2.5 lg:p-4">
      <div className="flex h-full overflow-hidden rounded-[26px] border border-blue-400/20 bg-[#061126] shadow-[0_20px_70px_rgba(2,6,23,0.58)]">
        <aside className="hidden w-[84px] flex-col justify-between border-r border-white/10 bg-[linear-gradient(180deg,rgba(12,23,49,0.98),rgba(5,14,31,0.98))] px-3 py-5 md:flex">
          <div className="space-y-2.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/messages" ? pathname?.startsWith("/messages") : pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-center rounded-[20px] px-2 py-3 transition ${isActive
                      ? "bg-[linear-gradient(135deg,rgba(64,86,255,0.24),rgba(130,91,255,0.2))] text-white shadow-[0_0_0_1px_rgba(129,140,248,0.45),0_16px_40px_rgba(79,70,229,0.25)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-[16px] border ${isActive ? "border-blue-300/40 bg-white/10" : "border-white/10 bg-white/[0.03]"
                      }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl border border-white/10 bg-[#13213b] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <button
              className="group relative flex w-full items-center justify-center rounded-[20px] px-2 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Thông báo"
              title="Thông báo"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03]">
                <Bell className="h-[18px] w-[18px]" />
              </span>
              <span className="pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl border border-white/10 bg-[#13213b] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100">
                Thông báo
              </span>
            </button>
            <button
              className="group relative flex w-full items-center justify-center rounded-[20px] px-2 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
              aria-label="Cài đặt"
              title="Cài đặt"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03]">
                <Settings className="h-[18px] w-[18px]" />
              </span>
              <span className="pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl border border-white/10 bg-[#13213b] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition group-hover:opacity-100">
                Cài đặt
              </span>
            </button>
          </div>
        </aside>

        <section
          className={`min-h-0 w-full shrink-0 border-r border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.96),rgba(6,18,37,0.98))] md:w-[350px] ${isMobileDetailView ? "hidden lg:flex" : "flex"
            } flex-col`}
        >
          <div className="border-b border-white/10 px-4 py-4">
            <div className="mb-4">
              <h1 className="text-[2rem] font-semibold tracking-tight text-white">Tin nhắn</h1>
              <p className="mt-1 text-sm text-slate-400">Theo dõi khách hàng và bất động sản đang trao đổi.</p>
            </div>

            <div className="mb-3 flex items-center gap-2.5">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm kiếm tin nhắn, người, BĐS..."
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/40 focus:bg-white/[0.06]"
                />
              </label>
              <button className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
                <SlidersHorizontal className="h-[18px] w-[18px]" />
              </button>
            </div>

            <div className="flex gap-1.5 rounded-[18px] border border-white/10 bg-[#09172f] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 rounded-[14px] px-4 py-2 text-sm transition ${activeTab === "all" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`flex-1 rounded-[14px] px-4 py-2 text-sm transition ${activeTab === "unread" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
              >
                Chưa đọc
              </button>
            </div>
          </div>

          <div
            className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-2.5"
            onScroll={handleScroll}
          >
            {loading ? (
              <div className="space-y-3 px-2 py-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.03]" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full min-h-[280px] items-center justify-center px-4">
                <div className="max-w-xs text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.04]">
                    <MessageSquare className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-base font-medium text-white">Không có cuộc trò chuyện phù hợp</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Thử tìm theo tên người dùng hoặc tiêu đề bất động sản.
                  </p>
                </div>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const otherUser = conversation.buyer.id === user.id ? conversation.seller : conversation.buyer;
                const lastMessage = conversation.messages[0];
                const isActive = pathname === `/messages/${conversation.id}`;
                const unreadCount = conversation._count.messages;

                return (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    onMouseEnter={() => {
                      const cacheKey = `messages_${conversation.id}`;
                      if (!readSessionCache(cacheKey)) {
                        api.get(`/conversations/${conversation.id}/messages?limit=20`)
                          .then(({ data }) => {
                            writeSessionCache(cacheKey, {
                              messages: data.data.messages,
                              conversation: data.data.conversation,
                              nextCursor: data.data.nextCursor,
                            });
                          })
                          .catch(() => { });
                      }
                    }}
                    onClick={() => {
                      const cacheKey = `messages_${conversation.id}`;
                      if (!readSessionCache(cacheKey)) {
                        writeSessionCache(cacheKey, {
                          conversation: {
                            id: conversation.id,
                            buyer: conversation.buyer,
                            seller: conversation.seller,
                            post: conversation.post,
                          },
                          messages: conversation.messages || [],
                          nextCursor: null,
                        });
                      }
                    }}
                    className={`group relative mb-2.5 block overflow-hidden rounded-[20px] border px-3.5 py-3.5 transition ${isActive
                        ? "border-blue-400/50 bg-[linear-gradient(135deg,rgba(41,78,220,0.22),rgba(122,77,255,0.16))] shadow-[0_12px_40px_rgba(59,130,246,0.18)]"
                        : "border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-300">
                            {otherUser.fullName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pr-8">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <h3 className="truncate text-[15px] font-semibold text-white">{otherUser.fullName}</h3>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatConversationTime(lastMessage?.createdAt)}
                          </span>
                        </div>

                        <p className="truncate text-[14px] text-slate-300">{formatConversationPreview(lastMessage)}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{conversation.post.title}</p>
                      </div>

                      {unreadCount > 0 && (
                        <span className="absolute bottom-4 right-4 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-semibold text-white">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}

                      <div className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            setOpenConvMenuId(openConvMenuId === conversation.id ? null : conversation.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:text-white"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openConvMenuId === conversation.id && (
                          <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#13213b] p-1 shadow-2xl">
                            <button
                              type="button"
                              onClick={(event) => handleDeleteConversation(event, conversation.id)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                              Xóa đoạn chat
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}

            {isLoadingMore && (
              <div className="py-4 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              </div>
            )}
          </div>
        </section>

        <section className={`min-w-0 flex-1 ${!isMobileDetailView ? "hidden lg:flex" : "flex"} flex-col`}>
          {children}
        </section>
      </div>
    </div>
  );
}
