"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { BadgeCheck, Edit, LoaderCircle } from "lucide-react";

import { api } from "@/lib/api";
import { PostCard } from "@/components/post/PostCard";
import { useAuthStore } from "@/stores/auth.store";
import type { Post, PostListData } from "@/lib/posts";

export default function ProfilePostsPage() {
  const { user, hasHydrated, isLoadingUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<{ data: PostListData }>("/posts?limit=100");
        if (isMounted) {
          setPosts(response.data.data.items);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải bài đăng của bạn.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, user]);

  const myPosts = useMemo(
    () => (user ? posts.filter((post) => post.author.id === user.id) : []),
    [posts, user],
  );

  const saleCount = useMemo(() => myPosts.filter(p => p.postType === 'SALE').length, [myPosts]);
  const rentCount = useMemo(() => myPosts.filter(p => p.postType === 'RENT').length, [myPosts]);

  if (!hasHydrated || isLoadingUser) {
    return null;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
        <div className="glass-card mx-auto max-w-3xl p-8 text-center">
          <p className="text-lg text-gray-300">Vui lòng đăng nhập để xem hồ sơ của bạn.</p>
          <Link href="/auth/login" className="btn-primary mt-6 inline-flex">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const username = user.email ? user.email.split('@')[0] : "user";

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 max-w-7xl">
      {/* Profile Header Section */}
      <div className="relative mb-6 overflow-hidden rounded-2xl glass-panel">
        {/* Cover Image */}
        <div className="h-48 md:h-72 w-full relative">
          <img 
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=2000" 
            alt="Cover" 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] to-transparent"></div>
        </div>
        
        {/* Avatar & User Info */}
        <div className="px-6 md:px-10 pb-8 -mt-16 md:-mt-24 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6 w-full md:w-auto">
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-4 border-[#0B1120] overflow-hidden bg-blue-900 flex-shrink-0 relative">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-blue-200">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-2 right-2 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full border border-white/30 flex items-center justify-center text-white cursor-pointer hover:bg-white/30 transition-colors">
                <Edit className="w-4 h-4" />
              </div>
            </div>
            
            <div className="pb-2 w-full">
              <div className="flex items-center justify-between md:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{user.fullName}</h1>
                  <BadgeCheck className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="text-gray-400 mt-1">@{username}</p>
              <p className="text-sm text-gray-300 mt-3 max-w-2xl">
                Chuyên viên môi giới và đầu tư bất động sản khu vực TP.HCM và các tỉnh lân cận. Uy tín - Tận tâm - Chuyên nghiệp.
              </p>
              
              <div className="flex items-center gap-6 md:gap-10 mt-5">
                <div>
                  <div className="text-xl font-bold text-white">{myPosts.length}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Bài đăng</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">128</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Đang theo dõi</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">1.2K</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Người theo dõi</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">4.8</div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider mt-1">Đánh giá</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pb-2 w-full md:w-auto flex md:justify-end">
            <Link href="/profile" className="w-full md:w-auto px-6 py-2.5 rounded-xl border border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors font-medium text-center">
              Chỉnh sửa hồ sơ
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-panel mb-8 rounded-2xl overflow-hidden">
        <div className="flex overflow-x-auto hide-scrollbar">
          <button className="px-6 py-4 border-b-2 border-blue-500 text-blue-400 font-medium whitespace-nowrap bg-blue-500/5">
            Bài đăng của tôi
          </button>
          <button className="px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium whitespace-nowrap transition-colors">
            Bài đã lưu
          </button>
          <button className="px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium whitespace-nowrap transition-colors">
            Yêu thích
          </button>
          <button className="px-6 py-4 border-b-2 border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5 font-medium whitespace-nowrap transition-colors">
            Lịch sử xem
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card p-6 md:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-white">Bài đăng của tôi</h2>
          <Link href="/posts/create" className="btn-primary inline-flex items-center justify-center gap-2">
            <span>+</span> Đăng tin mới
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex overflow-x-auto gap-3 mb-8 pb-2 hide-scrollbar">
          <button className="px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium whitespace-nowrap transition-colors">
            Tất cả ({myPosts.length})
          </button>
          <button className="px-5 py-2 rounded-full bg-transparent border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white text-sm font-medium whitespace-nowrap transition-colors">
            Đang bán ({saleCount})
          </button>
          <button className="px-5 py-2 rounded-full bg-transparent border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white text-sm font-medium whitespace-nowrap transition-colors">
            Đang cho thuê ({rentCount})
          </button>
          <button className="px-5 py-2 rounded-full bg-transparent border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white text-sm font-medium whitespace-nowrap transition-colors">
            Đã bán/cho thuê (0)
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="inline-flex items-center gap-3 text-gray-300">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
              Đang tải bài đăng...
            </div>
          </div>
        ) : myPosts.length === 0 ? (
          <div className="p-12 text-center text-gray-400 border border-dashed border-white/10 rounded-2xl">
            Bạn chưa có bài đăng nào đang hiển thị. Hãy tạo bài đăng mới trên bảng tin.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {myPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
