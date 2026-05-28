"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { api } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon, Send, Phone, Video, Info, X, Smile, ChevronLeft, ChevronRight, Trash2, MoreVertical, Edit2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useSound } from "@/hooks/useSound";

const parseImages = (content: string): string[] => {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
    return [content];
  } catch {
    return [content];
  }
};

interface Message {
  id: string;
  senderId: string;
  content: string;
  messageType: "TEXT" | "IMAGE";
  createdAt: string;
  isRead?: boolean;
  isEdited?: boolean;
}

interface ConversationData {
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
}

export default function ChatWindow({ params }: { params: Promise<{ conversationId: string }> }) {
  const resolvedParams = use(params);
  const conversationId = resolvedParams.conversationId;
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const { socket, isConnected } = useSocketStore();
  const { playPop, playDing } = useSound();
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
  const [canScroll, setCanScroll] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const checkScroll = () => {
      if (previewScrollRef.current) {
        const { scrollWidth, clientWidth } = previewScrollRef.current;
        setCanScroll(scrollWidth > clientWidth);
      }
    };
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [imagePreviewUrls]);

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/auth/login");
    }
  }, [hasHydrated, user, router]);

  useEffect(() => {
    setSelectedImages([]);
    setImagePreviewUrls([]);
  }, [conversationId]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data } = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(data.data.messages);
        setConversation(data.data.conversation);
        
        // Mark as read
        await api.patch(`/conversations/${conversationId}/read`);
        if (socket && isConnected) {
          socket.emit("mark_read", { conversationId });
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };
    if (user) {
      fetchMessages();
    }
  }, [conversationId, user]);

  useEffect(() => {
    if (socket && isConnected && conversation && user) {
      const otherUserId = conversation.buyer.id === user.id ? conversation.seller.id : conversation.buyer.id;

      socket.emit("join_room", conversationId);
      socket.emit("check_online_status", otherUserId);

      socket.on("online_status_result", (data) => {
        if (data.userId === otherUserId) setIsOtherUserOnline(data.isOnline);
      });

      socket.on("user_online", (userId) => {
        if (userId === otherUserId) setIsOtherUserOnline(true);
      });

      socket.on("user_offline", (userId) => {
        if (userId === otherUserId) setIsOtherUserOnline(false);
      });

      socket.on("user_typing", (data) => {
        if (data.conversationId === conversationId && data.userId !== user?.id) {
          setOtherUserTyping(true);
        }
      });

      socket.on("user_stop_typing", (data) => {
        if (data.conversationId === conversationId && data.userId !== user?.id) {
          setOtherUserTyping(false);
        }
      });
      
      socket.on("messages_read", (data) => {
        if (data.conversationId === conversationId && data.userId !== user?.id) {
          setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
        }
      });

      socket.on("receive_message", (message: Message) => {
        setOtherUserTyping(false);
        setMessages((prev) => {
          if (prev.find(m => m.id === message.id)) return prev;
          
          if (message.senderId === user?.id) {
            const hasTemp = prev.find(m => m.id.startsWith("temp_") && m.content === message.content);
            if (hasTemp) {
              return prev.map(m => m === hasTemp ? message : m);
            }
          } else {
            // Play notification sound for incoming message
            playDing();
          }
          return [...prev, message];
        });

        const isAtBottom = messagesContainerRef.current 
          ? messagesContainerRef.current.scrollHeight - messagesContainerRef.current.scrollTop - messagesContainerRef.current.clientHeight < 100
          : true;

        if (message.senderId !== user?.id && !isAtBottom) {
          setUnreadCount(prev => prev + 1);
        } else {
          api.patch(`/conversations/${conversationId}/read`).catch(console.error);
          socket.emit("mark_read", { conversationId });
        }
      });

      socket.on("message_edited", (updatedMessage: Message) => {
        setMessages(prev => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
      });

      socket.on("message_deleted", (data: { messageId: string, conversationId: string }) => {
        if (data.conversationId === conversationId) {
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
        }
      });

      socket.on("conversation_deleted", (data: { conversationId: string }) => {
        if (data.conversationId === conversationId) {
          router.push("/messages");
        }
      });

      return () => {
        socket.off("online_status_result");
        socket.off("user_online");
        socket.off("user_offline");
        socket.off("user_typing");
        socket.off("user_stop_typing");
        socket.off("messages_read");
        socket.off("receive_message");
        socket.off("message_edited");
        socket.off("message_deleted");
        socket.off("conversation_deleted");
      };
    }
  }, [socket, isConnected, conversationId, user, conversation, router]);

  useEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, otherUserTyping]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
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

  if (!hasHydrated || !user || !conversation) return null;

  const otherUser = conversation.buyer.id === user.id ? conversation.seller : conversation.buyer;

  const handleEditMessage = (msg: Message) => {
    setEditingMessageId(msg.id);
    setInputValue(msg.content);
    setOpenMenuId(null);
    fileInputRef.current?.focus();
  };

  const handleDeleteMessage = (msgId: string) => {
    if (confirm("Bạn có chắc chắn muốn thu hồi tin nhắn này không?")) {
      socket?.emit("delete_message", { messageId: msgId, conversationId });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
    setOpenMenuId(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedImages.length) || !socket) return;

    const textContent = inputValue.trim();
    
    // Clear typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { conversationId });

    if (editingMessageId) {
      // Optimistic UI for edit
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: textContent, isEdited: true } : m));
      
      socket.emit("edit_message", {
        messageId: editingMessageId,
        conversationId,
        content: textContent
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
            headers: { "Content-Type": "multipart/form-data" }
          });
          
          return data.data.imageUrl as string;
        });

        const imageUrls = await Promise.all(uploadPromises);
        const contentStr = JSON.stringify(imageUrls);

        // Optimistic UI for image
        const tempId = `temp_${Date.now()}_${Math.random()}`;
        const tempMsg: Message = {
          id: tempId,
          senderId: user.id,
          content: contentStr,
          messageType: "IMAGE",
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, tempMsg]);

        socket.emit("send_message", {
          conversationId,
          content: contentStr,
          messageType: "IMAGE"
        });
        
        setSelectedImages([]);
        setImagePreviewUrls([]);
      } catch (error) {
        console.error("Upload failed", error);
        alert("Tải ảnh thất bại. Vui lòng thử lại.");
      } finally {
        setIsUploading(false);
      }
    }

    if (textContent) {
      // Optimistic UI for text
      const tempId = `temp_${Date.now() + 1}`;
      const tempMsg: Message = {
        id: tempId,
        senderId: user.id,
        content: textContent,
        messageType: "TEXT",
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, tempMsg]);

      socket.emit("send_message", {
        conversationId,
        content: textContent,
        messageType: "TEXT"
      });
    }

    // Reset states
    setInputValue("");
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    // Play send sound
    playPop();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (socket && isConnected) {
      socket.emit("typing", { conversationId });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("stop_typing", { conversationId });
      }, 2000);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (validFiles.length < files.length) {
      alert("Một số ảnh bị bỏ qua do vượt quá 5MB.");
    }
    
    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      setImagePreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedImage = (indexToRemove: number) => {
    setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setImagePreviewUrls(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const onEmojiClick = (emojiObject: any) => {
    setInputValue(prev => prev + emojiObject.emoji);
  };

  const scrollPreview = (direction: 'left' | 'right') => {
    if (previewScrollRef.current) {
      const scrollAmount = 200;
      previewScrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `${(price / 1000).toFixed(1)} tỷ`;
    return `${price} triệu`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0b1120]">
      {/* HEADER */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0 bg-[#0f172a]">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
              {otherUser.avatarUrl ? (
                <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 font-medium">{otherUser.fullName.charAt(0)}</span>
              )}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0f172a] rounded-full"></span>
          </div>
          <div>
            <h2 className="text-white font-semibold">{otherUser.fullName}</h2>
            {isOtherUserOnline ? (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
              </p>
            ) : (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Ngoại tuyến
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-400">
          <button className="hover:text-white transition"><Phone className="w-5 h-5" /></button>
          <button className="hover:text-white transition"><Video className="w-5 h-5" /></button>
          <button className="hover:text-white transition"><Info className="w-5 h-5" /></button>
        </div>
      </div>

      {/* PROPERTY CARD */}
      <div className={`border-b border-white/10 shrink-0 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-30 transition-all duration-300 ${showScrollButton ? "p-2 shadow-md" : "p-4"}`}>
        <div className={`flex items-center gap-4 max-w-2xl mx-auto bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ${showScrollButton ? "p-2" : "p-3"}`}>
          <div className={`rounded-lg overflow-hidden shrink-0 transition-all duration-300 ${showScrollButton ? "w-12 h-8" : "w-20 h-14"}`}>
            {conversation.post.images[0] ? (
              <img src={conversation.post.images[0].imageUrl} alt="Property" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-white font-medium truncate transition-all duration-300 ${showScrollButton ? "text-xs" : "text-sm"}`}>{conversation.post.title}</h3>
            {!showScrollButton && (
              <p className="text-xs text-gray-400 mt-1 truncate">
                {conversation.post.city} • {conversation.post.area} m²
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-blue-400 font-semibold transition-all duration-300 ${showScrollButton ? "text-xs" : "text-sm"}`}>{formatPrice(conversation.post.price)}</p>
            {!showScrollButton && (
              <Link href={`/posts/${conversation.post.id}`} className="inline-block mt-1 text-xs px-3 py-1 rounded-full border border-blue-500/30 text-blue-300 hover:bg-blue-500/10 transition">
                Xem chi tiết
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MESSAGES LIST */}
      <div 
        className="flex-1 overflow-y-auto p-4 no-scrollbar relative"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onClick={() => {
          setSelectedImages([]);
          setImagePreviewUrls([]);
        }}
      >
        <div className="text-center text-xs text-gray-500 my-4">
          Bắt đầu cuộc trò chuyện
        </div>
        
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.id;
            
            const msgDate = new Date(msg.createdAt);
            const messageTime = format(msgDate, "HH:mm");
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            
            // 1. Time Divider Logic (> 30 mins or different day)
            let showDateDivider = false;
            let dateText = "";
            
            if (!prevMsg) {
              showDateDivider = true;
            } else {
              const prevMsgDate = new Date(prevMsg.createdAt);
              if (msgDate.getTime() - prevMsgDate.getTime() > 30 * 60 * 1000 || msgDate.getDate() !== prevMsgDate.getDate() || msgDate.getMonth() !== prevMsgDate.getMonth() || msgDate.getFullYear() !== prevMsgDate.getFullYear()) {
                showDateDivider = true;
              }
            }

            if (showDateDivider) {
              if (isToday(msgDate)) {
                dateText = "Hôm nay, " + format(msgDate, "HH:mm");
              } else if (isYesterday(msgDate)) {
                dateText = "Hôm qua, " + format(msgDate, "HH:mm");
              } else {
                dateText = format(msgDate, "dd Thg MM, yyyy - HH:mm", { locale: vi });
              }
            }

            // 2. Grouping Logic
            let nextHasDateDivider = false;
            if (nextMsg) {
              const nextMsgDate = new Date(nextMsg.createdAt);
              if (nextMsgDate.getTime() - msgDate.getTime() > 30 * 60 * 1000 || nextMsgDate.getDate() !== msgDate.getDate()) {
                nextHasDateDivider = true;
              }
            }

            const isGroupedWithPrev = prevMsg && prevMsg.senderId === msg.senderId && !showDateDivider;
            const isGroupedWithNext = nextMsg && nextMsg.senderId === msg.senderId && !nextHasDateDivider;

            // Avatar shows only on the LAST message of the group
            const showAvatar = !isMe && !isGroupedWithNext;
            
            // 3. Smart Border Radius
            let borderRadiusClass = "rounded-2xl";
            if (isMe) {
              if (isGroupedWithPrev && isGroupedWithNext) borderRadiusClass = "rounded-2xl rounded-tr-sm rounded-br-sm";
              else if (isGroupedWithPrev) borderRadiusClass = "rounded-2xl rounded-tr-sm";
              else if (isGroupedWithNext) borderRadiusClass = "rounded-2xl rounded-br-sm";
              else borderRadiusClass = "rounded-2xl rounded-br-sm";
            } else {
              if (isGroupedWithPrev && isGroupedWithNext) borderRadiusClass = "rounded-2xl rounded-tl-sm rounded-bl-sm";
              else if (isGroupedWithPrev) borderRadiusClass = "rounded-2xl rounded-tl-sm";
              else if (isGroupedWithNext) borderRadiusClass = "rounded-2xl rounded-bl-sm";
              else borderRadiusClass = "rounded-2xl rounded-bl-sm";
            }

            const mb = isGroupedWithNext ? "mb-1" : "mb-4";

            return (
              <div key={msg.id}>
                {showDateDivider && (
                  <div className="flex justify-center my-6">
                    <span className="text-xs font-medium text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                      {dateText}
                    </span>
                  </div>
                )}
                
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`w-full flex ${isMe ? "justify-end" : "justify-start"} ${mb} group/msg`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"} items-end`}>
                    
                    {/* Avatar for other user */}
                    {!isMe && (
                      <div className="w-8 flex-shrink-0 flex items-end justify-center self-end">
                        {showAvatar ? (
                          <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden">
                            {otherUser.avatarUrl ? (
                              <img src={otherUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs text-gray-400 font-medium">{otherUser.fullName.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} min-w-0`}>
                      <div className={`flex items-center gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                        
                        <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          {msg.isEdited && msg.messageType === "TEXT" && (
                            <span className={`text-[10px] text-gray-500 italic mb-0.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
                              đã chỉnh sửa
                            </span>
                          )}

                          <div className={`relative text-sm overflow-hidden ${borderRadiusClass} ${
                            msg.messageType === "IMAGE"
                              ? "bg-transparent p-0 shadow-none"
                              : isMe 
                                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-sm px-4 py-2.5" 
                                : "bg-[#1e293b] text-gray-100 shadow-sm px-4 py-2.5"
                          }`}>

                            {msg.messageType === "IMAGE" ? (
                              (() => {
                                const urls = parseImages(msg.content);
                                if (urls.length === 1) {
                                  return (
                                    <div 
                                      className="relative max-w-sm rounded-xl overflow-hidden cursor-pointer"
                                      onClick={() => setLightboxImage(urls[0])}
                                    >
                                      <img src={urls[0]} alt="Attachment" className="max-h-64 object-cover hover:opacity-90 transition" />
                                    </div>
                                  );
                                }
                                return (
                                  <div className={`grid gap-1 max-w-sm ${urls.length === 2 ? 'grid-cols-2' : urls.length >= 3 ? 'grid-cols-2' : ''}`}>
                                    {urls.map((url, i) => (
                                      <div 
                                        key={i}
                                        className={`relative overflow-hidden cursor-pointer rounded-xl ${urls.length === 3 && i === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'} ${urls.length > 3 && i === 3 && urls.length > 4 ? 'relative' : ''}`}
                                        onClick={() => setLightboxImage(url)}
                                      >
                                        <img 
                                          src={url} 
                                          alt="Attachment" 
                                          className="w-full h-full object-cover hover:opacity-90 transition" 
                                        />
                                        {urls.length > 4 && i === 3 && (
                                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-lg">
                                            +{urls.length - 4}
                                          </div>
                                        )}
                                      </div>
                                    )).slice(0, 4)}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="break-words">
                                {msg.content}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Options Menu - visual left for isMe due to flex-row-reverse */}
                        {isMe && !msg.id.startsWith("temp_") && (
                          <div className="opacity-0 group-hover/msg:opacity-100 transition-opacity relative shrink-0">
                            <button 
                              onClick={() => setOpenMenuId(openMenuId === msg.id ? null : msg.id)}
                              className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/5 transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenuId === msg.id && (
                              <div className="absolute bottom-full right-0 mb-1 w-36 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1">
                                {msg.messageType === "TEXT" && (
                                  <button 
                                    onClick={() => handleEditMessage(msg)}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4" /> Sửa
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" /> Thu hồi
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hover time next to bubble */}
                        <span className={`text-[10px] text-gray-500 opacity-0 group-hover/msg:opacity-100 transition-opacity whitespace-nowrap select-none ${isMe ? 'mr-1' : 'ml-1'}`}>
                          {messageTime}
                        </span>
                      </div>
                      
                      {/* Read Receipt below bubble (only takes space when rendered) */}
                      {isMe && msg.isRead && idx === messages.length - 1 && (
                        <div className="flex items-center gap-1 mt-1 justify-end w-full">
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
                            {otherUser.avatarUrl ? (
                              <img src={otherUser.avatarUrl} alt="read" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] text-gray-400 font-medium">{otherUser.fullName.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[70%]">
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-slate-800 overflow-hidden flex items-center justify-center self-end">
                {otherUser.avatarUrl ? (
                  <img src={otherUser.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400 font-medium">{otherUser.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#1e293b] text-gray-100 rounded-bl-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* SCROLL TO BOTTOM BUTTON */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 w-10 h-10 bg-[#1e293b] border border-white/10 rounded-full flex items-center justify-center shadow-xl text-gray-300 hover:text-white transition z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* INPUT AREA */}
      <div className="p-4 bg-[#0f172a]/80 backdrop-blur-xl border-t border-white/10 shrink-0 relative z-30">
        {/* Preview Image Area */}
        <AnimatePresence>
          {imagePreviewUrls.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-full left-4 mb-2 p-2 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl z-20 max-w-[calc(100%-2rem)] flex items-center gap-2 group"
            >
              {canScroll && (
                <button 
                  type="button"
                  onClick={() => scrollPreview('left')}
                  className="absolute left-2 z-30 p-1 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div 
                ref={previewScrollRef}
                className="overflow-x-auto no-scrollbar flex gap-3 scroll-smooth items-center flex-1"
              >
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative flex-shrink-0">
                    <img src={url} alt="Preview" className="h-24 w-auto rounded-lg object-cover border border-white/10" />
                    <button 
                      type="button"
                      onClick={() => removeSelectedImage(idx)}
                      className="absolute top-1 right-1 bg-red-500/90 hover:bg-red-500 text-white rounded-full p-1 shadow-lg transition z-40 backdrop-blur-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {canScroll && (
                <button 
                  type="button"
                  onClick={() => scrollPreview('right')}
                  className="absolute right-2 z-30 p-1 bg-black/50 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-3 relative">
          <div className="relative" ref={emojiPickerRef}>
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 transition rounded-full hover:bg-white/5 ${showEmojiPicker ? "text-blue-500 bg-blue-500/10" : "text-gray-400 hover:text-white"}`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="absolute bottom-12 left-0 z-50"
                >
                  <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input 
            type="file" 
            accept="image/jpeg,image/png,image/webp,image/jpg" 
            multiple
            ref={fileInputRef} 
            onChange={handleImageSelect} 
            className="hidden" 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`p-2 transition rounded-full hover:bg-white/5 disabled:opacity-50 ${selectedImages.length > 0 ? "text-blue-500 bg-blue-500/10" : "text-gray-400 hover:text-white"}`}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputValue}
              onChange={handleInputChange}
              placeholder={isUploading ? "Đang tải ảnh lên..." : "Nhập tin nhắn..."} 
              disabled={isUploading}
              className={`w-full bg-[#1e293b]/80 border border-white/10 rounded-full pl-5 pr-12 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none transition-all duration-300 focus:bg-[#1e293b] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner ${editingMessageId ? "pr-10" : ""}`}           />
            <button 
              type="submit" 
              disabled={(!inputValue.trim() && selectedImages.length === 0 && !editingMessageId) || isUploading}
              className="absolute right-1 top-1 bottom-1 w-8 flex items-center justify-center bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-blue-600/50 transition hover:bg-blue-700"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
              ) : editingMessageId ? (
                <Check className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 cursor-pointer"
          >
            <motion.img 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={lightboxImage} 
              alt="Fullscreen" 
              className="max-w-full max-h-full object-contain" 
            />
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
