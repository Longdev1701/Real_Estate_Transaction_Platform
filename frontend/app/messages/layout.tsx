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
  const [typingConversationIds, setTypingConversationIds] = useState<string[]>([]);
  const typingTimeoutsRef = useRef<Record<string, number>>({});

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

      const activeConversationId = pathname?.split("/messages/")[1];
      const processConvs = (convs: typeof data.data.conversations) =>
        convs.map((c: any) =>
          c.id === activeConversationId ? { ...c, _count: { messages: 0 } } : c
        );

      if (isLoadMore) {
        setConversations((prev) => processConvs([...prev, ...data.data.conversations]));
      } else {
        setConversations(processConvs(data.data.conversations));
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
        if (index === -1) {
          // Fetch this single new conversation in the background and prepend it
          setTimeout(() => {
            api.get(`/conversations/${message.conversationId}/messages?limit=1`)
              .then(({ data }) => {
                const newConv = data.data.conversation;
                const isIncoming = message.senderId !== user?.id;
                const isActiveConversation = pathname === `/messages/${message.conversationId}`;
                
                const conversationItem: ConversationListItem = {
                  ...newConv,
                  messages: [message],
                  _count: {
                    messages: isActiveConversation ? 0 : isIncoming ? 1 : 0
                  }
                };

                setConversations((currentList) => {
                  if (currentList.some((c) => c.id === message.conversationId)) return currentList;
                  return [conversationItem, ...currentList];
                });
              })
              .catch(console.error);
          }, 0);

          return prev;
        }

        const conversation = prev[index];
        const isIncoming = message.senderId !== user?.id;
        const isActiveConversation = pathname === `/messages/${message.conversationId}`;
        const updatedConversation = {
          ...conversation,
          messages: [message],
          _count: {
            messages: isActiveConversation ? 0 : isIncoming ? conversation._count.messages + 1 : conversation._count.messages,
          },
        };

        const newConversations = [...prev];
        newConversations.splice(index, 1);
        newConversations.unshift(updatedConversation);
        return newConversations;
      });
    };

    const markConversationTyping = (conversationId: string) => {
      setTypingConversationIds((prev) => (prev.includes(conversationId) ? prev : [...prev, conversationId]));

      const existingTimeout = typingTimeoutsRef.current[conversationId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      typingTimeoutsRef.current[conversationId] = window.setTimeout(() => {
        setTypingConversationIds((prev) => prev.filter((id) => id !== conversationId));
        delete typingTimeoutsRef.current[conversationId];
      }, 2500);
    };

    const clearConversationTyping = (conversationId: string) => {
      const existingTimeout = typingTimeoutsRef.current[conversationId];
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
        delete typingTimeoutsRef.current[conversationId];
      }

      setTypingConversationIds((prev) => prev.filter((id) => id !== conversationId));
    };

    const handleUserTyping = (data: { conversationId: string; userId: string }) => {
      if (data.userId === user?.id) return;
      markConversationTyping(data.conversationId);
    };

    const handleUserStopTyping = (data: { conversationId: string; userId: string }) => {
      if (data.userId === user?.id) return;
      clearConversationTyping(data.conversationId);
    };

    const handleMessagesRead = (data: { conversationId: string; userId: string }) => {
      // Nếu userId là id của mình, tức là mình (hoặc thiết bị khác của mình) đã đọc tin nhắn
      if (data.userId === user?.id) {
        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.id === data.conversationId
              ? { ...conversation, _count: { messages: 0 } }
              : conversation
          )
        );
      }
    };

    const handleConversationCreated = (data: { conversation: any }) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === data.conversation.id)) return prev;

        const conversationItem: ConversationListItem = {
          ...data.conversation,
          messages: [],
          _count: { messages: 0 }
        };
        return [conversationItem, ...prev];
      });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_created", handleConversationCreated);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("messages_read", handleMessagesRead);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_created", handleConversationCreated);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("messages_read", handleMessagesRead);
    };
  }, [isConnected, pathname, socket, user]);

  useEffect(() => {
    return () => {
      Object.values(typingTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
      typingTimeoutsRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!pathname?.startsWith("/messages/")) return;

    const conversationId = pathname.split("/messages/")[1];
    if (!conversationId) return;

    setConversations((prev) => {
      // If the conversation is not in the list yet (e.g. just created), fetch it in the background
      const hasConversation = prev.some((c) => c.id === conversationId);
      if (!hasConversation && !loading) {
        setTimeout(() => {
          api.get(`/conversations/${conversationId}/messages?limit=1`)
            .then(({ data }) => {
              const newConv = data.data.conversation;
              const conversationItem: ConversationListItem = {
                ...newConv,
                messages: data.data.messages.slice(-1),
                _count: { messages: 0 }
              };
              setConversations((currentList) => {
                if (currentList.some((c) => c.id === conversationId)) return currentList;
                return [conversationItem, ...currentList];
              });
            })
            .catch(console.error);
        }, 0);
      }

      return prev.map((conversation) =>
        conversation.id === conversationId && conversation._count.messages > 0
          ? { ...conversation, _count: { messages: 0 } }
          : conversation,
      );
    });
  }, [pathname, loading]);

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
    <div className={`mx-auto max-w-[1520px] p-0 md:p-2.5 lg:p-4 ${pathname === "/messages" ? "h-[calc(100%-64px)] md:h-full" : "h-full"}`}>
      <div className="theme-message-shell flex h-full overflow-hidden rounded-none border-none md:rounded-[26px] md:border md:border-[var(--accent-border)]">
        <aside className="theme-message-rail hidden w-[84px] flex-col justify-between border-r border-[var(--border)] px-3 py-5 md:flex">
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
                      ? "theme-message-nav-active"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    }`}
                  aria-label={item.label}
                  title={item.label}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-[16px] border ${isActive ? "border-[var(--accent-border)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-muted)]"
                      }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="theme-message-popover pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] opacity-0 transition group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-2.5">
            <button
              className="group relative flex w-full items-center justify-center rounded-[20px] px-2 py-3 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Thông báo"
              title="Thông báo"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)]">
                <Bell className="h-[18px] w-[18px]" />
              </span>
              <span className="theme-message-popover pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] opacity-0 transition group-hover:opacity-100">
                Thông báo
              </span>
            </button>
            <button
              className="group relative flex w-full items-center justify-center rounded-[20px] px-2 py-3 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              aria-label="Cài đặt"
              title="Cài đặt"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)]">
                <Settings className="h-[18px] w-[18px]" />
              </span>
              <span className="theme-message-popover pointer-events-none absolute left-full z-20 ml-3 whitespace-nowrap rounded-xl px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] opacity-0 transition group-hover:opacity-100">
                Cài đặt
              </span>
            </button>
          </div>
        </aside>

        <section
          className={`theme-message-sidebar min-h-0 w-full shrink-0 border-r border-[var(--border)] md:w-[350px] ${isMobileDetailView ? "hidden lg:flex" : "flex"
            } flex-col`}
        >
          <div className="border-b border-[var(--border)] px-4 py-4">
            <div className="mb-4">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-[2rem]">Tin nhắn</h1>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">Theo dõi khách hàng và bất động sản đang trao đổi.</p>
            </div>

            <div className="mb-3">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm kiếm tin nhắn, người, BĐS..."
                  className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] py-2.5 pl-10 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent-border)] focus:bg-[var(--surface)]"
                />
              </label>
            </div>

            <div className="theme-message-chip flex gap-1.5 rounded-[18px] p-1">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 rounded-[14px] px-4 py-2 text-sm transition ${activeTab === "all" ? "bg-[var(--accent-soft)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={`flex-1 rounded-[14px] px-4 py-2 text-sm transition ${activeTab === "unread" ? "bg-[var(--accent-soft)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
                  <div key={index} className="h-24 animate-pulse rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)]" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex h-full min-h-[280px] items-center justify-center px-4">
                <div className="max-w-xs text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)]">
                    <MessageSquare className="h-7 w-7 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="text-base font-medium text-[var(--foreground)]">Không có cuộc trò chuyện phù hợp</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
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
                const isTyping = typingConversationIds.includes(conversation.id);

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
                          messages: [],
                          nextCursor: null,
                        });
                      }
                    }}
                    className={`group relative mb-2.5 block rounded-[20px] border px-3.5 py-3.5 transition ${isActive
                        ? "theme-shadow-focus border-[var(--accent-border)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--surface-muted)] hover:border-[var(--accent-border)] hover:bg-[var(--surface)]"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative mt-0.5 h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--secondary-foreground)]">
                            {otherUser.fullName.charAt(0)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 pr-8">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <h3 className="truncate text-[15px] font-semibold text-[var(--foreground)]">{otherUser.fullName}</h3>
                          <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                            {formatConversationTime(lastMessage?.createdAt)}
                          </span>
                        </div>

                        <p className={`truncate text-[14px] ${isTyping ? "font-medium text-[var(--accent)]" : "text-[var(--secondary-foreground)]"}`}>
                          {isTyping ? "Đang nhập..." : formatConversationPreview(lastMessage)}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{conversation.post.title}</p>
                      </div>

                      {unreadCount > 0 && (
                        <span className="absolute right-3.5 top-2 z-10 md:right-4 md:top-auto md:bottom-4 md:translate-y-0 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-semibold text-[var(--primary-foreground)]">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}

                      <div className="absolute right-3 top-1/2 -translate-y-1/2 md:top-3 md:translate-y-0 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            setOpenConvMenuId(openConvMenuId === conversation.id ? null : conversation.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openConvMenuId === conversation.id && (
                          <div className="theme-message-popover absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-2xl p-1 shadow-lg">
                            <button
                              type="button"
                              onClick={(event) => handleDeleteConversation(event, conversation.id)}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--danger-foreground)] transition hover:bg-[var(--danger-soft)]"
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
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
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
