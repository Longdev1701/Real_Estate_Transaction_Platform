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

  const saleCount = useMemo(
    () => myPosts.filter((post) => post.postType === "SELL").length,
    [myPosts],
  );
  const rentCount = useMemo(
    () => myPosts.filter((post) => post.postType === "RENT").length,
    [myPosts],
  );

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

  const displayName = user.fullName ?? user.name ?? user.email;
  const username = user.email ? user.email.split("@")[0] : "user";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl glass-panel">
        <div className="relative h-48 w-full md:h-72">
          <img
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=2000"
            alt="Cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] to-transparent" />
        </div>

        <div className="relative -mt-16 flex flex-col items-start justify-between gap-6 px-6 pb-8 md:-mt-24 md:flex-row md:items-end md:px-10">
          <div className="flex w-full flex-col items-start gap-6 md:w-auto md:flex-row md:items-end">
            <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-[#0B1120] bg-blue-900 md:h-44 md:w-44">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-blue-200">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30">
                <Edit className="h-4 w-4" />
              </div>
            </div>

            <div className="w-full pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white md:text-3xl">{displayName}</h1>
                <BadgeCheck className="h-6 w-6 text-blue-500" />
              </div>
              <p className="mt-1 text-gray-400">@{username}</p>
              <p className="mt-3 max-w-2xl text-sm text-gray-300">
                Chuyên viên môi giới và đầu tư bất động sản khu vực TP.HCM và các tỉnh lân cận.
                Uy tín, tận tâm và chuyên nghiệp.
              </p>

              <div className="mt-5 flex items-center gap-6 md:gap-10">
                <div>
                  <div className="text-xl font-bold text-white">{myPosts.length}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-gray-400">Bài đăng</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">128</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-gray-400">Đang theo dõi</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">1.2K</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-gray-400">Người theo dõi</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">4.8</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-gray-400">Đánh giá</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full pb-2 md:w-auto md:justify-end">
            <Link
              href="/profile"
              className="w-full rounded-xl border border-blue-500/50 bg-blue-500/10 px-6 py-2.5 text-center font-medium text-blue-400 transition-colors hover:bg-blue-500/20 md:w-auto"
            >
              Chỉnh sửa hồ sơ
            </Link>
          </div>
        </div>
      </div>

      <div className="glass-panel mb-8 overflow-hidden rounded-2xl">
        <div className="flex overflow-x-auto hide-scrollbar">
          <button className="whitespace-nowrap border-b-2 border-blue-500 bg-blue-500/5 px-6 py-4 font-medium text-blue-400">
            Bài đăng của tôi
          </button>
          <Link
            href="/profile/saved"
            className="whitespace-nowrap border-b-2 border-transparent px-6 py-4 font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
          >
            Bài đã lưu
          </Link>
          <button className="whitespace-nowrap border-b-2 border-transparent px-6 py-4 font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            Yêu thích
          </button>
          <button className="whitespace-nowrap border-b-2 border-transparent px-6 py-4 font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200">
            Lịch sử xem
          </button>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold text-white">Bài đăng của tôi</h2>
          <Link href="/posts/create" className="btn-primary inline-flex items-center justify-center gap-2">
            <span>+</span> Đăng tin mới
          </Link>
        </div>

        <div className="mb-8 flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
          <button className="whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors">
            Tất cả ({myPosts.length})
          </button>
          <button className="whitespace-nowrap rounded-full border border-white/10 bg-transparent px-5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            Đang bán ({saleCount})
          </button>
          <button className="whitespace-nowrap rounded-full border border-white/10 bg-transparent px-5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            Đang cho thuê ({rentCount})
          </button>
          <button className="whitespace-nowrap rounded-full border border-white/10 bg-transparent px-5 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            Đã bán/cho thuê (0)
          </button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="inline-flex items-center gap-3 text-gray-300">
              <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
              Đang tải bài đăng...
            </div>
          </div>
        ) : myPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-gray-400">
            Bạn chưa có bài đăng nào đang hiển thị. Hãy tạo bài đăng mới trên bảng tin.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {myPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
