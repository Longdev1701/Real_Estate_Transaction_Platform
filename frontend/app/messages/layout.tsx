"use client";

import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, User as UserIcon, CheckCircle2, MoreVertical, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "next/dist/compiled/date-fns";

export interface ConversationListItem {
  id: string;
  buyer: { id: string; fullName: string; avatarUrl: string | null };
  seller: { id: string; fullName: string; avatarUrl: string | null };
  post: { id: string; title: string; price: number; images: { imageUrl: string }[] };
  messages: { id: string; content: string; createdAt: string; messageType: string; isRead: boolean }[];
  _count: { messages: number };
}

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "priority">("all");
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const { socket, isConnected } = useSocketStore();

  useEffect(() => {
    if (hasHydrated && !user) {
      router.push("/auth/login");
    }
  }, [hasHydrated, user, router]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await api.get("/conversations");
        setConversations(data.data.conversations);
      } catch (error) {
        console.error("Failed to fetch conversations", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (socket && isConnected) {
      socket.on("receive_message", (message: any) => {
        setConversations(prev => {
          return prev.map(conv => {
            if (conv.id === message.conversationId) {
              const isOtherUser = message.senderId !== user?.id;
              return {
                ...conv,
                messages: [message],
                _count: {
                  messages: isOtherUser ? conv._count.messages + 1 : conv._count.messages
                }
              };
            }
            return conv;
          }).sort((a, b) => {
            const timeA = new Date(a.messages[0]?.createdAt || 0).getTime();
            const timeB = new Date(b.messages[0]?.createdAt || 0).getTime();
            return timeB - timeA;
          });
        });
      });

      return () => {
        socket.off("receive_message");
      };
    }
  }, [socket, isConnected, user]);

  useEffect(() => {
    if (pathname && pathname.startsWith("/messages/")) {
      const convId = pathname.split("/messages/")[1];
      if (convId) {
        setConversations(prev => prev.map(conv => {
          if (conv.id === convId && conv._count.messages > 0) {
            return { ...conv, _count: { messages: 0 } };
          }
          return conv;
        }));
      }
    }
  }, [pathname]);

  if (!hasHydrated || !user) return null;

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.buyer.id === user.id ? conv.seller : conv.buyer;
    const matchesSearch = otherUser.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || conv.post.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || (activeTab === "unread" && conv._count.messages > 0);
    return matchesSearch && matchesTab;
  });

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault(); // Prevent link click
    if (confirm("Bạn có chắc chắn muốn xoá đoạn chat này?")) {
      try {
        await api.delete(`/conversations/${conversationId}`);
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (pathname === `/messages/${conversationId}`) {
          router.push("/messages");
        }
      } catch (error) {
        console.error("Failed to delete conversation", error);
      }
    }
    setOpenConvMenuId(null);
  };

  const isMobileDetailView = pathname !== "/messages";

  return (
    <div className="flex h-[calc(100vh-80px)] w-full max-w-7xl mx-auto border-t border-white/10 lg:border-t-0 overflow-hidden">
      {/* LEFT SIDEBAR (Hidden on mobile if viewing a chat) */}
      <div className={`w-full lg:w-[360px] flex-shrink-0 flex flex-col border-r border-white/10 bg-slate-900/50 ${isMobileDetailView ? "hidden lg:flex" : "flex"}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-white">Tin nhắn</h1>
            <button className="text-gray-400 hover:text-white transition">
              {/* Note Icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm cuộc trò chuyện..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex gap-2 text-sm">
            <button 
              onClick={() => setActiveTab("all")}
              className={`px-4 py-1.5 rounded-full transition ${activeTab === "all" ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:text-white"}`}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setActiveTab("unread")}
              className={`px-4 py-1.5 rounded-full transition ${activeTab === "unread" ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:text-white"}`}
            >
              Chưa đọc
            </button>
            <button 
              onClick={() => setActiveTab("priority")}
              className={`px-4 py-1.5 rounded-full transition ${activeTab === "priority" ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:text-white"}`}
            >
              Ưu tiên
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="p-6 flex justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Không có cuộc trò chuyện nào</div>
          ) : (
            filteredConversations.map(conv => {
              const otherUser = conv.buyer.id === user.id ? conv.seller : conv.buyer;
              const lastMessage = conv.messages[0];
              const isActive = pathname === `/messages/${conv.id}`;
              const hasUnread = conv._count.messages > 0;

              return (
                <Link 
                  href={`/messages/${conv.id}`} 
                  key={conv.id}
                  className={`block p-4 border-b border-white/5 hover:bg-white/5 transition relative group/conv ${isActive ? "bg-white/5" : ""}`}
                >
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/10 relative">
                      {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt={otherUser.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 font-medium">{otherUser.fullName.charAt(0)}</span>
                      )}
                      {hasUnread && <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-[#0f172a] rounded-full"></span>}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={`text-sm truncate ${hasUnread ? "text-white font-semibold" : "text-gray-200 font-medium"}`}>{otherUser.fullName}</h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : ""}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${hasUnread ? "text-blue-400 font-medium" : "text-gray-500"}`}>
                        {lastMessage ? (lastMessage.messageType === "IMAGE" ? "Đã gửi hình ảnh" : lastMessage.content) : "Bắt đầu cuộc trò chuyện"}
                      </p>
                    </div>

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/conv:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenConvMenuId(openConvMenuId === conv.id ? null : conv.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {openConvMenuId === conv.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-40 bg-[#1e293b] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden py-1"
                          onClick={(e) => e.preventDefault()}
                        >
                          <button 
                            onClick={(e) => handleDeleteConversation(e, conv.id)}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Xoá đoạn chat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-[#0b1120] relative ${!isMobileDetailView ? "hidden lg:flex" : "flex"}`}>
        {children}
      </div>
    </div>
  );
}
