"use client";

import { forwardRef, memo, useEffect, useLayoutEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Image as ImageIcon,
  Info,
  MapPin,
  Mic,
  MoreVertical,
  Phone,
  Send,
  Smile,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import dynamic from "next/dynamic";
import { Theme } from "emoji-picker-react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

import { api } from "@/lib/api";
import { useSound } from "@/hooks/useSound";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";

type Message = {
  isHistory?: boolean;
  isOptimistic?: boolean;
  uploadState?: "uploading";
  tempId?: string;
  id: string;
  senderId: string;
  content: string;
  messageType: "TEXT" | "IMAGE";
  createdAt: string;
  isRead?: boolean;
  isEdited?: boolean;
};

type ConversationData = {
  id: string;
  buyer: { id: string; fullName: string; avatarUrl: string | null };
  seller: { id: string; fullName: string; avatarUrl: string | null };
  post: {
    id: string;
    title: string;
    price: number;
    area: number;
    propertyType: string;
    city: string;
    images: { imageUrl: string }[];
  };
};

type SharedAsset = {
  id: string;
  url: string;
  createdAt: string;
};

type CachedConversationPayload = {
  messages: Message[];
  conversation: ConversationData | null;
  nextCursor: string | null;
};

const MESSAGES_CACHE_PREFIX = "messages_";
const MESSAGES_CACHE_TTL_MS = 5 * 60 * 1000;
const MARK_READ_DEBOUNCE_MS = 350;
const INITIAL_FIRST_ITEM_INDEX = 100000;
const DEFAULT_MESSAGE_ITEM_HEIGHT = 92;
const CACHE_WRITE_DEBOUNCE_MS = 150;
const MAX_CACHED_MESSAGES = 120;

const parseImages = (content: string): string[] => {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [content];
  } catch {
    return [content];
  }
};

function formatPrice(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")} tỉ`;
  return `${value} triệu`;
}

function formatMessageDayLabel(value: string) {
  const date = new Date(value);
  if (isToday(date)) return `Hôm nay, ${format(date, "dd/MM", { locale: vi })}`;
  if (isYesterday(date)) return `Hôm qua, ${format(date, "dd/MM", { locale: vi })}`;
  return format(date, "dd/MM/yyyy", { locale: vi });
}

function formatMessageTime(value: string) {
  return format(new Date(value), "HH:mm");
}

function getFileLabel(index: number) {
  return `Hình ảnh ${String(index + 1).padStart(2, "0")}`;
}

function getMessagesCacheKey(conversationId: string) {
  return `${MESSAGES_CACHE_PREFIX}${conversationId}`;
}

function readCachedConversation(conversationId: string) {
  return readSessionCache<CachedConversationPayload>(getMessagesCacheKey(conversationId));
}

function createClientMessageId() {
  return `msg_client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getLatestUnreadIncomingMessageId(messages: Message[], currentUserId: string) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.senderId !== currentUserId && !message.isRead) {
      return message.id;
    }
  }

  return null;
}

function FallbackMedia({
  src,
  alt,
  className,
  wrapperClassName,
}: {
  src?: string | null;
  alt: string;
  className: string;
  wrapperClassName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`flex items-center justify-center bg-[var(--surface-muted)] text-[var(--muted-foreground)] ${wrapperClassName}`}>
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} />;
}

function clampAspectRatio(value: number) {
  return Math.min(1.8, Math.max(0.72, value));
}

function ChatImageTile({
  src,
  alt,
  onClick,
  className,
  wrapperClassName,
}: {
  src: string;
  alt: string;
  onClick: () => void;
  className: string;
  wrapperClassName: string;
}) {
  const [aspectRatio, setAspectRatio] = useState<number>(1.18);

  useEffect(() => {
    let cancelled = false;

    const image = new window.Image();
    image.onload = () => {
      if (cancelled || !image.naturalWidth || !image.naturalHeight) return;
      setAspectRatio(clampAspectRatio(image.naturalWidth / image.naturalHeight));
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={wrapperClassName}
      style={{ aspectRatio }}
    >
      <FallbackMedia src={src} alt={alt} className={className} wrapperClassName="h-full w-full" />
    </button>
  );
}

const VirtuosoScroller = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  ({ className = "", style, ...props }, ref) => (
    <div
      {...props}
      ref={ref}
      className={`no-scrollbar ${className}`}
      style={{
        ...style,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    />
  ),
);

VirtuosoScroller.displayName = "VirtuosoScroller";

export default function ChatWindow({ params }: { params: Promise<{ conversationId: string }> }) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;
  const { user, hasHydrated } = useAuthStore();
  const { socket, isConnected } = useSocketStore();
  const { playPop, playDing } = useSound();
  const router = useRouter();
  const userId = user?.id ?? null;

  const initialCachedConversation = typeof window !== "undefined" ? readCachedConversation(conversationId) : null;
  const [messages, setMessages] = useState<Message[]>(() => initialCachedConversation?.messages || []);
  const [conversation, setConversation] = useState<ConversationData | null>(() => initialCachedConversation?.conversation || null);
  const [hasMoreMessages, setHasMoreMessages] = useState(() => !!initialCachedConversation?.nextCursor);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(() => initialCachedConversation?.nextCursor || null);
  const [inputValue, setInputValue] = useState("");
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [canScrollPreview, setCanScrollPreview] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
  const [firstItemIndex, setFirstItemIndex] = useState(INITIAL_FIRST_ITEM_INDEX);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cacheWriteTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const unreadPendingReadRef = useRef(false);
  const pendingReadMessageIdRef = useRef<string | null>(null);
  const lastMarkedMessageIdRef = useRef<string | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const isAtBottomRef = useRef(true);
  const initialPositionSettledRef = useRef(false);
  const bottomSnapInProgressRef = useRef(false);
  const bottomSnapTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const checkScrollablePreview = () => {
      if (!previewScrollRef.current) return;
      const { scrollWidth, clientWidth } = previewScrollRef.current;
      setCanScrollPreview(scrollWidth > clientWidth);
    };

    checkScrollablePreview();
    window.addEventListener("resize", checkScrollablePreview);
    return () => window.removeEventListener("resize", checkScrollablePreview);
  }, [imagePreviewUrls]);

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/auth/login");
    }
  }, [hasHydrated, router, user]);

  useEffect(() => {
    const cached = readCachedConversation(conversationId);

    setMessages(cached?.messages || []);
    setConversation(cached?.conversation || null);
    setNextCursor(cached?.nextCursor || null);
    setHasMoreMessages(!!cached?.nextCursor);
    setFirstItemIndex(INITIAL_FIRST_ITEM_INDEX);
    shouldStickToBottomRef.current = true;
    isAtBottomRef.current = true;
    initialPositionSettledRef.current = false;
    bottomSnapInProgressRef.current = false;
    unreadPendingReadRef.current = false;
    pendingReadMessageIdRef.current = null;
    lastMarkedMessageIdRef.current = null;

    setSelectedImages([]);
    setImagePreviewUrls([]);
    setInputValue("");
    setEditingMessageId(null);
    setOpenMenuId(null);
    setMenuPosition(null);
    setIsDetailsPanelOpen(false);
    setShowScrollButton(false);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    if (!conversation) return;

    if (cacheWriteTimeoutRef.current) {
      clearTimeout(cacheWriteTimeoutRef.current);
    }

    cacheWriteTimeoutRef.current = setTimeout(() => {
      writeSessionCache(
        getMessagesCacheKey(conversationId),
        {
          messages: messages.slice(-MAX_CACHED_MESSAGES),
          conversation,
          nextCursor,
        },
        { ttlMs: MESSAGES_CACHE_TTL_MS },
      );
    }, CACHE_WRITE_DEBOUNCE_MS);
  }, [conversation, conversationId, messages, nextCursor]);

  useEffect(() => {
    return () => {
      if (cacheWriteTimeoutRef.current) {
        clearTimeout(cacheWriteTimeoutRef.current);
      }
      if (markReadTimeoutRef.current) {
        clearTimeout(markReadTimeoutRef.current);
      }
      bottomSnapTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      bottomSnapTimeoutsRef.current = [];
    };
  }, []);

  const scheduleMarkAsRead = () => {
    if (!conversationId) return;

    if (markReadTimeoutRef.current) {
      clearTimeout(markReadTimeoutRef.current);
    }

    markReadTimeoutRef.current = setTimeout(() => {
      api.patch(`/conversations/${conversationId}/read`).catch(console.error);
      if (socket && isConnected) {
        socket.emit("mark_read", { conversationId });
      }
      if (pendingReadMessageIdRef.current) {
        lastMarkedMessageIdRef.current = pendingReadMessageIdRef.current;
        pendingReadMessageIdRef.current = null;
      }
      unreadPendingReadRef.current = false;
    }, MARK_READ_DEBOUNCE_MS);
  };

  const snapToBottom = (behavior: "auto" | "smooth" = "auto") => {
    if (messages.length === 0) return;

    bottomSnapTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    bottomSnapTimeoutsRef.current = [];

    bottomSnapInProgressRef.current = true;
    initialPositionSettledRef.current = false;
    shouldStickToBottomRef.current = true;
    isAtBottomRef.current = true;
    setShowScrollButton(false);

    const runSnap = (nextBehavior: "auto" | "smooth") => {
      virtuosoRef.current?.scrollTo({
        top: Number.MAX_SAFE_INTEGER,
        behavior: nextBehavior,
      });
    };

    runSnap(behavior);

    [80, 180].forEach((delay) => {
      const timeoutId = window.setTimeout(() => {
        runSnap("auto");
      }, delay);
      bottomSnapTimeoutsRef.current.push(timeoutId);
    });

    const settleTimeoutId = window.setTimeout(() => {
      bottomSnapInProgressRef.current = false;
      initialPositionSettledRef.current = true;
      shouldStickToBottomRef.current = true;
      isAtBottomRef.current = true;
      setShowScrollButton(false);
      bottomSnapTimeoutsRef.current = [];
    }, 260);
    bottomSnapTimeoutsRef.current.push(settleTimeoutId);
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoadError(null);
        const currentUserId = userId;

        if (!currentUserId) {
          return;
        }

        const cachedData = readCachedConversation(conversationId);

        if (cachedData) {
          setMessages(cachedData.messages);
          setConversation(cachedData.conversation);
          setNextCursor(cachedData.nextCursor);
          setHasMoreMessages(!!cachedData.nextCursor);
        }

        const { data } = await api.get(`/conversations/${conversationId}/messages?limit=20`);

        setMessages(data.data.messages);
        setConversation(data.data.conversation);
        setNextCursor(data.data.nextCursor);
        setHasMoreMessages(!!data.data.nextCursor);
        pendingReadMessageIdRef.current = getLatestUnreadIncomingMessageId(
          data.data.messages,
          currentUserId,
        );
        unreadPendingReadRef.current = Boolean(pendingReadMessageIdRef.current);
        requestAnimationFrame(() => snapToBottom("auto"));
        scheduleMarkAsRead();
      } catch (error) {
        console.error("Failed to fetch messages", error);
        setLoadError("Không thể tải cuộc trò chuyện này.");
      }
    };

    if (userId) {
      fetchMessages();
    }
  }, [conversationId, userId]);

  const loadMoreMessages = async () => {
    if (!nextCursor || isLoadingMoreMessages || !hasMoreMessages) return;

    try {
      setIsLoadingMoreMessages(true);
      shouldStickToBottomRef.current = false;

      const { data } = await api.get(`/conversations/${conversationId}/messages?cursor=${nextCursor}&limit=20`);

      setFirstItemIndex((prev) => prev - data.data.messages.length);
      setMessages((prev) => [...data.data.messages, ...prev]);
      setNextCursor(data.data.nextCursor);
      setHasMoreMessages(!!data.data.nextCursor);
    } catch (error) {
      console.error("Failed to load more messages", error);
    } finally {
      setIsLoadingMoreMessages(false);
    }
  };

  useEffect(() => {
    if (!socket || !isConnected || !conversation || !user || !conversation.buyer || !conversation.seller) return;

    const otherUserId = conversation.buyer.id === user.id ? conversation.seller.id : conversation.buyer.id;

    const handleOnlineStatusResult = (data: { userId: string; isOnline: boolean }) => {
      if (data.userId === otherUserId) setIsOtherUserOnline(data.isOnline);
    };

    const handleUserOnline = (userId: string) => {
      if (userId === otherUserId) setIsOtherUserOnline(true);
    };

    const handleUserOffline = (userId: string) => {
      if (userId === otherUserId) setIsOtherUserOnline(false);
    };

    const handleUserTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setOtherUserTyping(true);
      }
    };

    const handleUserStopTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setOtherUserTyping(false);
      }
    };

    const handleMessagesRead = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === conversationId && data.userId !== user.id) {
        setMessages((prev) => prev.map((message) => ({ ...message, isRead: true })));
      }
    };

    const handleReceiveMessage = (message: Message) => {
      setOtherUserTyping(false);
      setMessages((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === message.id || (message.tempId && item.id === message.tempId),
        );

        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = {
            ...message,
            isOptimistic: false,
            uploadState: undefined,
          };
          return next;
        }

        if (message.senderId !== user.id) {
          playDing();
        }

        return [
          ...prev,
          {
            ...message,
            isOptimistic: false,
            uploadState: undefined,
          },
        ];
      });

      const isAtBottom = isAtBottomRef.current;

        if (message.senderId !== user.id && !isAtBottom) {
          pendingReadMessageIdRef.current = message.id;
          unreadPendingReadRef.current = true;
          setUnreadCount((prev) => prev + 1);
        } else {
          shouldStickToBottomRef.current = true;
          if (message.senderId !== user.id) {
            pendingReadMessageIdRef.current = message.id;
            unreadPendingReadRef.current = true;
          }
          scheduleMarkAsRead();
        }
      };

    const handleMessageEdited = (updatedMessage: Message) => {
      setMessages((prev) => prev.map((message) => (message.id === updatedMessage.id ? updatedMessage : message)));
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => prev.filter((message) => message.id !== data.messageId));
      }
    };

    const handleConversationDeleted = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        router.push("/messages");
      }
    };

    const handleSocketError = (error: { message?: string; tempId?: string }) => {
      if (!error.tempId) return;

      setMessages((prev) => prev.filter((message) => message.id !== error.tempId));
      window.alert(error.message || "Không thể gửi tin nhắn. Vui lòng thử lại.");
    };

    socket.emit("join_room", conversationId);
    socket.emit("check_online_status", otherUserId);

    socket.on("online_status_result", handleOnlineStatusResult);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("messages_read", handleMessagesRead);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("conversation_deleted", handleConversationDeleted);
    socket.on("error", handleSocketError);

    return () => {
      socket.off("online_status_result", handleOnlineStatusResult);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("messages_read", handleMessagesRead);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("conversation_deleted", handleConversationDeleted);
      socket.off("error", handleSocketError);
    };
  }, [conversation, conversationId, isConnected, playDing, router, socket, user]);

  useLayoutEffect(() => {
    if (shouldStickToBottomRef.current && messages.length > 0) {
      snapToBottom("auto");
    }
  }, [messages.length]);

  useLayoutEffect(() => {
    if (!messages.length) return;
    if (!isAtBottomRef.current && !shouldStickToBottomRef.current) return;

    requestAnimationFrame(() => {
      snapToBottom("auto");
    });
  }, [messages.length, otherUserTyping]);

  const handleBottomStateChange = (isAtBottom: boolean) => {
    isAtBottomRef.current = isAtBottom;
    shouldStickToBottomRef.current = isAtBottom;

    if (bottomSnapInProgressRef.current) {
      setShowScrollButton(false);
      return;
    }

    if (!initialPositionSettledRef.current) {
      if (isAtBottom) {
        setShowScrollButton(false);
      }
      return;
    }

    setShowScrollButton(!isAtBottom);

    if (isAtBottom && unreadPendingReadRef.current) {
      setUnreadCount(0);
      scheduleMarkAsRead();
    }
  };

  const scrollToBottom = () => {
    snapToBottom("smooth");
    setUnreadCount(0);
    if (unreadPendingReadRef.current) {
      scheduleMarkAsRead();
    }
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setInputValue(message.content);
    setOpenMenuId(null);
    setMenuPosition(null);
    textInputRef.current?.focus();
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Thu hồi tin nhắn này?")) {
      socket?.emit("delete_message", { messageId, conversationId });
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }

    setOpenMenuId(null);
    setMenuPosition(null);
  };

  const handleToggleMessageMenu = (messageId: string, trigger: HTMLButtonElement) => {
    if (openMenuId === messageId) {
      setOpenMenuId(null);
      setMenuPosition(null);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setOpenMenuId(messageId);
    setMenuPosition({
      top: rect.top - 8,
      right: window.innerWidth - rect.right,
    });
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((!inputValue.trim() && selectedImages.length === 0) || !socket) return;

    const textContent = inputValue.trim();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { conversationId });
    shouldStickToBottomRef.current = true;
    setShowScrollButton(false);

    if (editingMessageId) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === editingMessageId ? { ...message, content: textContent, isEdited: true } : message,
        ),
      );

      socket.emit("edit_message", {
        messageId: editingMessageId,
        conversationId,
        content: textContent,
      });

      setEditingMessageId(null);
      setInputValue("");
      return;
    }

    if (selectedImages.length > 0) {
      setIsUploading(true);
      const tempId = createClientMessageId();
      const optimisticContent = JSON.stringify(imagePreviewUrls);

      try {
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            tempId,
            senderId: user!.id,
            content: optimisticContent,
            messageType: "IMAGE",
            createdAt: new Date().toISOString(),
            isOptimistic: true,
            uploadState: "uploading",
          },
        ]);

        const uploadPromises = selectedImages.map(async (file) => {
          const formData = new FormData();
          formData.append("image", file);

          const { data } = await api.post(`/conversations/${conversationId}/images`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          return data.data.imageUrl as string;
        });

        const imageUrls = await Promise.all(uploadPromises);
        const content = JSON.stringify(imageUrls);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempId
              ? {
                  ...message,
                  content,
                  uploadState: undefined,
                }
              : message,
          ),
        );

        socket.emit("send_message", {
          conversationId,
          content,
          messageType: "IMAGE",
          tempId,
        });

        setSelectedImages([]);
        setImagePreviewUrls([]);
      } catch (error) {
        console.error("Upload failed", error);
        window.alert("Tải ảnh thất bại. Vui lòng thử lại.");
        setMessages((prev) => prev.filter((message) => message.id !== tempId));
      } finally {
        setIsUploading(false);
      }
    }

    if (textContent) {
      const tempId = createClientMessageId();

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          tempId,
          senderId: user!.id,
          content: textContent,
          messageType: "TEXT",
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        },
      ]);

      socket.emit("send_message", {
        conversationId,
        content: textContent,
        messageType: "TEXT",
        tempId,
      });
    }

    setInputValue("");
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    playPop();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);

    if (!socket || !isConnected) return;

    socket.emit("typing", { conversationId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { conversationId });
    }, 2000);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    let validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      window.alert("Một số ảnh bị bỏ qua do vượt quá 5MB.");
    }

    if (selectedImages.length + validFiles.length > 10) {
      window.alert("Bạn chỉ có thể chọn gửi tối đa 10 ảnh cùng lúc.");
      validFiles = validFiles.slice(0, Math.max(0, 10 - selectedImages.length));
    }

    if (validFiles.length > 0) {
      setSelectedImages((prev) => [...prev, ...validFiles]);
      setImagePreviewUrls((prev) => [...prev, ...validFiles.map((file) => URL.createObjectURL(file))]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedImage = (index: number) => {
    const removed = imagePreviewUrls[index];
    if (removed) URL.revokeObjectURL(removed);

    setSelectedImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setImagePreviewUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const scrollPreview = (direction: "left" | "right") => {
    previewScrollRef.current?.scrollBy({
      left: direction === "left" ? -220 : 220,
      behavior: "smooth",
    });
  };

  if (!hasHydrated || !user || !conversation || !conversation.buyer || !conversation.seller || !conversation.post) {
    if (hasHydrated && user && loadError) {
      return (
        <div className="theme-message-surface flex h-full min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-[28px] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6 text-center">
            <p className="text-base text-[var(--danger-foreground)]">{loadError}</p>
            <Link
              href="/messages"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
            >
              Quay lại danh sách chat
            </Link>
          </div>
        </div>
      );
    }

    if (hasHydrated && user && (!conversation || !conversation.buyer || !conversation.seller || !conversation.post) && !loadError) {
      return (
        <div className="theme-message-surface relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[26px] border border-[var(--border)]">
          <header className="flex h-[78px] shrink-0 items-center border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 lg:px-6">
            <div className="theme-skeleton h-12 w-12 rounded-full" />
            <div className="ml-3 flex flex-col gap-2">
              <div className="theme-skeleton h-4 w-32 rounded-md" />
              <div className="theme-skeleton h-3 w-20 rounded-md" />
            </div>
          </header>
          <div className="flex flex-1 flex-col justify-end gap-6 p-6">
            <div className="flex w-full justify-end">
              <div className="theme-skeleton h-12 w-[60%] rounded-[26px] rounded-br-lg" />
            </div>
            <div className="flex w-full items-end justify-start gap-2">
              <div className="theme-skeleton h-8 w-8 rounded-full" />
              <div className="theme-skeleton h-12 w-[50%] rounded-[26px] rounded-bl-lg" />
            </div>
            <div className="flex w-full justify-end">
              <div className="theme-skeleton h-12 w-[40%] rounded-[26px] rounded-br-lg" />
            </div>
          </div>
          <div className="h-[84px] shrink-0 border-t border-[var(--border)] p-4">
            <div className="theme-skeleton h-full w-full rounded-[24px]" />
          </div>
        </div>
      );
    }

    return null;
  }

  const otherUser = conversation.buyer.id === user.id ? conversation.seller : conversation.buyer;
  const messageItems = messages.map((message, actualIndex) => ({ message, actualIndex }));
  const sharedAssets: SharedAsset[] = messages
    .filter((message) => message.messageType === "IMAGE")
    .flatMap((message) =>
      parseImages(message.content).map((url, index) => ({
        id: `${message.id}-${index}`,
        url,
        createdAt: message.createdAt,
      })),
    )
    .slice()
    .reverse();

  return (
    <div className="theme-message-surface theme-shadow-lg relative flex h-full min-h-0 flex-1 overflow-hidden overflow-x-hidden rounded-none border-none md:rounded-[26px] md:border md:border-[var(--border)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[78px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-muted)] px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/messages"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--secondary-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)] lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
              {otherUser.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--secondary-foreground)]">
                  {otherUser.fullName.charAt(0)}
                </div>
              )}
              <span
                className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)] ${isOtherUserOnline ? "bg-[var(--success)]" : "bg-[var(--muted-foreground)]"
                  }`}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[1.55rem] font-semibold tracking-tight text-[var(--foreground)]">{otherUser.fullName}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <span className={`h-2 w-2 rounded-full ${isOtherUserOnline ? "bg-[var(--success)]" : "bg-[var(--muted-foreground)]"}`} />
                <span>{isOtherUserOnline ? "online" : "offline"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => setIsDetailsPanelOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-base font-semibold text-[var(--secondary-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              !
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <Virtuoso<{ message: Message; actualIndex: number }>
            ref={virtuosoRef}
            className="no-scrollbar flex-1 overflow-x-hidden py-5 sm:px-4 lg:px-5 xl:px-6"
            data={messageItems}
            firstItemIndex={firstItemIndex}
            initialTopMostItemIndex={{ 
              index: Math.max(messageItems.length - 1, 0), 
              align: "end", 
            }}
            startReached={loadMoreMessages}
            atBottomStateChange={handleBottomStateChange}
            atBottomThreshold={80}
            alignToBottom
            defaultItemHeight={DEFAULT_MESSAGE_ITEM_HEIGHT}
            increaseViewportBy={{ top: 240, bottom: 320 }}
            followOutput={false}
            computeItemKey={(_, item) => item.message.id}
            components={{
              Scroller: VirtuosoScroller,
              Header: () => (
                <div className="w-full px-2 sm:px-0">
                  <div className="mb-6 flex items-center gap-4 text-xs font-medium text-[var(--muted-foreground)]">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span>{formatMessageDayLabel(new Date().toISOString())}</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>

                  <div className="mx-auto mb-5 w-full max-w-[20.5rem] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] shadow-[var(--shadow-strong)] sm:max-w-[22.5rem]">
                    <div className="flex flex-col gap-3 p-3">
                      <div className="theme-post-gallery h-24 w-full overflow-hidden rounded-[14px] sm:h-28">
                        <FallbackMedia
                          src={conversation.post.images[0]?.imageUrl}
                          alt={conversation.post.title}
                          className="h-full w-full object-cover"
                          wrapperClassName="h-full w-full"
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[var(--accent)] sm:text-sm">Bất động sản đang trao đổi</p>
                          <h3 className="mt-1 line-clamp-2 text-[1.05rem] font-semibold leading-tight text-[var(--foreground)] sm:text-[1.15rem]">{conversation.post.title}</h3>
                          <p className="mt-1.5 text-[1.1rem] font-semibold text-[var(--accent)] sm:text-[1.25rem]">{formatPrice(conversation.post.price)}</p>
                        </div>

                        <div className="grid gap-2 text-[13px] text-[var(--secondary-foreground)] sm:grid-cols-2">
                          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                            {conversation.post.propertyType}
                          </div>
                          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                            {conversation.post.area} m²
                          </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{conversation.post.city}</span>
                          </div>

                          <Link
                            href={`/posts/${conversation.post.id}`}
                            className="inline-flex min-h-10 w-full items-center justify-center rounded-[16px] border border-[var(--accent-border)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]"
                          >
                            Xem chi tiết
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isLoadingMoreMessages && (
                    <div className="flex justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                    </div>
                  )}
                </div>
              ),
              Footer: () => (
                <div className={`w-full overflow-hidden transition-[height] px-2 sm:px-0 duration-150 ${otherUserTyping ? "h-[72px]" : "h-0"}`}>
                  <div
                    className={`flex h-full items-end justify-start transition-opacity duration-150 ${otherUserTyping ? "opacity-100" : "opacity-0"
                      }`}
                    aria-hidden={!otherUserTyping}
                  >
                    <div className="mb-3 flex items-end gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface-muted)]">
                        {otherUser.avatarUrl ? (
                          <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--secondary-foreground)]">
                            {otherUser.fullName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 rounded-[24px] rounded-bl-lg bg-[var(--surface-muted)] px-5 py-4">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--message-typing-dot)] [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--message-typing-dot)] [animation-delay:120ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[var(--message-typing-dot)] [animation-delay:240ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            }}
            itemContent={(_, item) => {
              const { message, actualIndex } = item;
              const previousMessage = messages[actualIndex - 1];
              const nextMessage = messages[actualIndex + 1];

              const showDateDivider =
                !previousMessage ||
                new Date(message.createdAt).toDateString() !== new Date(previousMessage.createdAt).toDateString();
              const isGroupedWithPrevious =
                previousMessage &&
                previousMessage.senderId === message.senderId &&
                !showDateDivider;
              const isGroupedWithNext =
                nextMessage &&
                nextMessage.senderId === message.senderId &&
                new Date(nextMessage.createdAt).toDateString() === new Date(message.createdAt).toDateString();

              return (
                <div className="w-full overflow-x-hidden px-2 sm:px-0">
                  <MessageBubble
                    message={message}
                    index={actualIndex}
                    isMine={message.senderId === user.id}
                    otherUser={otherUser}
                    isGroupedWithPrevious={isGroupedWithPrevious}
                    isGroupedWithNext={isGroupedWithNext}
                    showDateDivider={showDateDivider}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    handleToggleMessageMenu={handleToggleMessageMenu}
                    setLightboxImage={setLightboxImage}
                    handleEditMessage={handleEditMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    isLastRead={message.senderId === user.id && actualIndex === messages.length - 1 && message.isRead}
                  />
                </div>
              );
            }}
          />

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-[7.25rem] right-1/2 translate-x-1/2 md:right-5 md:translate-x-0 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--secondary-foreground)] shadow-xl transition hover:text-[var(--foreground)]"
              >
                <ChevronRight className="h-4 w-4 rotate-90" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--primary-foreground)]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {openMenuId && menuPosition && (
            <div
              className="theme-message-popover fixed z-[90] w-40 -translate-y-full overflow-hidden rounded-2xl p-1"
              style={{ top: menuPosition.top, right: menuPosition.right }}
            >
              {messages.find((message) => message.id === openMenuId)?.messageType === "TEXT" && (
                <button
                  type="button"
                  onClick={() => {
                    const targetMessage = messages.find((message) => message.id === openMenuId);
                    if (targetMessage) {
                      handleEditMessage(targetMessage);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)]"
                >
                  <Edit2 className="h-4 w-4" />
                  Chinh sua
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDeleteMessage(openMenuId)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--danger-foreground)] transition hover:bg-[var(--danger-soft)]"
              >
                <Trash2 className="h-4 w-4" />
                Thu hoi
              </button>
            </div>
          )}

          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-muted)] px-2 py-3 md:px-4 md:py-4 lg:px-5">
            <AnimatePresence>
              {imagePreviewUrls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="theme-message-compose relative mb-3 overflow-hidden rounded-[22px] p-3"
                >
                  {canScrollPreview && (
                    <button
                      type="button"
                      onClick={() => scrollPreview("left")}
                      className="theme-surface-strong absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--foreground)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}

                  <div ref={previewScrollRef} className="no-scrollbar flex gap-3 overflow-x-auto px-1">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={url + index} className="relative shrink-0">
                        <img src={url} alt="Preview" className="h-24 w-24 rounded-2xl object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedImage(index)}
                          className="theme-surface-strong absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-[var(--foreground)]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {canScrollPreview && (
                    <button
                      type="button"
                      onClick={() => scrollPreview("right")}
                      className="theme-surface-strong absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--foreground)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="theme-message-compose rounded-[24px] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-[var(--muted-foreground)] sm:flex"
                >
                  <Mic className="h-5 w-5" />
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${selectedImages.length > 0 ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition ${showEmojiPicker ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      }`}
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <AnimatePresence>
                    {showEmojiPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 14, scale: 0.96 }}
                        className="absolute bottom-14 left-0 z-40"
                      >
                        <EmojiPicker onEmojiClick={(emoji) => setInputValue((prev) => prev + emoji.emoji)} theme={Theme.LIGHT} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative min-w-0 flex-1">
                  <input
                    ref={textInputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    disabled={isUploading}
                    placeholder={isUploading ? "Đang tải ảnh lên..." : "Nhập tin nhắn..."}
                    className="w-full border-none bg-transparent px-2 py-2.5 text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!inputValue.trim() && selectedImages.length === 0 && !editingMessageId) || isUploading}
                  className="theme-button-primary flex h-12 w-12 items-center justify-center rounded-full transition disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--primary-foreground)_40%,transparent)] border-t-[var(--primary-foreground)]" />
                  ) : editingMessageId ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isDetailsPanelOpen && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsPanelOpen(false)}
              className="theme-overlay-dim absolute inset-0 z-40 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              className="theme-message-sidebar theme-shadow-side absolute right-0 top-0 z-50 flex h-full w-full max-w-[380px] flex-col overflow-hidden border-l border-[var(--border)] p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Thông tin chat</p>
                <button
                  type="button"
                  onClick={() => setIsDetailsPanelOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--secondary-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4 pb-1">
                  <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
                    <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                      {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-[var(--secondary-foreground)]">
                          {otherUser.fullName.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[var(--surface)] ${isOtherUserOnline ? "bg-[var(--success)]" : "bg-[var(--muted-foreground)]"
                          }`}
                      />
                    </div>

                    <h3 className="mt-5 text-3xl font-semibold text-[var(--foreground)]">{otherUser.fullName}</h3>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Chủ tin đăng</p>

                    <div className="mt-6">
                      <button className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-4 text-center text-xs text-[var(--secondary-foreground)] transition hover:bg-[var(--surface)]">
                        <Info className="mx-auto mb-2 h-5 w-5" />
                        Hồ sơ
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                    <p className="text-lg font-semibold text-[var(--foreground)]">Bất động sản đang trao đổi</p>

                    <div className="theme-message-compose mt-4 overflow-hidden rounded-[24px]">
                      <div className="h-40 overflow-hidden">
                        <FallbackMedia
                          src={conversation.post.images[0]?.imageUrl}
                          alt={conversation.post.title}
                          className="h-full w-full object-cover"
                          wrapperClassName="h-full w-full"
                        />
                      </div>

                      <div className="space-y-3 p-4">
                        <h4 className="line-clamp-2 text-lg font-medium text-[var(--foreground)]">{conversation.post.title}</h4>
                        <p className="text-2xl font-semibold text-[var(--accent)]">{formatPrice(conversation.post.price)}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {conversation.post.area} m² • {conversation.post.propertyType}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                          <MapPin className="h-4 w-4" />
                          <span>{conversation.post.city}</span>
                        </p>
                        <Link
                          href={`/posts/${conversation.post.id}`}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--accent)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-lg font-semibold text-[var(--foreground)]">Tệp đã chia sẻ</p>
                      <span className="text-sm text-[var(--muted-foreground)]">{sharedAssets.length}</span>
                    </div>

                    <div className="space-y-3">
                      {sharedAssets.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
                          Chưa có tệp nào được chia sẻ trong hội thoại này.
                        </div>
                      ) : (
                        sharedAssets.map((asset, index) => (
                          <div key={asset.id} className="theme-media-surface flex items-center gap-3 rounded-[22px] p-3">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl">
                              <FallbackMedia
                                src={asset.url}
                                alt={getFileLabel(index)}
                                className="h-full w-full object-cover"
                                wrapperClassName="h-full w-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-[var(--foreground)]">{getFileLabel(index)}</p>
                              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{format(new Date(asset.createdAt), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}

        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="theme-media-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4"
          >
            <motion.img
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              src={lightboxImage}
              alt="Xem ảnh"
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="theme-media-control absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MessageBubble = memo(({
  message,
  index,
  isMine,
  otherUser,
  isGroupedWithPrevious,
  isGroupedWithNext,
  showDateDivider,
  openMenuId,
  setOpenMenuId,
  handleToggleMessageMenu,
  setLightboxImage,
  handleEditMessage,
  handleDeleteMessage,
  isLastRead
}: any) => {
  const imageUrls = message.messageType === "IMAGE" ? parseImages(message.content) : [];

  return (
    <div>
      {showDateDivider && index !== 0 && (
        <div className="my-6 flex items-center gap-4 text-xs font-medium text-[var(--muted-foreground)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span>{formatMessageDayLabel(message.createdAt)}</span>
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
      )}

      <motion.div
        initial={message.isHistory ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group/message flex w-full overflow-visible ${isMine ? "justify-end" : "justify-start"} ${isGroupedWithNext ? "mb-2" : "mb-5"
          }`}
      >
        <div className={`flex max-w-[88%] items-end overflow-visible ${isMine ? "flex-row-reverse gap-1 sm:gap-2" : "flex-row gap-0.5"} sm:max-w-[84%] md:max-w-[80%] xl:max-w-[76%]`}>
          {isMine && <div className="hidden sm:block h-10 w-8 shrink-0" aria-hidden="true" />}

          {!isMine && (
            <div className="flex h-10 w-10 shrink-0 items-end justify-start">
              {!isGroupedWithNext && (
                <div className="h-9 w-9 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)]">
                  {otherUser.avatarUrl ? (
                    <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[var(--secondary-foreground)]">
                      {otherUser.fullName.charAt(0)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
            {message.isEdited && message.messageType === "TEXT" && (
              <p className={`mb-1 px-1 text-[11px] ${isMine ? "text-[var(--message-meta-own)]" : "text-[var(--message-meta-other)]"}`}>
                Đã chỉnh sửa
              </p>
            )}

            <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
              <div
                className={`relative overflow-hidden ${message.messageType === "IMAGE"
                  ? ""
                  : `px-4 py-3.5 ${isMine
                    ? "bg-[image:var(--message-own-bg)] text-[var(--message-own-foreground)]"
                    : "bg-[var(--message-other-bg)] text-[var(--message-other-foreground)]"
                  }`
                  } ${isMine
                    ? isGroupedWithPrevious
                      ? "rounded-[26px] rounded-tr-lg"
                      : "rounded-[26px] rounded-br-lg"
                    : isGroupedWithPrevious
                      ? "rounded-[26px] rounded-tl-lg"
                      : "rounded-[26px] rounded-bl-lg"
                  } shadow-[var(--shadow-soft)]`}
              >
                {message.messageType === "IMAGE" ? (
                  <div
                    className={`relative overflow-hidden rounded-[22px] sm:rounded-[24px] ${imageUrls.length === 1
                      ? "w-[min(300px,70vw)] sm:w-[min(340px,72vw)] md:w-[400px]"
                      : "w-[min(280px,68vw)] sm:w-[min(320px,70vw)] md:w-[390px]"
                      }`}
                  >
                    {imageUrls.length === 1 ? (
                      <ChatImageTile
                        src={imageUrls[0]}
                        alt="ảnh đã gửi"
                        onClick={() => setLightboxImage(imageUrls[0])}
                        wrapperClassName="relative block w-full overflow-hidden rounded-[24px] bg-[var(--surface)]"
                        className="h-full w-full object-cover transition hover:scale-[1.01]"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        {imageUrls.slice(0, 4).map((url, imageIndex) => (
                          <button
                            key={url + imageIndex}
                            type="button"
                            onClick={() => setLightboxImage(url)}
                            className={`relative overflow-hidden bg-[var(--surface)] ${imageUrls.length === 3 && imageIndex === 0 ? "col-span-2 aspect-[2.2/1]" : "aspect-[1/1]"
                              }`}
                          >
                            <FallbackMedia
                              src={url}
                              alt="Ảnh đã gửi"
                              className="h-full w-full object-cover transition hover:scale-[1.01]"
                              wrapperClassName="h-full w-full"
                            />
                            {imageUrls.length > 4 && imageIndex === 3 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-[var(--media-overlay-strong)] text-lg font-semibold text-[var(--foreground)]">
                                +{imageUrls.length - 4}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {message.isOptimistic && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--media-overlay-soft)] backdrop-blur-sm">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:color-mix(in_srgb,var(--foreground)_80%,transparent)] border-t-transparent" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-5 sm:text-[14px] sm:leading-6">{message.content}</p>
                    {message.isOptimistic && (
                      <p className={`text-[11px] ${isMine ? "text-[var(--message-meta-own)]" : "text-[var(--message-meta-other)]"}`}>
                        Đang gửi...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {isMine && !message.isOptimistic && (
                <div className={`relative z-30 transition ${openMenuId === message.id ? "opacity-100" : "opacity-0 group-hover/message:opacity-100"}`}>
                  <button
                    type="button"
                    onClick={(event) => handleToggleMessageMenu(message.id, event.currentTarget)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className={`mt-2 flex items-center gap-2 px-1 text-xs ${isMine ? "justify-end" : "justify-start"} text-[var(--message-meta-other)]`}>
              <span>{formatMessageTime(message.createdAt)}</span>
              {isLastRead && <span className="text-[var(--message-read)]">Đã xem</span>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isRead === nextProps.message.isRead &&
    prevProps.message.isEdited === nextProps.message.isEdited &&
    prevProps.message.isOptimistic === nextProps.message.isOptimistic &&
    prevProps.message.uploadState === nextProps.message.uploadState &&
    prevProps.isGroupedWithPrevious === nextProps.isGroupedWithPrevious &&
    prevProps.isGroupedWithNext === nextProps.isGroupedWithNext &&
    prevProps.showDateDivider === nextProps.showDateDivider &&
    prevProps.openMenuId === nextProps.openMenuId &&
    prevProps.isLastRead === nextProps.isLastRead
  );
});


