"use client";

import { useEffect, useRef, useState, use } from "react";
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
import EmojiPicker, { Theme } from "emoji-picker-react";

import { api } from "@/lib/api";
import { useSound } from "@/hooks/useSound";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";

type Message = {
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

const parseImages = (content: string): string[] => {
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [content];
  } catch {
    return [content];
  }
};

function formatPrice(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)} tỷ`;
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
      <div className={`flex items-center justify-center bg-slate-900 text-slate-500 ${wrapperClassName}`}>
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
  const [aspectRatio, setAspectRatio] = useState<number>(1);

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

export default function ChatWindow({ params }: { params: Promise<{ conversationId: string }> }) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;
  const { user, hasHydrated } = useAuthStore();
  const { socket, isConnected } = useSocketStore();
  const { playPop, playDing } = useSound();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setInputValue("");
    setEditingMessageId(null);
    setOpenMenuId(null);
    setIsDetailsPanelOpen(false);
  }, [conversationId]);

  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviewUrls]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoadError(null);
        const { data } = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(data.data.messages);
        setConversation(data.data.conversation);

        await api.patch(`/conversations/${conversationId}/read`);
        if (socket && isConnected) {
          socket.emit("mark_read", { conversationId });
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
        setLoadError("Không thể tải cuộc trò chuyện này.");
      }
    };

    if (user) {
      fetchMessages();
    }
  }, [conversationId, isConnected, socket, user]);

  useEffect(() => {
    if (!socket || !isConnected || !conversation || !user) return;

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
        if (prev.some((item) => item.id === message.id)) return prev;

        if (message.senderId === user.id) {
          const tempMessage = prev.find((item) => item.id.startsWith("temp_") && item.content === message.content);
          if (tempMessage) {
            return prev.map((item) => (item.id === tempMessage.id ? message : item));
          }
        } else {
          playDing();
        }

        return [...prev, message];
      });

      const isAtBottom = messagesContainerRef.current
        ? messagesContainerRef.current.scrollHeight -
            messagesContainerRef.current.scrollTop -
            messagesContainerRef.current.clientHeight <
          120
        : true;

      if (message.senderId !== user.id && !isAtBottom) {
        setUnreadCount((prev) => prev + 1);
      } else {
        api.patch(`/conversations/${conversationId}/read`).catch(console.error);
        socket.emit("mark_read", { conversationId });
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
    };
  }, [conversation, conversationId, isConnected, playDing, router, socket, user]);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, otherUserTyping, showScrollButton]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollButton(!isAtBottom);

    if (isAtBottom) {
      setUnreadCount(0);
      api.patch(`/conversations/${conversationId}/read`).catch(console.error);
      if (socket && isConnected) {
        socket.emit("mark_read", { conversationId });
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
    setUnreadCount(0);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setInputValue(message.content);
    setOpenMenuId(null);
    textInputRef.current?.focus();
  };

  const handleDeleteMessage = (messageId: string) => {
    if (window.confirm("Thu hồi tin nhắn này?")) {
      socket?.emit("delete_message", { messageId, conversationId });
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    }

    setOpenMenuId(null);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();

    if ((!inputValue.trim() && selectedImages.length === 0) || !socket) return;

    const textContent = inputValue.trim();

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { conversationId });

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

      try {
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
        const tempId = `temp_${Date.now()}_${Math.random()}`;

        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            senderId: user!.id,
            content,
            messageType: "IMAGE",
            createdAt: new Date().toISOString(),
          },
        ]);

        socket.emit("send_message", {
          conversationId,
          content,
          messageType: "IMAGE",
        });

        setSelectedImages([]);
        setImagePreviewUrls([]);
      } catch (error) {
        console.error("Upload failed", error);
        window.alert("Tải ảnh thất bại. Vui lòng thử lại.");
      } finally {
        setIsUploading(false);
      }
    }

    if (textContent) {
      const tempId = `temp_${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          senderId: user!.id,
          content: textContent,
          messageType: "TEXT",
          createdAt: new Date().toISOString(),
        },
      ]);

      socket.emit("send_message", {
        conversationId,
        content: textContent,
        messageType: "TEXT",
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

    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      window.alert("Một số ảnh bị bỏ qua do vượt quá 5MB.");
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

  if (!hasHydrated || !user || !conversation) {
    if (hasHydrated && user && loadError) {
      return (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#071326_0%,#06101f_100%)] p-6">
          <div className="max-w-md rounded-[28px] border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-base text-red-100">{loadError}</p>
            <Link
              href="/messages"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Quay lại danh sách chat
            </Link>
          </div>
        </div>
      );
    }

    return null;
  }

  const otherUser = conversation.buyer.id === user.id ? conversation.seller : conversation.buyer;
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
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#071326_0%,#06101f_100%)] shadow-[0_22px_60px_rgba(2,6,23,0.28)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[78px] shrink-0 items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/messages"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] hover:text-white lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-slate-800">
              {otherUser.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-300">
                  {otherUser.fullName.charAt(0)}
                </div>
              )}
              <span
                className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[#09172d] ${
                  isOtherUserOnline ? "bg-emerald-400" : "bg-slate-500"
                }`}
              />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[1.55rem] font-semibold tracking-tight text-white">{otherUser.fullName}</h2>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                <span className={`h-2 w-2 rounded-full ${isOtherUserOnline ? "bg-emerald-400" : "bg-slate-500"}`} />
                <span>{isOtherUserOnline ? "online" : "offline"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
              <Phone className="h-5 w-5" />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
              <Video className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsDetailsPanelOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-base font-semibold text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            >
              !
            </button>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="no-scrollbar flex-1 overflow-y-auto px-3 py-5 lg:px-4"
          >
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-6 flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                <span>{formatMessageDayLabel(new Date().toISOString())}</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="mb-6 overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04] shadow-[0_20px_60px_rgba(2,6,23,0.25)]">
                <div className="flex flex-col gap-4 p-4 md:flex-row">
                  <div className="h-36 w-full overflow-hidden rounded-[18px] bg-slate-900 md:h-40 md:w-[220px]">
                    <FallbackMedia
                      src={conversation.post.images[0]?.imageUrl}
                      alt={conversation.post.title}
                      className="h-full w-full object-cover"
                      wrapperClassName="h-full w-full"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-300">Bat dong san dang trao doi</p>
                      <h3 className="mt-1.5 text-[1.25rem] font-semibold leading-tight text-white">{conversation.post.title}</h3>
                      <p className="mt-2 text-[1.5rem] font-semibold text-blue-400">{formatPrice(conversation.post.price)}</p>
                    </div>

                    <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                        {conversation.post.propertyType}
                      </div>
                      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                        {conversation.post.area} m²
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <MapPin className="h-4 w-4" />
                        <span>{conversation.post.city}</span>
                      </div>

                      <Link
                        href={`/posts/${conversation.post.id}`}
                        className="inline-flex items-center justify-center rounded-[18px] border border-blue-400/40 px-4 py-2.5 text-sm font-medium text-blue-300 transition hover:bg-blue-500/10 hover:text-white"
                      >
                        Xem chi tiet
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const isMine = message.senderId === user.id;
                  const previousMessage = messages[index - 1];
                  const nextMessage = messages[index + 1];
                  const imageUrls = message.messageType === "IMAGE" ? parseImages(message.content) : [];

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
                    <div key={message.id}>
                      {showDateDivider && index !== 0 && (
                        <div className="my-6 flex items-center gap-4 text-xs font-medium text-slate-500">
                          <span className="h-px flex-1 bg-white/10" />
                          <span>{formatMessageDayLabel(message.createdAt)}</span>
                          <span className="h-px flex-1 bg-white/10" />
                        </div>
                      )}

                      <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group/message flex w-full ${isMine ? "justify-end" : "justify-start"} ${
                          isGroupedWithNext ? "mb-2" : "mb-5"
                        }`}
                      >
                        <div className={`flex max-w-[99%] items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"} lg:max-w-[88%]`}>
                          {!isMine && (
                            <div className="flex h-10 w-10 shrink-0 items-end justify-center">
                              {!isGroupedWithNext && (
                                <div className="h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                                  {otherUser.avatarUrl ? (
                                    <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-300">
                                      {otherUser.fullName.charAt(0)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                            <div className={`flex items-center gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                              <div
                                className={`relative overflow-hidden ${
                                  message.messageType === "IMAGE"
                                  ? ""
                                  : `px-4 py-3.5 ${
                                        isMine
                                          ? "bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] text-white"
                                          : "bg-white/[0.08] text-slate-100"
                                      }`
                                } ${
                                  isMine
                                    ? isGroupedWithPrevious
                                      ? "rounded-[26px] rounded-tr-lg"
                                      : "rounded-[26px] rounded-br-lg"
                                    : isGroupedWithPrevious
                                      ? "rounded-[26px] rounded-tl-lg"
                                      : "rounded-[26px] rounded-bl-lg"
                                } shadow-[0_16px_40px_rgba(2,6,23,0.15)]`}
                              >
                                {message.messageType === "IMAGE" ? (
                                  <div
                                    className={`overflow-hidden rounded-[24px] ${
                                      imageUrls.length === 1
                                        ? "w-[min(360px,76vw)] md:w-[400px]"
                                        : "w-[min(340px,74vw)] md:w-[390px]"
                                    }`}
                                  >
                                    {imageUrls.length === 1 ? (
                                      <ChatImageTile
                                        src={imageUrls[0]}
                                        alt="Anh da gui"
                                        onClick={() => setLightboxImage(imageUrls[0])}
                                        wrapperClassName="relative block w-full overflow-hidden rounded-[24px] bg-slate-900"
                                        className="h-full w-full object-cover transition hover:scale-[1.01]"
                                      />
                                    ) : (
                                      <div className="grid grid-cols-2 gap-1">
                                        {imageUrls.slice(0, 4).map((url, imageIndex) => (
                                          <button
                                            key={url + imageIndex}
                                            type="button"
                                            onClick={() => setLightboxImage(url)}
                                            className={`relative overflow-hidden bg-slate-900 ${
                                              imageUrls.length === 3 && imageIndex === 0 ? "col-span-2 aspect-[2.2/1]" : "aspect-[1/1]"
                                            }`}
                                          >
                                            <FallbackMedia
                                              src={url}
                                              alt="Anh da gui"
                                              className="h-full w-full object-cover transition hover:scale-[1.01]"
                                              wrapperClassName="h-full w-full"
                                            />
                                            {imageUrls.length > 4 && imageIndex === 3 && (
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
                                                +{imageUrls.length - 4}
                                              </div>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {message.isEdited && (
                                      <p className={`text-[11px] ${isMine ? "text-blue-100/80" : "text-slate-400"}`}>
                                        Da chinh sua
                                      </p>
                                    )}
                                    <p className="whitespace-pre-wrap break-words text-[14px] leading-6">{message.content}</p>
                                  </div>
                                )}
                              </div>

                              {isMine && !message.id.startsWith("temp_") && (
                                <div className="relative opacity-0 transition group-hover/message:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => setOpenMenuId(openMenuId === message.id ? null : message.id)}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 transition hover:text-white"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>

                                  {openMenuId === message.id && (
                                    <div className="absolute bottom-10 right-0 z-20 w-40 overflow-hidden rounded-2xl border border-white/10 bg-[#13213b] p-1 shadow-2xl">
                                      {message.messageType === "TEXT" && (
                                        <button
                                          type="button"
                                          onClick={() => handleEditMessage(message)}
                                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/5"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                          Chinh sua
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMessage(message.id)}
                                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Thu hoi
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className={`mt-2 flex items-center gap-2 px-1 text-xs ${isMine ? "justify-end" : "justify-start"} text-slate-500`}>
                              <span>{formatMessageTime(message.createdAt)}</span>
                              {isMine && index === messages.length - 1 && message.isRead && <span className="text-blue-300">Da xem</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </AnimatePresence>

              {otherUserTyping && (
                <div className="mb-5 flex justify-start">
                  <div className="flex items-end gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                      {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-300">
                          {otherUser.fullName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 rounded-[24px] rounded-bl-lg bg-white/[0.08] px-5 py-4">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:240ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-28 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#12203a] text-slate-200 shadow-xl transition hover:text-white"
              >
                <ChevronRight className="h-4 w-4 rotate-90" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </motion.button>
            )}
          </AnimatePresence>

          <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-4 py-4 lg:px-5">
            <AnimatePresence>
              {imagePreviewUrls.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="relative mb-3 overflow-hidden rounded-[22px] border border-white/10 bg-[#0b1931] p-3"
                >
                  {canScrollPreview && (
                    <button
                      type="button"
                      onClick={() => scrollPreview("left")}
                      className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
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
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white"
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
                      className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="rounded-[24px] border border-white/10 bg-[#0b1931] px-4 py-3 shadow-[0_8px_18px_rgba(2,6,23,0.18)]">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-400 sm:flex"
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    selectedImages.length > 0 ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.04] text-slate-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                      showEmojiPicker ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.04] text-slate-400 hover:text-white"
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
                    className="w-full border-none bg-transparent px-2 py-2.5 text-[14px] text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={(!inputValue.trim() && selectedImages.length === 0 && !editingMessageId) || isUploading}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5b7cff,#944dff)] text-white shadow-[0_16px_32px_rgba(79,70,229,0.35)] transition disabled:opacity-50"
                >
                  {isUploading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
              className="absolute inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            />

            <motion.aside
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              className="absolute right-0 top-0 z-50 flex h-full w-full max-w-[380px] flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,rgba(11,22,42,0.98),rgba(7,16,31,0.99))] p-5 shadow-[-24px_0_60px_rgba(2,6,23,0.45)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Thông tin chat</p>
                <button
                  type="button"
                  onClick={() => setIsDetailsPanelOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-4 pb-1">
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6 text-center">
                    <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-slate-800">
                      {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-slate-300">
                          {otherUser.fullName.charAt(0)}
                        </div>
                      )}
                      <span
                        className={`absolute bottom-2 right-2 h-4 w-4 rounded-full border-2 border-[#0b1931] ${
                          isOtherUserOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                    </div>

                    <h3 className="mt-5 text-3xl font-semibold text-white">{otherUser.fullName}</h3>
                    <p className="mt-2 text-sm text-slate-400">Chủ tin đăng</p>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-300 transition hover:bg-white/[0.06]">
                        <Phone className="mx-auto mb-2 h-5 w-5" />
                        Gọi thoại
                      </button>
                      <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-300 transition hover:bg-white/[0.06]">
                        <Video className="mx-auto mb-2 h-5 w-5" />
                        Gọi video
                      </button>
                      <button className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-slate-300 transition hover:bg-white/[0.06]">
                        <Info className="mx-auto mb-2 h-5 w-5" />
                        Hồ sơ
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-lg font-semibold text-white">Bất động sản đang trao đổi</p>

                    <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1b33]">
                      <div className="h-40 overflow-hidden">
                        <FallbackMedia
                          src={conversation.post.images[0]?.imageUrl}
                          alt={conversation.post.title}
                          className="h-full w-full object-cover"
                          wrapperClassName="h-full w-full"
                        />
                      </div>

                      <div className="space-y-3 p-4">
                        <h4 className="line-clamp-2 text-lg font-medium text-white">{conversation.post.title}</h4>
                        <p className="text-2xl font-semibold text-blue-400">{formatPrice(conversation.post.price)}</p>
                        <p className="text-sm text-slate-400">
                          {conversation.post.area} m² • {conversation.post.propertyType}
                        </p>
                        <p className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          <span>{conversation.post.city}</span>
                        </p>
                        <Link
                          href={`/posts/${conversation.post.id}`}
                          className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-blue-300 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-lg font-semibold text-white">Tệp đã chia sẻ</p>
                      <span className="text-sm text-slate-500">{sharedAssets.length}</span>
                    </div>

                    <div className="space-y-3">
                      {sharedAssets.length === 0 ? (
                        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm leading-6 text-slate-500">
                          Chưa có tệp nào được chia sẻ trong hội thoại này.
                        </div>
                      ) : (
                        sharedAssets.map((asset, index) => (
                          <div key={asset.id} className="flex items-center gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-3">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl">
                              <FallbackMedia
                                src={asset.url}
                                alt={getFileLabel(index)}
                                className="h-full w-full object-cover"
                                wrapperClassName="h-full w-full"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">{getFileLabel(index)}</p>
                              <p className="mt-1 text-xs text-slate-500">{format(new Date(asset.createdAt), "dd/MM/yyyy HH:mm")}</p>
                            </div>
                            <a
                              href={asset.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
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
              className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
