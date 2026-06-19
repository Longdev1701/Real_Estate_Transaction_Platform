"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { BadgeCheck, LoaderCircle, Star, Mail, Phone, CalendarDays, MessageCircle, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { ProfilePostCard } from "@/components/post/ProfilePostCard";
import { buildPostQuery, defaultPostFilter, type Post, type PostAuthor, type PostListData } from "@/lib/posts";
import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { useAuthStore } from "@/stores/auth.store";
import { confirm } from "@/stores/confirm.store";
import { toast } from "@/stores/toast.store";

type PostViewTab = "ALL" | "SELL" | "RENT" | "BANNED";

export default function ProfilePostsPage() {
  const searchParams = useSearchParams();
  const authorId = searchParams.get("authorId");
  const initialPublicPayload = authorId
    ? readSessionCache<PostListData>(`profile:posts:${authorId}:public`)
    : null;
  const initialPublicPosts = initialPublicPayload?.items ?? [];
  const initialAuthorPreview = authorId
    ? readSessionCache<PostAuthor>(`profile:author:${authorId}`)
    : null;
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>(initialPublicPosts);
  const [authorPreview, setAuthorPreview] = useState<PostAuthor | null>(initialAuthorPreview);
  const [activeTab, setActiveTab] = useState<PostViewTab>("ALL");
  const [mainTab, setMainTab] = useState<"posts" | "about">("posts");
  const [isLoading, setIsLoading] = useState(!initialPublicPayload);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  const targetAuthorId = authorId ?? user?.id ?? "";

  useEffect(() => {
    if (!targetAuthorId) {
      setAuthorPreview(null);
      return;
    }

    setAuthorPreview(readSessionCache<PostAuthor>(`profile:author:${targetAuthorId}`));
  }, [targetAuthorId]);

  useEffect(() => {
    if (!authorId && (!hasHydrated || isLoadingUser)) {
      return;
    }

    let isMounted = true;

    const fetchPosts = async () => {
      let hasCachedPayload = false;

      try {
        setError(null);
        const targetAuthorId = authorId ?? user?.id;
        if (!targetAuthorId) {
          setPosts([]);
          setIsLoading(false);
          return;
        }

        const isOwnerView = !authorId && Boolean(user?.id) && targetAuthorId === user?.id;
        const cacheKey = `profile:posts:${targetAuthorId}:${isOwnerView ? "owner" : "public"}`;
        const cachedPayload = readSessionCache<PostListData>(cacheKey);
        hasCachedPayload = Boolean(cachedPayload);

        if (cachedPayload && isMounted) {
          setPosts(cachedPayload.items);
          setIsLoading(false);
        } else {
          setPosts([]);
          setIsLoading(true);
        }

        const query = buildPostQuery(
          {
            ...defaultPostFilter,
            ...(isOwnerView ? {} : { authorId: targetAuthorId }),
          },
          1,
          30,
        );
        const listQuery = isOwnerView ? query : `${query}&imageLimit=1`;

        if (isOwnerView && !accessToken) {
          setPosts([]);
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem bài đăng của bạn.");
          return;
        }

        const endpoint = isOwnerView ? `/posts/mine?${query}` : `/posts?${listQuery}`;
        const response = await api.get<{ data: PostListData }>(endpoint);
        if (isMounted) {
          setPosts(response.data.data.items);
          writeSessionCache(cacheKey, response.data.data, { ttlMs: isOwnerView ? 60_000 : 5 * 60_000 });
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted && !hasCachedPayload) {
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
  }, [accessToken, authorId, hasHydrated, isLoadingUser, user?.id]);

  const myPosts = useMemo(() => (targetAuthorId ? posts : []), [posts, targetAuthorId]);
  const targetAuthor = myPosts[0]?.author ?? authorPreview;
  const isOwnProfile = !authorId && !!user && targetAuthorId === user.id;

  const saleCount = useMemo(
    () => myPosts.filter((post) => post.postType === "SELL" && post.status !== "BANNED").length,
    [myPosts],
  );
  const rentCount = useMemo(
    () => myPosts.filter((post) => post.postType === "RENT" && post.status !== "BANNED").length,
    [myPosts],
  );
  const bannedCount = useMemo(
    () => myPosts.filter((post) => post.status === "BANNED").length,
    [myPosts],
  );

  const visiblePosts = useMemo(() => {
    switch (activeTab) {
      case "SELL":
        return myPosts.filter((post) => post.postType === "SELL" && post.status !== "BANNED");
      case "RENT":
        return myPosts.filter((post) => post.postType === "RENT" && post.status !== "BANNED");
      case "BANNED":
        return myPosts.filter((post) => post.status === "BANNED");
      case "ALL":
      default:
        return myPosts;
    }
  }, [activeTab, myPosts]);

  const emptyStateMessage = useMemo(() => {
    switch (activeTab) {
      case "SELL":
        return "Chưa có bài đăng bán nào.";
      case "RENT":
        return "Chưa có bài đăng cho thuê nào.";
      case "BANNED":
        return "Bạn chưa có bài đăng nào bị khóa.";
      case "ALL":
      default:
        return "Chưa có bài đăng nào trong hồ sơ này.";
    }
  }, [activeTab]);

  useEffect(() => {
    if (!isOwnProfile && activeTab === "BANNED") {
      setActiveTab("ALL");
    }
  }, [activeTab, isOwnProfile]);

  const handleMessageClick = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    if (!targetAuthorId) return;

    if (user.id === targetAuthorId) {
      toast.warning("Bạn không thể tự nhắn tin cho chính mình.");
      return;
    }

    if (isStartingConversation) return;

    try {
      setIsStartingConversation(true);
      const response = await api.post("/conversations", {
        sellerId: targetAuthorId
      });
      const conversation = response.data.data.conversation;
      writeSessionCache(`messages_${conversation.id}`, {
        conversation,
        messages: [],
        nextCursor: null,
      });
      router.push(`/messages/${conversation.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message ?? "Không thể bắt đầu cuộc trò chuyện lúc này.");
      console.error("Failed to start conversation:", err);
    } finally {
      setIsStartingConversation(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const confirmed = await confirm({
      title: "Xóa bài đăng",
      message: "Bạn có chắc chắn muốn xóa bài đăng này không?",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy"
    });
    if (!confirmed) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
      const axiosError = err as AxiosError<{ message?: string }>;
      toast.error(axiosError.response?.data?.message ?? "Không thể xóa bài đăng. Vui lòng thử lại.");
    }
  };

  if (!authorId && (!hasHydrated || isLoadingUser)) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Cover & Profile Header Skeleton */}
        <div className="relative mb-6 overflow-hidden rounded-2xl glass-panel animate-pulse">
          <div className="relative h-48 w-full md:h-72 bg-[var(--surface-muted)]" />
          <div className="relative -mt-16 flex flex-col items-start justify-between gap-6 px-6 pb-8 md:-mt-24 md:flex-row md:items-end md:px-10">
            <div className="flex w-full flex-col items-start gap-6 md:w-auto md:flex-row md:items-end">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-[var(--border)] bg-[var(--surface-muted)] md:h-44 md:w-44" />
              <div className="w-full pb-2 space-y-3">
                <div className="h-8 w-48 rounded-lg bg-[var(--surface-muted)]" />
                <div className="h-4 w-32 rounded-lg bg-[var(--surface-muted)]" />
                <div className="h-4 w-64 rounded-lg bg-[var(--surface-muted)]" />
                <div className="flex gap-6 mt-4">
                  <div className="h-8 w-16 rounded-lg bg-[var(--surface-muted)]" />
                  <div className="h-8 w-16 rounded-lg bg-[var(--surface-muted)]" />
                  <div className="h-8 w-16 rounded-lg bg-[var(--surface-muted)]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector Skeleton */}
        <div className="glass-panel mb-8 overflow-hidden rounded-2xl h-14 bg-[var(--surface-muted)] animate-pulse" />

        {/* Posts Container Skeleton */}
        <div className="glass-card p-6 md:p-8 space-y-6">
          <div className="h-8 w-48 rounded-lg bg-[var(--surface-muted)] animate-pulse" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="glass-card overflow-hidden p-0 animate-pulse">
                <div className="aspect-[16/10] bg-[var(--surface-muted)]" />
                <div className="space-y-4 p-5">
                  <div className="h-6 w-3/4 rounded bg-[var(--surface-muted)]" />
                  <div className="h-4 w-1/2 rounded bg-[var(--surface-muted)]" />
                  <div className="h-4 w-2/3 rounded bg-[var(--surface-muted)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user && !authorId) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
        <div className="glass-card mx-auto max-w-3xl p-8 text-center">
          <p className="text-lg text-[var(--secondary-foreground)]">Vui lòng đăng nhập để xem hồ sơ của bạn.</p>
          <Link href="/auth/login" className="btn-primary mt-6 inline-flex">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  const displayName = isOwnProfile
    ? (user?.fullName ?? user?.name ?? user?.email ?? "Tôi")
    : (targetAuthor?.fullName ?? "Người đăng");
  const avatarUrl = isOwnProfile
    ? (user?.avatarUrl ?? null)
    : (targetAuthor?.avatarUrl ?? null);
  const profileMeta = isOwnProfile ? `@${(user?.email ?? "user").split("@")[0]}` : "Hồ sơ công khai";

  const listTitle = isOwnProfile ? "Bài đăng của tôi" : `Bài đăng của ${displayName}`;
  const bio = isOwnProfile
    ? ((user as any)?.bio ?? null)
    : ((targetAuthor as any)?.bio ?? null);
  const address = isOwnProfile
    ? ((user as any)?.address ?? null)
    : ((targetAuthor as any)?.address ?? null);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="relative mb-6 overflow-hidden rounded-2xl glass-panel">
        <div className="relative h-48 w-full md:h-72">
          <img
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80&w=2000"
            alt="Cover"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--app-bg-start)] to-transparent" />
        </div>

        <div className="relative -mt-16 flex flex-col items-start justify-between gap-6 px-6 pb-8 md:-mt-24 md:flex-row md:items-end md:px-10">
          <div className="flex w-full flex-col items-start gap-6 md:w-auto md:flex-row md:items-end">
            <div className="relative shrink-0 z-10 md:mb-0 mb-4">
              <div className="absolute inset-0 rounded-full bg-[var(--accent)] blur-md opacity-30 transition-opacity hover:opacity-50"></div>
              <div className="relative h-32 w-32 md:h-44 md:w-44 shrink-0 overflow-hidden rounded-full border-[6px] border-[var(--surface)] bg-[var(--surface-muted)] text-3xl md:text-5xl font-bold text-[var(--muted-foreground)] shadow-xl transition-transform hover:scale-[1.02]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--muted-foreground)]">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">{displayName}</h1>
                <BadgeCheck className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <div className="mt-3 max-w-2xl space-y-2">
                {bio ? (
                  <p className="text-sm text-[var(--secondary-foreground)] whitespace-pre-wrap">{bio}</p>
                ) : isOwnProfile ? (
                  <p className="text-sm text-[var(--secondary-foreground)]">
                    Chào mừng bạn đến với trang quản lý cá nhân. Tại đây bạn có thể dễ dàng theo dõi và quản lý các bài đăng bất động sản của mình.
                  </p>
                ) : null}
                {address && (
                  <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{address}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center w-full justify-between gap-2 md:w-auto md:justify-start md:gap-10">
                <div className="flex-1 text-center md:flex-none md:text-left">
                  <div className="text-xl font-bold text-[var(--foreground)]">{myPosts.length}</div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap">Bài đăng</div>
                </div>
                <div className="flex-1 text-center md:flex-none md:text-left">
                  <div className="text-xl font-bold text-[var(--foreground)]">{saleCount}</div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap">Đang bán</div>
                </div>
                <div className="flex-1 text-center md:flex-none md:text-left">
                  <div className="text-xl font-bold text-[var(--foreground)]">{rentCount}</div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap">Cho thuê</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex w-full pb-2 md:w-auto md:justify-end">
            {isOwnProfile ? (
              <Link
                href="/profile"
                className="w-full rounded-xl border border-[var(--accent-border)] bg-[var(--accent-soft)] px-6 py-2.5 text-center font-medium text-[var(--accent)] transition-colors hover:brightness-95 md:w-auto"
              >
                Chỉnh sửa hồ sơ
              </Link>
            ) : (
              <button 
                onClick={handleMessageClick}
                disabled={isStartingConversation}
                className="btn-primary inline-flex w-full items-center justify-center gap-2 md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStartingConversation ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5" />
                )}
                Nhắn tin
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel mb-8 overflow-hidden rounded-2xl p-1.5 shadow-sm">
        <div className="flex w-full gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: "posts", label: isOwnProfile ? "Bài đăng của tôi" : "Bài đăng" },
            { id: "about", label: "Giới thiệu" },
          ].map((tab) => {
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as "posts" | "about")}
                className={`relative flex-1 md:flex-none whitespace-nowrap px-4 py-3 sm:px-8 sm:py-3.5 text-sm sm:text-base font-medium transition-colors z-10 ${
                  isActive ? "text-[var(--accent)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mainTabIndicatorPosts"
                    className="absolute inset-0 z-[-1] rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
      {mainTab === "posts" && (
        <motion.div
          key="posts"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-card p-6 md:p-8"
        >
          <div className="mb-8 flex flex-col gap-6 md:flex-row-reverse md:items-center md:justify-between">
            {isOwnProfile ? (
              <div className="flex shrink-0">
                <Link href="/posts/create" className="btn-primary inline-flex w-full items-center justify-center gap-2 md:w-auto">
                  <span>+</span> Đăng bài mới
                </Link>
              </div>
            ) : null}

            <div className="flex w-full gap-2 overflow-x-auto p-1 hide-scrollbar md:pb-0 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm">
              {[
                { key: "ALL" as const, label: "Tất cả", count: myPosts.length },
                { key: "SELL" as const, label: "Đang bán", count: saleCount },
                { key: "RENT" as const, label: "Đang cho thuê", count: rentCount },
                ...(isOwnProfile ? [{ key: "BANNED" as const, label: "Bị khóa", count: bannedCount }] : []),
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-medium transition-colors z-10 ${
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="subTabIndicatorPosts"
                        className="absolute inset-0 z-[-1] rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-border)] shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {tab.label} ({tab.count})
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="theme-badge-danger mb-6 rounded-2xl p-4 text-sm">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="inline-flex items-center gap-3 text-[var(--secondary-foreground)]">
                <LoaderCircle className="h-5 w-5 animate-spin text-[var(--accent)]" />
                Đang tải bài đăng...
              </div>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
              {emptyStateMessage}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {visiblePosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <ProfilePostCard 
                      post={post} 
                      isOwnProfile={isOwnProfile}
                      onDelete={isOwnProfile ? handleDeletePost : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      )}

      {mainTab === "about" && (
        <motion.div 
          key="about"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-card p-6 md:p-8"
        >
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Thông tin mô tả</h3>
                <p className="leading-relaxed text-sm text-[var(--secondary-foreground)] whitespace-pre-wrap">
                  {bio || `Hiện tại ${displayName} chưa cập nhật thông tin giới thiệu chi tiết. Hãy theo dõi để cập nhật thêm thông tin về người đăng này trong tương lai.`}
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Thông tin liên hệ</h3>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--info-soft)] text-[var(--info)]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Email</p>
                      <p className="font-medium text-[var(--foreground)]">{isOwnProfile ? (user?.email || "Đang cập nhật") : (targetAuthor?.email || "Đang cập nhật")}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Số điện thoại</p>
                      <p className="font-medium text-[var(--foreground)]">{isOwnProfile ? (user?.phone || "Đang cập nhật") : ((targetAuthor as any)?.phone || "Đang cập nhật")}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Ngày tham gia</p>
                      <p className="font-medium text-[var(--foreground)]">Tháng 1, 2024</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

