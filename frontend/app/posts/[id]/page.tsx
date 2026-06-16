"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Expand,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Trash2,
  X,
  Hash,
  User,
  Map,
  Activity,
  Copy,
  Check,
} from "lucide-react";

import { api } from "@/lib/api";
import { getVersionedStorageKey, readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { FeatureIcon } from "@/lib/feature-icons";
import { motion } from "framer-motion";
import { groupFeaturesByCategory } from "@/lib/feature-groups";
import {
  buildPostQuery,
  defaultPostFilter,
  formatArea,
  formatCompactPrice,
  formatLocation,
  formatPrice,
  propertyTypeLabels,
  statusLabels,
  statusColors,
  type Post,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";
import { confirm } from "@/stores/confirm.store";
import { toast } from "@/stores/toast.store";
import dynamic from "next/dynamic";
import CommentSection from "@/components/comment/CommentSection";
import { PostImageViewer } from "@/components/post/PostImageViewer";
import { AnimatedSidebar, PulseButton } from "@/components/post/AnimatedSidebar";
import { RelatedPostsCarousel } from "@/components/post/RelatedPostsCarousel";
import { AppealBanDialog } from "@/components/post/AppealBanDialog";
import { ReportPostDialog } from "@/components/post/ReportPostDialog";

const PostDetailMap = dynamic(() => import("@/components/map/PostDetailMap"), {
  ssr: false,
  loading: () => (
    <div className="mt-2 flex h-[360px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-xs text-[var(--muted-foreground)]">
      Đang tải bản đồ...
    </div>
  ),
});

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='52'>TrustEstate</text></svg>";

const savedKey = getVersionedStorageKey("trustestate-saved-posts");
const compareStorageKey = getVersionedStorageKey("compared_posts");
const POST_DETAIL_CACHE_TTL_MS = 2 * 60 * 1000;
const RELATED_POSTS_CACHE_TTL_MS = 5 * 60 * 1000;

const getPostDetailCacheKey = (postId: string) => `posts:detail:${postId}`;
const getRelatedPostsCacheKey = (postId: string) => `posts:related:v2:${postId}`;

const isUsablePostDetailCache = (value: Post | null): value is Post =>
  Boolean(value?.id && value.author && Array.isArray(value.images));

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isRelatedPostsLoading, setIsRelatedPostsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isAppealDialogOpen, setIsAppealDialogOpen] = useState(false);

  // Copy state
  const [isCopied, setIsCopied] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const prefetchingPostIdsRef = useRef<Set<string>>(new Set());
  const prefetchingAuthorIdsRef = useRef<Set<string>>(new Set());

  const handleBackToPosts = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/posts");
  }, [router]);

  const prefetchPostDetail = useCallback(
    (postId: string) => {
      if (!postId || postId === params.id || prefetchingPostIdsRef.current.has(postId)) {
        return;
      }

      const cacheKey = getPostDetailCacheKey(postId);
      if (isUsablePostDetailCache(readSessionCache<Post>(cacheKey))) {
        return;
      }

      prefetchingPostIdsRef.current.add(postId);
      router.prefetch(`/posts/${postId}`);

      void api
        .get<{ data: Post }>(`/posts/${postId}?includeRelated=false`)
        .then((response) => {
          writeSessionCache(cacheKey, response.data.data, { ttlMs: POST_DETAIL_CACHE_TTL_MS });
        })
        .catch(() => {})
        .finally(() => {
          prefetchingPostIdsRef.current.delete(postId);
        });
    },
    [params.id, router],
  );

  const prefetchAuthorProfile = useCallback(() => {
    if (!post?.author?.id || prefetchingAuthorIdsRef.current.has(post.author.id)) {
      return;
    }

    const authorId = post.author.id;
    const profilePostsCacheKey = `profile:posts:${authorId}:public`;

    writeSessionCache(`profile:author:${authorId}`, post.author, {
      ttlMs: POST_DETAIL_CACHE_TTL_MS,
    });
    router.prefetch(`/profile/posts?authorId=${authorId}`);

    if (readSessionCache(profilePostsCacheKey)) {
      return;
    }

    prefetchingAuthorIdsRef.current.add(authorId);
    const query = `${buildPostQuery(
      {
        ...defaultPostFilter,
        authorId,
      },
      1,
      30,
    )}&imageLimit=1`;

    void api
      .get(`/posts?${query}`)
      .then((response) => {
        writeSessionCache(profilePostsCacheKey, response.data.data, { ttlMs: 5 * 60_000 });
      })
      .catch(() => {})
      .finally(() => {
        prefetchingAuthorIdsRef.current.delete(authorId);
      });
  }, [post, router]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("post_image_viewer_state", { detail: { open: isFullscreen } }),
    );
  }, [isFullscreen]);

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("post_image_viewer_state", { detail: { open: false } }),
      );
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setRelatedPosts([]);
        const cacheKey = getPostDetailCacheKey(params.id);
        const cachedPost = readSessionCache<Post>(cacheKey);

        if (isUsablePostDetailCache(cachedPost) && isMounted) {
          setPost(cachedPost);
          setSelectedImage(0);
          
          try {
            const storedCompare = localStorage.getItem(compareStorageKey);
            const compareList = storedCompare ? JSON.parse(storedCompare) : [];
            if (Array.isArray(compareList)) {
              setIsCompared(compareList.some((item: any) => item.id === cachedPost.id));
            }
          } catch (e) {}

          setIsLoading(false);
        }

        const response = await api.get<{ data: Post }>(`/posts/${params.id}?includeRelated=false`);

        if (!isMounted) {
          return;
        }

        const currentPost = response.data.data;
        setPost(currentPost);
        setSelectedImage(0);
        writeSessionCache(cacheKey, currentPost, { ttlMs: POST_DETAIL_CACHE_TTL_MS });
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải chi tiết bài đăng.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  const relatedPostId = post?.id ?? "";
  const relatedPostCity = post?.city ?? "";
  const relatedPostPropertyType = post?.propertyType ?? "";
  const relatedPostsListHref = useMemo(() => {
    if (!relatedPostCity || !relatedPostPropertyType) {
      return "/posts";
    }

    return `/posts?${buildPostQuery(
      {
        ...defaultPostFilter,
        city: relatedPostCity,
        propertyType: relatedPostPropertyType,
      },
      1,
      15,
    )}`;
  }, [relatedPostCity, relatedPostPropertyType]);

  useEffect(() => {
    if (!relatedPostId || !relatedPostCity || !relatedPostPropertyType) return;

    let isMounted = true;
    const cacheKey = getRelatedPostsCacheKey(relatedPostId);
    const cachedRelatedPosts = readSessionCache<Post[]>(cacheKey);

    if (cachedRelatedPosts) {
      setRelatedPosts(cachedRelatedPosts);
    } else {
      setRelatedPosts([]);
    }
    setIsRelatedPostsLoading(!cachedRelatedPosts);

    const fetchRelatedPosts = async () => {
      try {
        const query = `${buildPostQuery(
          {
            ...defaultPostFilter,
            city: relatedPostCity,
            propertyType: relatedPostPropertyType,
          },
          1,
          4,
        )}&imageLimit=1`;

        const response = await api.get<{ data: { items: Post[] } }>(`/posts?${query}`);
        if (!isMounted) return;

        const nextRelatedPosts = response.data.data.items
          .filter((item) => item.id !== relatedPostId)
          .slice(0, 3);

        setRelatedPosts(nextRelatedPosts);
        writeSessionCache(cacheKey, nextRelatedPosts, { ttlMs: RELATED_POSTS_CACHE_TTL_MS });
      } catch (error) {
        if (!cachedRelatedPosts) {
          setRelatedPosts([]);
        }
        console.error("Failed to load related posts:", error);
      } finally {
        if (isMounted) {
          setIsRelatedPostsLoading(false);
        }
      }
    };

    void fetchRelatedPosts();

    return () => {
      isMounted = false;
    };
  }, [relatedPostCity, relatedPostId, relatedPostPropertyType]);

  useEffect(() => {
    if (!post) {
      setIsCompared(false);
      return;
    }

    const handleCompareUpdate = () => {
      try {
        const stored = window.localStorage.getItem(compareStorageKey);
        const parsed = stored ? JSON.parse(stored) : [];
        const list = Array.isArray(parsed) ? (parsed as Post[]) : [];
        setIsCompared(list.some((item) => item.id === post.id));
      } catch {
        setIsCompared(false);
      }
    };

    handleCompareUpdate();
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, [post]);

  const canManagePost = useMemo(() => {
    if (!user || !post) {
      return false;
    }

    return user.id === post.author.id;
  }, [post, user]);

  const images = useMemo(() => {
    if (!post) {
      return [];
    }

    return post.images.length > 0 ? post.images : [{ id: "fallback", imageUrl: imageFallback, order: 0 }];
  }, [post]);

  const activeImage = images[selectedImage]?.imageUrl ?? imageFallback;
  const isOwnPost = !!user && !!post && user.id === post.author.id;
  const isBannedOwnerView = Boolean(post && isOwnPost && post.status === "BANNED");
  const groupedFeatures = useMemo(
    () => groupFeaturesByCategory(post?.features ?? []),
    [post?.features],
  );

  const handleScrollToMap = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!post) return;
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem(compareStorageKey);
        const list = stored ? JSON.parse(stored) : [];
        setIsCompared(Array.isArray(list) && list.some((item: any) => item.id === post.id));
      } catch {
        setIsCompared(false);
      }
    };
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, [post]);

  const handleSaveToggle = async () => {
    const rawValue = window.localStorage.getItem(savedKey);
    const savedPosts = rawValue ? (JSON.parse(rawValue) as string[]) : [];
    const nextSavedPosts = isSaved
      ? savedPosts.filter((postId) => postId !== params.id)
      : Array.from(new Set([...savedPosts, params.id]));

    if (!post) {
      return;
    }

    try {
      setIsSaveSubmitting(true);
      setError(null);
      const nextSaved = !post.isSaved;
      setPost((currentPost) => {
        if (!currentPost) return currentPost;
        const nextPost = {
          ...currentPost,
          isSaved: nextSaved,
        };
        writeSessionCache(getPostDetailCacheKey(nextPost.id), nextPost, {
          ttlMs: POST_DETAIL_CACHE_TTL_MS,
        });
        return nextPost;
      });

      if (post.isSaved) {
        await api.delete(`/saved-posts/${post.id}`);
      } else {
        await api.post("/saved-posts", { postId: post.id });
      }
    } catch (err) {
      setPost((currentPost) => {
        if (!currentPost) return currentPost;
        const nextPost = {
          ...currentPost,
          isSaved: post.isSaved,
        };
        writeSessionCache(getPostDetailCacheKey(nextPost.id), nextPost, {
          ttlMs: POST_DETAIL_CACHE_TTL_MS,
        });
        return nextPost;
      });
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể cập nhật bài đã lưu.");
    } finally {
      setIsSaveSubmitting(false);
    }
  };

  const handleOpenReportDialog = () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setIsReportDialogOpen(true);
  };

  const handleAppealSubmitted = () => {
    setPost((currentPost) => {
      if (!currentPost?.banContext) {
        return currentPost;
      }

      const nextPost = {
        ...currentPost,
        banContext: {
          ...currentPost.banContext,
          appealStatus: "PENDING" as const,
          appealedAt: new Date().toISOString(),
        },
      };
      writeSessionCache(getPostDetailCacheKey(nextPost.id), nextPost, {
        ttlMs: POST_DETAIL_CACHE_TTL_MS,
      });
      return nextPost;
    });
  };
  const handleCopyId = () => {
    if (!post) return;
    navigator.clipboard.writeText(post.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Xóa bài đăng",
      message: "Bạn có chắc chắn muốn xóa bài đăng này?",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy"
    });
    if (!confirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/posts/${params.id}`);
      router.push("/posts");
      router.refresh();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể xóa bài đăng.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!post) return;

    try {
      const stored = localStorage.getItem(compareStorageKey);
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const exists = list.some((item: any) => item.id === post.id);
      if (exists) {
        list = list.filter((item: any) => item.id !== post.id);
        setIsCompared(false);
        toast.success("Đã bỏ so sánh bất động sản.");
      } else {
        if (list.length >= 3) {
          toast.warning("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
          return;
        }
        if (list.length > 0 && list[0].postType !== post.postType) {
          toast.warning("Không thể so sánh bất động sản Bán với bất động sản Cho thuê.");
          return;
        }
        list.push(post);
        setIsCompared(true);
        toast.success("Đã thêm vào danh sách so sánh.");
      }
      localStorage.setItem(compareStorageKey, JSON.stringify(list));
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMessageClick = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    if (!post) {
      return;
    }

    if (user.id === post.author.id) {
      setConversationError("Đây là bài đăng của bạn. Không thể tự tạo cuộc trò chuyện.");
      return;
    }

    if (isStartingConversation) {
      return;
    }

    try {
      setIsStartingConversation(true);
      setConversationError(null);
      const response = await api.post("/conversations", {
        postId: post.id,
        sellerId: post.author.id
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
      setConversationError(
        axiosError.response?.data?.message ?? "Không thể bắt đầu cuộc trò chuyện lúc này."
      );
      console.error("Failed to start conversation:", err);
    } finally {
      setIsStartingConversation(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-5 px-4 pt-5 pb-28 lg:space-y-6 lg:px-8 lg:py-10">
        {/* Breadcrumb Skeleton */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="theme-skeleton h-4 w-16 rounded" />
          <span>/</span>
          <div className="theme-skeleton h-4 w-20 rounded" />
          <span>/</span>
          <div className="theme-skeleton h-4 w-48 rounded" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6 min-w-0">
            {/* Image Gallery Skeleton */}
            <div className="theme-card rounded-2xl overflow-hidden p-0">
              <div className="theme-skeleton aspect-[16/10] lg:aspect-[16/9] w-full" />
            </div>

            {/* Details Skeleton */}
            <div className="theme-card rounded-2xl p-4 sm:p-5 md:p-7 space-y-6">
              <div className="space-y-3">
                <div className="theme-skeleton h-8 w-[80%] rounded-lg" />
                <div className="theme-skeleton h-4 w-[40%] rounded" />
              </div>
              <hr className="border-[var(--border)]" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="theme-skeleton h-6 w-24 rounded" />
                    <div className="theme-skeleton h-4 w-16 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities & Features Skeleton */}
            <div className="theme-card rounded-2xl p-6 space-y-6">
              <div className="theme-skeleton h-6 w-48 rounded" />
              <div className="space-y-6">
                {[...Array(2)].map((_, c) => (
                  <div key={c} className="space-y-3">
                    <div className="theme-skeleton h-4 w-24 rounded" />
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                      {[...Array(4)].map((_, f) => (
                        <div key={f} className="theme-surface-muted flex items-center gap-3 rounded-2xl p-3.5">
                          <div className="theme-skeleton h-9 w-9 rounded-xl shrink-0" />
                          <div className="theme-skeleton h-4 w-20 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Map Skeleton */}
            <div className="theme-card rounded-2xl overflow-hidden p-0">
              <div className="border-b border-[var(--border)] px-6 py-4">
                <div className="theme-skeleton h-6 w-32 rounded" />
              </div>
              <div className="theme-skeleton h-[360px] w-full" />
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-5 min-w-0">
            <div className="theme-card rounded-2xl p-6 space-y-6">
              <div className="theme-skeleton h-6 w-32 rounded" />
              <div className="flex items-center gap-4">
                <div className="theme-skeleton h-16 w-16 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="theme-skeleton h-5 w-28 rounded" />
                  <div className="theme-skeleton h-4 w-20 rounded" />
                </div>
              </div>
              <div className="theme-skeleton h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="container mx-auto px-4 py-10 lg:px-8">
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-[var(--danger-foreground)]">{error}</p>
          <button type="button" onClick={handleBackToPosts} className="btn-primary mt-6">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  if (isBannedOwnerView) {
    return (
      <div className="container mx-auto space-y-4 px-4 pt-4 pb-12 lg:px-8 lg:py-8 min-h-[calc(100vh-6rem)] flex flex-col justify-center">
        <div className="hidden md:flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            Trang chủ
          </Link>
          <span>/</span>
          <Link href="/posts" className="transition hover:text-[var(--foreground)]">
            Bài đăng
          </Link>
          <span>/</span>
          <span className="text-[var(--foreground)]">Bài đăng bị khóa</span>
        </div>

        <div className="theme-shadow-lg mx-auto w-full max-w-3xl rounded-3xl border border-[var(--post-banned-shell-border)] bg-[image:var(--post-banned-shell)] p-4 sm:p-6">
          <div className="theme-surface-strong rounded-2xl border border-[var(--danger-border)] p-4 sm:p-6 md:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-1 text-xs font-semibold text-[var(--danger-foreground)]">
                <ShieldAlert className="h-3.5 w-3.5" />
                Bài đăng đã bị khóa do vi phạm
              </span>
              <h1 className="mt-3.5 text-xl font-bold text-[var(--foreground)] sm:text-2xl md:text-3xl">Bài đăng bị ẩn để chờ xử lý</h1>
              <p className="mt-2 text-xs leading-relaxed text-[var(--secondary-foreground)] sm:text-sm">
                Để bảo vệ trải nghiệm chung của người dùng, chúng tôi tạm thời ẩn toàn bộ nội dung
                của bài đăng này khỏi nền tảng. Nếu bạn cho rằng việc xử lý là chưa chính xác,
                bạn có thể gửi khiếu nại kèm bằng chứng để đội ngũ quản trị xem xét lại.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--danger-foreground)]">Lý do bị khóa</p>
                <p className="mt-1.5 text-sm font-bold text-[var(--foreground)]">{post.banContext?.reason || "Nội dung vi phạm chính sách hiển thị."}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--secondary-foreground)]">
                  {post.banContext?.description || "Bài đăng bị đánh giá là có dấu hiệu vi phạm nội dung hoặc thông tin không phù hợp với chính sách của nền tảng."}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--info-border)] bg-[var(--info-soft)] p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--info-foreground)]">Trạng thái khiếu nại</p>
                <p className="mt-1.5 text-sm font-bold text-[var(--foreground)]">
                  {post.banContext?.appealStatus === "PENDING"
                    ? "Đã gửi khiếu nại, chờ admin xem xét"
                    : "Chưa gửi khiếu nại"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--secondary-foreground)]">
                  {post.banContext?.appealStatus === "PENDING"
                    ? "Yêu cầu khiếu nại của bạn đã nằm trong hàng đợi báo cáo của admin."
                    : "Hãy chuẩn bị mô tả rõ ràng và bằng chứng cụ thể để tăng khả năng được xem xét lại."}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => setIsAppealDialogOpen(true)}
                disabled={post.banContext?.appealStatus === "PENDING"}
                className="theme-button-danger-solid inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {post.banContext?.appealStatus === "PENDING" ? "Đã gửi khiếu nại" : "Khiếu nại quyết định khóa bài"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/profile/posts")}
                className="theme-surface-soft inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại bài đăng của tôi
              </button>
            </div>
          </div>
        </div>

        {post.banContext ? (
          <AppealBanDialog
            open={isAppealDialogOpen}
            postTitle={post.title}
            banContext={post.banContext}
            onClose={() => setIsAppealDialogOpen(false)}
            onSubmitted={handleAppealSubmitted}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-5 px-4 pt-5 pb-28 lg:space-y-6 lg:px-8 lg:py-10">
      <div className="hidden lg:flex flex-wrap items-center gap-2 text-sm leading-6 text-[var(--muted-foreground)]">
        <Link href="/" className="transition hover:text-[var(--foreground)]">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/posts" className="transition hover:text-[var(--foreground)]">
          Bài đăng
        </Link>
        <span>/</span>
        <span className="line-clamp-2 text-[var(--foreground)]">{post.title}</span>
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          onClick={handleBackToPosts}
          className="theme-surface-soft inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </button>
      </div>

      {error && (
        <div className="theme-badge-danger rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 min-w-0">
          <div className="theme-card rounded-2xl overflow-hidden p-0">
            <div className={`grid gap-1 overflow-hidden ${images.length === 1 ? 'grid-cols-1' :
                images.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                  'grid-cols-1 lg:grid-cols-[1.8fr_1fr]'
              }`}>
              <div className="relative overflow-hidden w-full h-full group">
                <img
                  src={activeImage}
                  alt={post.title}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-cover aspect-[16/10] lg:aspect-[16/9] transition duration-700 group-hover:scale-[1.02] cursor-pointer"
                  onClick={() => setIsFullscreen(true)}
                  onError={(event) => {
                    event.currentTarget.src = imageFallback;
                  }}
                />

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                  className="theme-surface-strong absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[var(--surface-muted)] hover:scale-110 backdrop-blur-sm"
                  title="Phóng to ảnh"
                >
                  <Expand className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                    className="theme-surface-strong rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-all hover:bg-[var(--surface-muted)] backdrop-blur-sm"
                  >
                    Ảnh ({images.length})
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1)); }}
                      className="theme-surface-strong absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[var(--surface-muted)] hover:scale-110 backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage((current) => (current === images.length - 1 ? 0 : current + 1)); }}
                      className="theme-surface-strong absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] text-[var(--foreground)] opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-[var(--surface-muted)] hover:scale-110 backdrop-blur-sm"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className={`hidden lg:grid gap-1 w-full h-full ${images.length === 2 ? 'grid-cols-1 grid-rows-1' :
                    images.length === 3 ? 'grid-cols-1 grid-rows-2' :
                      'grid-cols-2 grid-rows-2'
                  }`}>
                  {images.slice(1, 5).map((image, index) => {
                    const actualIndex = index + 1;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => { setSelectedImage(actualIndex); setIsFullscreen(true); }}
                        className="relative h-full w-full overflow-hidden bg-[var(--surface)] group"
                      >
                        <img
                          src={image.imageUrl}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(event) => {
                            event.currentTarget.src = imageFallback;
                          }}
                        />
                        <div className="theme-overlay-dim absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                        {index === 3 && images.length > 5 && (
                          <div className="theme-overlay-strong absolute inset-0 flex items-center justify-center text-3xl font-semibold text-[var(--foreground)] transition hover:bg-[var(--media-overlay-strong)]">
                            +{images.length - 5}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="theme-card rounded-2xl relative p-4 sm:p-5 md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="break-words text-[2rem] font-bold leading-tight tracking-tight text-[var(--foreground)] sm:text-[2.5rem]">{post.title}</h1>
                </div>
                <div className="flex flex-col gap-2 text-sm text-[var(--muted-foreground)] sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[var(--accent)]" />
                    <span className="break-words">{formatLocation(post)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleScrollToMap}
                    className="group inline-flex items-center gap-1.5 text-[var(--accent)] transition hover:brightness-110 hover:translate-x-0.5"
                  >
                    <span className="relative">
                      <span className="relative z-10">Xem trên bản đồ</span>
                      <span className="absolute bottom-0 left-0 z-0 h-px w-full origin-left scale-x-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-x-100" />
                    </span>
                    <ArrowDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
                  </button>
                </div>
              </div>

              <div className="hidden lg:flex shrink-0 flex-wrap gap-2 self-start sm:gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={handleSaveToggle}
                  disabled={isSaveSubmitting}
                  className="theme-surface-soft inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-3"
                >
                  <Bookmark className={`h-4 w-4 ${post.isSaved ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--accent)]"}`} />
                  {post.isSaved ? "Đã lưu" : "Lưu"}
                </button>
                <button
                  type="button"
                  onClick={handleCompareToggle}
                  className={`theme-surface-soft inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition hover:bg-[var(--surface-muted)] sm:px-4 sm:py-3 ${isCompared ? "text-[var(--accent)]" : "text-[var(--secondary-foreground)]"}`}
                >
                  <Scale className="h-4 w-4" />
                  {isCompared ? "Đã so sánh" : "So sánh"}
                </button>
                {!isOwnPost ? (
                  <button
                    type="button"
                    onClick={handleOpenReportDialog}
                    className="theme-button-warning col-span-2 inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition sm:col-span-1 sm:px-4 sm:py-3"
                  >
                    <TriangleAlert className="h-4 w-4" />
                    Báo cáo
                  </button>
                ) : null}
                {conversationError ? (
                  <p className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-foreground)]">
                    {conversationError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 border-b border-[var(--border)] pb-6">
              <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4 lg:gap-x-8 xl:gap-x-12">
                <div className="min-w-0 grid content-start gap-1">
                  <p
                    className="max-w-full truncate text-2xl font-semibold leading-tight text-[var(--accent)] tabular-nums sm:text-3xl"
                    title={formatPrice(post.price)}
                  >
                    {formatCompactPrice(post.price)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">{post.postType === "SELL" ? "Giá bán" : "Giá thuê"}</p>
                </div>
                <div className="min-w-0 grid content-start gap-1">
                  <p className="inline-flex items-center gap-1.5 break-words text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
                    <Expand className="h-4 w-4 shrink-0 text-[var(--accent)] sm:h-5 sm:w-5" />
                    {formatArea(post.area)}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">Diện tích</p>
                </div>
                <div className="min-w-0 grid content-start gap-1">
                  <p className="break-words text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">{propertyTypeLabels[post.propertyType]}</p>
                  <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">Loại hình</p>
                </div>
                <div className="min-w-0 grid content-start gap-1">
                  <p className="break-words text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">{post.city.replace(/^(Tỉnh|Thành phố)\s+/i, "")}</p>
                  <p className="text-xs text-[var(--muted-foreground)] sm:text-sm">Khu vực</p>
                </div>
              </div>
            </div>

            {/* BẢN SAO: Liên hệ người bán - Hiển thị riêng trên Mobile ngay sau giá bán */}
            <div className="lg:hidden mt-6">
              {canManagePost ? (
                <div className="glass-card relative overflow-hidden border-t-4 border-t-[var(--accent)] p-5">
                  <div className="pointer-events-none absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />
                  <h2 className="relative text-lg font-semibold text-[var(--foreground)]">Quản lý bài đăng</h2>
                  <p className="relative mt-1 text-sm text-[var(--muted-foreground)]">Bạn là người sở hữu bài đăng này. Bạn có quyền chỉnh sửa hoặc xoá.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 relative">
                    <Link href={`/posts/${post.id}/edit`} className="theme-surface-soft inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]">
                      <Pencil className="h-4 w-4" /> Chỉnh sửa
                    </Link>
                    <button type="button" onClick={handleDelete} disabled={isDeleting} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-2.5 font-medium text-[var(--danger-foreground)] transition hover:brightness-95 disabled:opacity-60">
                      <Trash2 className="h-4 w-4" /> {isDeleting ? "Đang xoá..." : "Xoá bài"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card relative overflow-hidden border-t-4 border-t-[var(--accent)] p-5">
                  <div className="pointer-events-none absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />
                  <h2 className="relative text-lg font-semibold text-[var(--foreground)]">Thông tin người đăng</h2>
                  <div className="relative mt-4 flex items-center gap-4">
                    <Link
                      href={`/profile/posts?authorId=${post.author.id}`}
                      onClick={prefetchAuthorProfile}
                      onFocus={prefetchAuthorProfile}
                      onMouseEnter={prefetchAuthorProfile}
                      onTouchStart={prefetchAuthorProfile}
                      className="relative shrink-0 transition hover:opacity-80 block"
                    >
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-border)] bg-[var(--accent-soft)] text-lg font-semibold text-[var(--accent)]">
                        {post.author.avatarUrl ? (
                          <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                        ) : post.author.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--surface)] p-0.5">
                        <BadgeCheck className="h-3.5 w-3.5 text-[var(--accent)]" />
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/profile/posts?authorId=${post.author.id}`}
                        onClick={prefetchAuthorProfile}
                        onFocus={prefetchAuthorProfile}
                        onMouseEnter={prefetchAuthorProfile}
                        onTouchStart={prefetchAuthorProfile}
                        className="block break-words font-bold leading-snug text-[var(--foreground)] transition hover:text-[var(--accent)]"
                      >
                        {post.author.fullName}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Đã xác thực</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button type="button" onClick={handleMessageClick} disabled={isStartingConversation} className="theme-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-semibold transition disabled:opacity-60">
                      <MessageCircle className="h-4 w-4 text-[var(--primary-foreground)]" /> {isStartingConversation ? "Đang kết nối..." : "Nhắn tin trao đổi"}
                    </button>
                    {conversationError && <p className="mt-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-foreground)]">{conversationError}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Mô tả chi tiết</h2>
                <p className="mt-4 whitespace-pre-line break-words leading-8 text-[var(--secondary-foreground)]">{post.description}</p>
              </div>

              <div className="border-t border-[var(--border)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 xl:pl-8 lg:pt-0">
                <h2 className="text-2xl font-semibold text-[var(--foreground)]">Thông tin chi tiết</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  {isOwnPost && (
                    <div>
                      <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <Hash className="h-4 w-4" /> Mã tin
                      </dt>
                      <dd className="mt-1 flex items-center gap-2 break-all font-medium text-[var(--foreground)]">
                        #{post.id.slice(-8).toUpperCase()}
                        <button
                          type="button"
                          onClick={handleCopyId}
                          className="theme-surface-soft inline-flex h-6 w-6 items-center justify-center rounded text-[var(--muted-foreground)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                          title="Copy mã tin"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-[var(--success-foreground)]" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <User className="h-4 w-4" /> Người đăng
                    </dt>
                    <dd className="mt-1 break-words font-medium text-[var(--foreground)]">{post.author.fullName}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <MapPin className="h-4 w-4" /> Địa chỉ
                    </dt>
                    <dd className="mt-1 break-words font-medium text-[var(--foreground)]">{post.address}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Map className="h-4 w-4" /> Quận / huyện
                    </dt>
                    <dd className="mt-1 break-words font-medium text-[var(--foreground)]">{post.district}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <Map className="h-4 w-4" /> Tỉnh / thành
                    </dt>
                    <dd className="mt-1 break-words font-medium text-[var(--foreground)]">{post.city}</dd>
                  </div>
                  {isOwnPost && (
                    <div>
                      <dt className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <Activity className="h-4 w-4" /> Trạng thái
                      </dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[post.status] || "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--secondary-foreground)]"}`}>
                          {statusLabels[post.status] || post.status}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {groupedFeatures && groupedFeatures.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="theme-card rounded-2xl p-6 space-y-6"
            >
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Tiện ích & Đặc trưng</h2>
              <div className="space-y-6">
                {groupedFeatures.map(([category, list]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        {category}
                      </h3>
                      <span className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {list.map((feature) => (
                        <div
                          key={feature.id}
                          className="theme-surface-muted flex items-center gap-3 rounded-2xl p-3.5 text-[var(--secondary-foreground)] transition-all duration-300 hover:border-[var(--accent-border)] hover:bg-[var(--surface)]"
                        >
                          <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
                            <FeatureIcon name={feature.icon || "help-circle"} className="h-5 w-5" />
                          </div>
                          <span className="text-sm font-medium">{feature.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div 
            ref={mapSectionRef} 
            className="theme-card rounded-2xl overflow-hidden p-0"
          >
            <div className="border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Vị trí trên bản đồ</h2>
            </div>
            <div className="h-[360px] w-full relative">
              <PostDetailMap
                latitude={Number(post.latitude)}
                longitude={Number(post.longitude)}
              />
            </div>
          </div>

          <CommentSection postId={post.id} postAuthorId={post.author.id} />
        </section>

        <AnimatedSidebar className="space-y-5 min-w-0">
          <div className="lg:sticky lg:top-24 space-y-5">
            {canManagePost ? (
              <div className="hidden lg:block glass-card relative overflow-hidden border-t-4 border-t-[var(--accent)] p-6">
                <div className="pointer-events-none absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />

                <h2 className="relative text-xl font-semibold text-[var(--foreground)]">
                  Quản lý bài đăng
                </h2>

                <p className="relative mt-2 text-sm text-[var(--muted-foreground)]">
                  Bạn là người sở hữu bài đăng này. Bạn có quyền chỉnh sửa thông tin hoặc xoá bài viết.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 relative">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="theme-surface-soft inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa
                  </Link>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-4 py-3 font-medium text-[var(--danger-foreground)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Đang xoá..." : "Xoá bài"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden lg:block glass-card relative overflow-hidden border-t-4 border-t-[var(--accent)] p-5 sm:p-6">
                <div className="pointer-events-none absolute left-0 top-0 h-24 w-full bg-gradient-to-b from-[var(--accent-soft)] to-transparent" />
                <h2 className="relative text-xl font-semibold text-[var(--foreground)]">Liên hệ người bán</h2>
                <div className="relative mt-5 flex items-center gap-4">
                  <Link
                    href={`/profile/posts?authorId=${post.author.id}`}
                    onClick={prefetchAuthorProfile}
                    onFocus={prefetchAuthorProfile}
                    onMouseEnter={prefetchAuthorProfile}
                    onTouchStart={prefetchAuthorProfile}
                    className="relative shrink-0 transition hover:opacity-80 block"
                  >
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--accent-border)] bg-[var(--accent-soft)] text-xl font-semibold text-[var(--accent)]">
                      {post.author.avatarUrl ? (
                        <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                      ) : (
                        post.author.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-[var(--surface)] p-1">
                      <BadgeCheck className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/posts?authorId=${post.author.id}`}
                      onClick={prefetchAuthorProfile}
                      onFocus={prefetchAuthorProfile}
                      onMouseEnter={prefetchAuthorProfile}
                      onTouchStart={prefetchAuthorProfile}
                      className="block break-words text-lg font-bold leading-snug text-[var(--foreground)] transition hover:text-[var(--accent)]"
                    >
                      {post.author.fullName}
                    </Link>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Hoạt động gần đây</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2.5 relative">
                  <PulseButton
                    onClick={handleMessageClick}
                    disabled={isStartingConversation}
                    className="theme-button-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition disabled:opacity-60"
                  >
                    <MessageCircle className="h-4.5 w-4.5 text-[var(--primary-foreground)]" />
                    {isStartingConversation ? "Đang kết nối..." : "Nhắn tin trao đổi"}
                  </PulseButton>
                  {conversationError && (
                    <p className="mt-2 rounded-xl border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger-foreground)]">
                      {conversationError}
                    </p>
                  )}
                </div>

                <div className="theme-surface-soft relative mt-6 rounded-2xl p-4">
                  <div className="mb-3 flex items-center gap-2 text-[var(--foreground)]">
                    <ShieldCheck className="h-5 w-5 text-[var(--success-foreground)]" />
                    <h3 className="font-semibold text-sm">Giao dịch an toàn</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[var(--secondary-foreground)]">
                    <li>• Không chuyển khoản trước khi xem nhà.</li>
                    <li>• Kiểm tra giấy tờ và thông tin người đăng.</li>
                    <li>• Liên hệ trực tiếp qua kênh chính thống.</li>
                  </ul>
                </div>
              </div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
              className="theme-card rounded-2xl p-5 sm:p-6"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">Bất động sản tương tự</h2>
                <Link href={relatedPostsListHref} className="text-sm font-medium text-[var(--accent)] transition hover:brightness-110">
                  Xem tất cả
                </Link>
              </div>

              <RelatedPostsCarousel
                posts={relatedPosts}
                isLoading={isRelatedPostsLoading}
                onPostIntent={prefetchPostDetail}
              />
            </motion.div>

            <button
              type="button"
              onClick={handleBackToPosts}
              className="hidden lg:inline-flex theme-surface-soft items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </button>
          </div>
        </AnimatedSidebar>
      </div>

      <PostImageViewer
        isOpen={isFullscreen}
        images={images}
        selectedImageIndex={selectedImage}
        postTitle={post.title}
        onClose={() => setIsFullscreen(false)}
        onImageChange={setSelectedImage}
      />

      {post ? (
        <ReportPostDialog
          open={isReportDialogOpen}
          postId={post.id}
          postTitle={post.title}
          onClose={() => setIsReportDialogOpen(false)}
        />
      ) : null}

      {/* Mobile Bottom Action Bar */}
      {!isOwnPost && (
        <div className="theme-bottom-bar fixed bottom-0 left-0 right-0 z-40 flex items-center gap-2 p-3 pb-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={handleSaveToggle}
            disabled={isSaveSubmitting}
            className="theme-surface-soft inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Bookmark className={`h-5 w-5 ${post.isSaved ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--accent)]"}`} />
          </button>
          <button
            type="button"
            onClick={handleCompareToggle}
            className="theme-surface-soft inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[var(--secondary-foreground)] transition hover:bg-[var(--surface-muted)]"
          >
            <Scale className={`h-5 w-5 ${isCompared ? "text-[var(--accent)]" : "text-[var(--accent)]"}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenReportDialog}
            className="theme-button-warning inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition"
          >
            <TriangleAlert className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleMessageClick}
            disabled={isStartingConversation}
            className="theme-surface-soft inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] disabled:opacity-60"
          >
            <MessageCircle className="h-5 w-5" />
            {isStartingConversation ? "Đang kết nối..." : "Nhắn tin"}
          </button>
        </div>
      )}
    </div>
  );
}
