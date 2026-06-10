"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { BadgeCheck, LoaderCircle, Star, Mail, Phone, CalendarDays, MessageCircle } from "lucide-react";

import { ProfilePostCard } from "@/components/post/ProfilePostCard";
import { buildPostQuery, defaultPostFilter, type Post, type PostListData } from "@/lib/posts";
import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { useAuthStore } from "@/stores/auth.store";

type PostViewTab = "ALL" | "SELL" | "RENT" | "SOLD" | "BANNED";

export default function ProfilePostsPage() {
  const searchParams = useSearchParams();
  const authorId = searchParams.get("authorId");
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<PostViewTab>("ALL");
  const [mainTab, setMainTab] = useState<"posts" | "about">("posts");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  useEffect(() => {
    if (!hasHydrated) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const targetAuthorId = authorId ?? user?.id;
        if (!targetAuthorId) {
          setPosts([]);
          return;
        }

        const isOwnerView = Boolean(user?.id) && targetAuthorId === user?.id;
        const query = buildPostQuery(
          {
            ...defaultPostFilter,
            ...(isOwnerView ? {} : { authorId: targetAuthorId }),
          },
          1,
          30,
        );
        const cacheKey = `profile:posts:${targetAuthorId}:${isOwnerView ? "owner" : "public"}`;
        if (!isOwnerView) {
          const cachedPayload = readSessionCache<PostListData>(cacheKey);
          if (cachedPayload && isMounted) {
            setPosts(cachedPayload.items);
            setIsLoading(false);
          }
        }

        if (isOwnerView && !accessToken) {
          setPosts([]);
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem bài đăng của bạn.");
          return;
        }

        const endpoint = isOwnerView ? `/posts/mine?${query}` : `/posts?${query}`;
        const response = await api.get<{ data: PostListData }>(endpoint);
        if (isMounted) {
          setPosts(response.data.data.items);
          if (!isOwnerView) {
            writeSessionCache(cacheKey, response.data.data);
          }
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
  }, [accessToken, authorId, hasHydrated, user?.id]);

  const targetAuthorId = authorId ?? user?.id ?? "";
  const myPosts = useMemo(() => (targetAuthorId ? posts : []), [posts, targetAuthorId]);
  const targetAuthor = myPosts[0]?.author;
  const isOwnProfile = !!user && targetAuthorId === user.id;

  const saleCount = useMemo(
    () => myPosts.filter((post) => post.postType === "SELL" && post.status !== "BANNED").length,
    [myPosts],
  );
  const rentCount = useMemo(
    () => myPosts.filter((post) => post.postType === "RENT" && post.status !== "BANNED").length,
    [myPosts],
  );
  const soldCount = useMemo(() => myPosts.filter((post) => post.status === "SOLD").length, [myPosts]);
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
      case "SOLD":
        return myPosts.filter((post) => post.status === "SOLD");
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
      case "SOLD":
        return "Chưa có bài đăng nào đã bán hoặc đã cho thuê.";
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
      alert("Bạn không thể tự nhắn tin cho chính mình.");
      return;
    }

    const postId = myPosts.length > 0 ? myPosts[0].id : null;
    
    if (!postId) {
      alert("Người dùng này chưa có bài đăng nào để có thể bắt đầu cuộc trò chuyện. Hãy đợi họ đăng tin bài nhé!");
      return;
    }

    if (isStartingConversation) return;

    try {
      setIsStartingConversation(true);
      const response = await api.post("/conversations", {
        postId: postId,
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
      alert(axiosError.response?.data?.message ?? "Không thể bắt đầu cuộc trò chuyện lúc này.");
      console.error("Failed to start conversation:", err);
    } finally {
      setIsStartingConversation(false);
    }
  };

  if (!hasHydrated || isLoadingUser) {
    return null;
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

  const displayName =
    targetAuthor?.fullName ?? user?.fullName ?? user?.name ?? user?.email ?? "Người đăng";
  const avatarUrl = targetAuthor?.avatarUrl ?? (isOwnProfile ? user?.avatarUrl ?? null : null);
  const profileMeta = isOwnProfile ? `@${(user?.email ?? "user").split("@")[0]}` : "Hồ sơ công khai";

  const listTitle = isOwnProfile ? "Bài đăng của tôi" : `Bài đăng của ${displayName}`;

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
            <div className="theme-avatar-ring relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 md:h-44 md:w-44">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-[var(--primary-foreground)]">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="w-full pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">{displayName}</h1>
                <BadgeCheck className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <p className="mt-1 text-[var(--muted-foreground)]">{profileMeta}</p>
              {isOwnProfile ? (
                <p className="mt-3 max-w-2xl text-sm text-[var(--secondary-foreground)]">
                  Chào mừng bạn đến với trang quản lý cá nhân. Tại đây bạn có thể dễ dàng theo dõi và quản lý các bài đăng bất động sản của mình.
                </p>
              ) : null}

              <div className="mt-5 flex items-center gap-6 md:gap-10">
                <div>
                  <div className="text-xl font-bold text-[var(--foreground)]">{myPosts.length}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Bài đăng</div>
                </div>

                <div>
                  <div className="text-xl font-bold text-[var(--foreground)]">{saleCount}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Đang bán</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[var(--foreground)]">{rentCount}</div>
                  <div className="mt-1 text-xs uppercase tracking-wider text-[var(--muted-foreground)]">Cho thuê</div>
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

      <div className="glass-panel mb-8 overflow-hidden rounded-2xl">
        <div className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setMainTab("posts")}
            className={`whitespace-nowrap border-b-2 px-6 py-4 font-medium transition-colors ${
              mainTab === "posts"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {isOwnProfile ? "Bài đăng của tôi" : "Bài đăng"}
          </button>
          <button
            onClick={() => setMainTab("about")}
            className={`whitespace-nowrap border-b-2 px-6 py-4 font-medium transition-colors ${
              mainTab === "about"
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Giới thiệu
          </button>
          {isOwnProfile ? (
            <button className="whitespace-nowrap border-b-2 border-transparent px-6 py-4 font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
              Lịch sử xem
            </button>
          ) : null}
        </div>
      </div>

      {mainTab === "posts" && (
        <div className="glass-card p-6 md:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="text-2xl font-bold text-[var(--foreground)]">{listTitle}</h2>
          {isOwnProfile ? (
            <Link href="/posts/create" className="btn-primary inline-flex items-center justify-center gap-2">
              <span>+</span> Đăng bài mới
            </Link>
          ) : null}
          </div>

          <div className="mb-8 flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {[
              { key: "ALL" as const, label: "Tất cả", count: myPosts.length },
              { key: "SELL" as const, label: "Đang bán", count: saleCount },
              { key: "RENT" as const, label: "Đang cho thuê", count: rentCount },
              { key: "SOLD" as const, label: "Đã bán/cho thuê", count: soldCount },
              ...(isOwnProfile ? [{ key: "BANNED" as const, label: "Bị khóa", count: bannedCount }] : []),
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                      : "border-[var(--border)] bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => (
                <ProfilePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {mainTab === "about" && (
        <div className="glass-card p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">Giới thiệu về {displayName}</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <h3 className="mb-3 text-lg font-semibold text-[var(--foreground)]">Thông tin mô tả</h3>
                <p className="leading-relaxed text-sm text-[var(--secondary-foreground)]">
                  Hiện tại {displayName} chưa cập nhật thông tin giới thiệu chi tiết. 
                  Hãy theo dõi để cập nhật thêm thông tin về người đăng này trong tương lai.
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
                      <p className="font-medium text-[var(--foreground)]">{targetAuthor?.email || "Đang cập nhật"}</p>
                    </div>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--success-soft)] text-[var(--success)]">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Số điện thoại</p>
                      <p className="font-medium text-[var(--foreground)]">{targetAuthor?.phone || "Đang cập nhật"}</p>
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
        </div>
      )}
    </div>
  );
}
