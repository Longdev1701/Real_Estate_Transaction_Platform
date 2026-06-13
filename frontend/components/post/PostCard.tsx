"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {

  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Expand,
  TriangleAlert,
  Heart,
  MapPin,
  MessageCircle,
  Ruler,
  Scale,
  X,
} from "lucide-react";

import {
  formatArea,
  formatCompactPrice,
  formatLocation,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
} from "@/lib/posts";
import { useSound } from "@/hooks/useSound";
import { api } from "@/lib/api";
import { updateSessionCaches, writeSessionCache } from "@/lib/client-cache";
import { useAuthStore } from "@/stores/auth.store";

import CommentSection from "@/components/comment/CommentSection";
const ReportPostDialog = dynamic(async () => {
  const module = await import("@/components/post/ReportPostDialog");
  return module.ReportPostDialog;
});

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 760'><rect width='1200' height='760' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='48'>TrustEstate</text></svg>";
const POST_DETAIL_CACHE_TTL_MS = 2 * 60 * 1000;

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || "T";

const getRelativeTime = (rawDate: string) => {
  const timestamp = new Date(rawDate).getTime();

  if (Number.isNaN(timestamp)) {
    return "Vừa đăng";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} ngày trước`;
  if (diffHours > 0) return `${diffHours} giờ trước`;
  if (diffMinutes > 0) return `${diffMinutes} phút trước`;
  return "Vừa đăng";
};

const patchPostLikeInCacheValue = (
  value: unknown,
  postId: string,
  isLiked: boolean,
  likeCount: number,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => patchPostLikeInCacheValue(item, postId, isLiked, likeCount));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  let nextRecord: Record<string, unknown> | null = null;
  const ensureNextRecord = () => {
    if (!nextRecord) {
      nextRecord = { ...record };
    }

    return nextRecord;
  };

  if (record.id === postId && "author" in record && "title" in record) {
    Object.assign(ensureNextRecord(), {
      isLiked,
      likeCount,
    });
  }

  if (Array.isArray(record.items)) {
    ensureNextRecord().items = record.items.map((item) =>
      patchPostLikeInCacheValue(item, postId, isLiked, likeCount),
    );
  }

  if (Array.isArray(record.posts)) {
    ensureNextRecord().posts = record.posts.map((item) =>
      patchPostLikeInCacheValue(item, postId, isLiked, likeCount),
    );
  }

  if (record.post && typeof record.post === "object") {
    ensureNextRecord().post = patchPostLikeInCacheValue(record.post, postId, isLiked, likeCount);
  }

  return nextRecord ?? value;
};

const updateCachedPostLike = (postId: string, isLiked: boolean, likeCount: number) => {
  updateSessionCaches(
    (key) =>
      key.startsWith("posts:list:") ||
      key.startsWith("posts_page_state:") ||
      key.startsWith("profile:posts:") ||
      key === `posts:detail:${postId}`,
    (value) => patchPostLikeInCacheValue(value, postId, isLiked, likeCount),
  );
};

const Metric = ({
  icon: Icon,
  label,
  value,
  title,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  title?: string;
  className?: string;
}) => (
  <div className={`theme-post-metric min-w-0 rounded-xl px-3 py-2 ${className}`}>
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
      <p className="truncate text-sm font-semibold text-[var(--foreground)] tabular-nums" title={title ?? value}>{value}</p>
    </div>
    <p className="mt-1 pl-6 text-xs text-[var(--muted-foreground)]">{label}</p>
  </div>
);

const getTileClassName = (imageCount: number, index: number) => {
  if (imageCount === 1) return "aspect-[4/3] md:aspect-auto md:h-80";
  if (imageCount === 2) return "aspect-[4/3] md:aspect-auto md:h-64";
  if (imageCount === 3) return index === 0 ? "aspect-[4/3] md:aspect-auto md:col-span-2 md:h-64" : "aspect-[4/3] md:aspect-auto md:h-52";
  return index === 0 ? "aspect-[4/3] md:aspect-auto md:h-56" : "aspect-[4/3] md:aspect-auto md:h-56";
};

const getGalleryGridClassName = (imageCount: number) => {
  if (imageCount === 1) return "grid-cols-1";
  if (imageCount === 2) return "grid-cols-1 md:grid-cols-2 gap-1";
  if (imageCount === 3) return "grid-cols-1 md:grid-cols-2 gap-1 md:auto-rows-min";
  return "grid-cols-1 md:grid-cols-3 gap-1";
};

export function PostCard({ post, isFirstPost }: { post: Post; isFirstPost?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { playDetail, playLikeBegin, playLikeEnd, playComment, playSave, playReport } = useSound();
  const [imageError, setImageError] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [isLikeSubmitting, setIsLikeSubmitting] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSaved));
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [saveEffect, setSaveEffect] = useState<{ key: number; type: "save" | "unsave" } | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isCompared, setIsCompared] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [commentPulseKey, setCommentPulseKey] = useState(0);
  const [visibleImageIndex, setVisibleImageIndex] = useState(0);
  const cardRef = useRef<HTMLElement | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const handleGalleryScroll = () => {
    if (galleryRef.current) {
      const { scrollLeft, clientWidth } = galleryRef.current;
      if (clientWidth === 0) return;
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex !== visibleImageIndex) {
        setVisibleImageIndex(newIndex);
      }
    }
  };

  const scrollGallery = (direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (galleryRef.current) {
      const scrollAmount = galleryRef.current.clientWidth;
      galleryRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setLikeCount(post.likeCount ?? 0);
  }, [post.id, post.isLiked, post.likeCount]);

  useEffect(() => {
    if (!isFirstPost || post.images.length <= 1) return;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    let timeout1: NodeJS.Timeout;
    let timeout2: NodeJS.Timeout;

    const playSwipeHint = () => {
      if (!galleryRef.current || galleryRef.current.scrollLeft > 0) return;
      
      // Lấy tất cả các ảnh bên trong để dịch chuyển thay vì cuộn (tạo độ mượt 60fps nhờ GPU)
      const children = Array.from(galleryRef.current.children) as HTMLElement[];
      
      children.forEach(child => {
        // Kéo mượt mà ra (easeOutQuint)
        child.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)";
        child.style.transform = "translateX(-110px)";
      });
      
      timeout2 = setTimeout(() => {
        children.forEach(child => {
          // Nẩy nhẹ về vị trí cũ (spring)
          child.style.transition = "transform 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)";
          child.style.transform = "translateX(0)";
        });
        
        setTimeout(() => {
          children.forEach(child => {
            child.style.transition = "";
            child.style.transform = "";
          });
        }, 500);
      }, 750);
    };

    // Delay một chút trước khi chạy hiệu ứng
    timeout1 = setTimeout(playSwipeHint, 1200);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      if (galleryRef.current) {
        const children = Array.from(galleryRef.current.children) as HTMLElement[];
        children.forEach(child => {
          child.style.transition = "";
          child.style.transform = "";
        });
      }
    };
  }, [isFirstPost, post.images.length]);

  useEffect(() => {
    if (!isClient) return;
    const commentPostId = searchParams?.get("commentPostId");
    if (commentPostId === post.id) {
      setIsCommentOpen(true);
      window.requestAnimationFrame(() => {
        cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      const params = new URLSearchParams(window.location.search);
      params.delete("commentPostId");
      const newSearch = params.toString();
      const newPath = window.location.pathname + (newSearch ? `?${newSearch}` : "");
      router.replace(newPath, { scroll: false });
    }
  }, [searchParams, post.id, isClient, router]);

  useEffect(() => {
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem("compared_posts");
        const list = stored ? JSON.parse(stored) : [];
        setIsCompared(Array.isArray(list) && list.some((item: any) => item.id === post.id));
      } catch {
        setIsCompared(false);
      }
    };
    handleCompareUpdate();
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, [post.id]);
  const handleCompareClick = () => {
    try {
      const stored = localStorage.getItem("compared_posts");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const exists = list.some((item: any) => item.id === post.id);
      if (exists) {
        list = list.filter((item: any) => item.id !== post.id);
        setIsCompared(false);
      } else {
        if (list.length >= 3) {
          import("@/stores/toast.store").then(({ toast }) => {
            toast.warning("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
          });
          return;
        }
        if (list.length > 0 && list[0].postType !== post.postType) {
          import("@/stores/toast.store").then(({ toast }) => {
            toast.warning("Không thể so sánh bất động sản Bán với bất động sản Cho thuê. Vui lòng chọn cùng loại giao dịch.");
          });
          return;
        }
        list.push(post);
        setIsCompared(true);
      }
      localStorage.setItem("compared_posts", JSON.stringify(list));
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const images = useMemo(
    () => (post.images.length > 0 ? post.images : [{ id: "fallback", imageUrl: imageFallback, order: 0 }]),
    [post.images],
  );

  const totalImages = post.imageCount ?? post.images.length;
  const visibleImages = images.slice(0, Math.min(images.length, 3));
  const activeImage = images[activeImageIndex]?.imageUrl ?? imageFallback;
  const location = formatLocation(post) || post.address || post.city;
  const canReportPost = !user || user.id !== post.author.id;
  const commentCount = post.commentCount ?? 0;
  const shouldShowDescriptionToggle = post.description.trim().length > 120;

  const openImageViewer = (index: number) => {
    setActiveImageIndex(index);
    setIsImageViewerOpen(true);
  };

  const cachePostDetailPreview = () => {
    writeSessionCache(`posts:detail:${post.id}`, {
      ...post,
      isLiked,
      likeCount,
      features: post.features ?? [],
      relatedPosts: post.relatedPosts ?? [],
    }, { ttlMs: POST_DETAIL_CACHE_TTL_MS });
  };

  const cacheAuthorPreview = () => {
    writeSessionCache(`profile:author:${post.author.id}`, post.author, {
      ttlMs: POST_DETAIL_CACHE_TTL_MS,
    });
  };

  const goToPreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const goToNextImage = () => {
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  const handleLikeClick = async () => {
    if (isLikeSubmitting) {
      return;
    }

    if (!user) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const nextLiked = !isLiked;
    const previousLiked = isLiked;
    const previousLikeCount = likeCount;

    setIsLikeSubmitting(true);
    setIsLiked(nextLiked);
    const optimisticLikeCount = Math.max(0, likeCount + (nextLiked ? 1 : -1));
    setLikeCount(optimisticLikeCount);
    updateCachedPostLike(post.id, nextLiked, optimisticLikeCount);
    if (nextLiked) {
      playLikeBegin();
    } else {
      playLikeEnd();
    }
    setLikeBurstKey((current) => current + 1);

    try {
      const response = nextLiked
        ? await api.post<{ data: { isLiked: boolean; likeCount: number } }>("/post-likes", { postId: post.id })
        : await api.delete<{ data: { isLiked: boolean; likeCount: number } }>(`/post-likes/${post.id}`);

      setIsLiked(response.data.data.isLiked);
      setLikeCount(response.data.data.likeCount);
      updateCachedPostLike(post.id, response.data.data.isLiked, response.data.data.likeCount);
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousLikeCount);
      updateCachedPostLike(post.id, previousLiked, previousLikeCount);
      console.error("Failed to toggle post like:", error);
    } finally {
      setIsLikeSubmitting(false);
    }
  };

  const handleSaveClick = async () => {
    if (isSaveSubmitting) {
      return;
    }

    if (!user) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    const nextSaved = !isSaved;
    const effectType = nextSaved ? "save" : "unsave";

    setIsSaveSubmitting(true);
    setSaveEffect((current) => ({
      key: (current?.key ?? 0) + 1,
      type: effectType,
    }));
    setIsSaved(nextSaved);
    playSave();

    try {
      if (nextSaved) {
        await api.post("/saved-posts", { postId: post.id });
      } else {
        await api.delete(`/saved-posts/${post.id}`);
      }

    } catch (error) {
      setIsSaved(!nextSaved);
      setSaveEffect(null);
      console.error("Failed to toggle saved post:", error);
    } finally {
      setIsSaveSubmitting(false);
    }
  };

  const handleReportClick = () => {
    playReport();

    if (!user) {
      router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }

    setIsReportDialogOpen(true);
  };

  const openComments = () => {
    playComment();
    setCommentPulseKey((current) => current + 1);
    setIsCommentOpen(true);
  };

  const closeComments = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsCommentOpen(false);
    window.requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setCommentPulseKey((current) => current + 1);
    });
  };

  return (
    <>
      <article
        ref={cardRef}
        className="theme-post-card animate-in overflow-hidden rounded-2xl fade-in slide-in-from-bottom-4 duration-500 backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">

            <Link
              href={`/profile/posts?authorId=${post.author.id}`}
              onClick={cacheAuthorPreview}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)] transition hover:border-[var(--accent)] hover:ring-2 hover:ring-[color:color-mix(in_srgb,var(--accent)_22%,transparent)]"
              aria-label={`Xem bài đăng của ${post.author.fullName}`}
            >
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
              ) : (
                getInitial(post.author.fullName)
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/profile/posts?authorId=${post.author.id}`}
                  onClick={cacheAuthorPreview}
                  className="line-clamp-2 break-words font-semibold leading-snug text-[var(--foreground)] transition-colors hover:text-[var(--accent)]"
                >
                  {post.author.fullName}
                </Link>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>{getRelativeTime(post.createdAt)}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--notification-read-dot)]" />
                <span className="theme-badge-info rounded-full px-2 py-0.5 font-medium">
                  {propertyTypeLabels[post.propertyType]}
                </span>
                <span className="theme-chip rounded-full px-2 py-0.5 font-medium">
                  {postTypeLabels[post.postType]}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canReportPost ? (
              <button
                type="button"
                onClick={handleReportClick}
                className="theme-icon-button group/report relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--warning-foreground)] transition hover:text-[var(--warning-foreground)]"
                aria-label="Báo cáo bài đăng"
                title="Báo cáo bài đăng"
              >
                <span className="pointer-events-none absolute inset-1 rounded-full opacity-0 blur-lg transition duration-300 group-hover/report:bg-[color:color-mix(in_srgb,var(--warning)_22%,transparent)] group-hover/report:opacity-100" />
                <TriangleAlert className="relative h-5 w-5 transition duration-300 group-hover/report:-translate-y-0.5 group-hover/report:scale-110 group-hover/report:drop-shadow-[0_0_10px_color-mix(in_srgb,var(--warning)_60%,transparent)]" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCompareClick}
              className={`group/compare relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
                isCompared
                  ? "theme-icon-button-active hover:text-[var(--accent)]"
                  : "theme-icon-button hover:text-[var(--accent)]"
              }`}
              aria-label="So sánh bất động sản"
              title="So sánh bất động sản"
            >
              <span className={`pointer-events-none absolute inset-1 rounded-full opacity-0 blur-lg transition duration-300 group-hover/compare:opacity-100 ${isCompared ? "group-hover/compare:bg-[color:color-mix(in_srgb,var(--info)_28%,transparent)]" : "group-hover/compare:bg-[color:color-mix(in_srgb,var(--info)_18%,transparent)]"}`} />
              <Scale className="relative h-5 w-5 transition duration-300 group-hover/compare:scale-110" />
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaveSubmitting}
              className={`group/save relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-70 ${
                isSaved
                  ? "theme-icon-button-active hover:text-[var(--accent)]"
                  : "theme-icon-button hover:text-[var(--accent)]"
              }`}
              aria-label="Lưu bài đăng"
              title="Lưu bài đăng"
            >
              {saveEffect && (
                <span key={saveEffect.key} className="pointer-events-none absolute inset-0 z-20">
                  {saveEffect.type === "save" ? (
                    <>
                      <span className="absolute -inset-2 rounded-full bg-[color:color-mix(in_srgb,var(--effect-save)_0%,transparent)]" style={{ animation: "savePulse 720ms ease-out forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[color:color-mix(in_srgb,var(--effect-info-glow)_0%,transparent)]" style={{ animation: "saveRing 760ms ease-out forwards" }} />
                      {[0, 1, 2, 3, 4, 5].map((item) => (
                        <span
                          key={item}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[var(--reaction-active-foreground)] opacity-0 shadow-[0_0_10px_var(--effect-info-glow)]"
                          style={{
                            animation: "saveSpark 680ms cubic-bezier(0.16,1,0.3,1) forwards",
                            animationDelay: `${item * 45}ms`,
                            ["--x" as string]: `${Math.cos((item * Math.PI) / 3) * 25}px`,
                            ["--y" as string]: `${Math.sin((item * Math.PI) / 3) * 25}px`,
                          }}
                        />
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="absolute -inset-3 rounded-full bg-[color:color-mix(in_srgb,var(--effect-danger-glow)_0%,transparent)]" style={{ animation: "killImpactFlash 620ms ease-out forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-16 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-[linear-gradient(to_right,transparent,var(--danger),var(--warning-soft))] opacity-0 shadow-[0_0_18px_var(--effect-danger-glow)]" style={{ animation: "killSlash 680ms cubic-bezier(0.16,1,0.3,1) forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-1 w-12 origin-center -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-[linear-gradient(to_right,transparent,var(--danger-border),var(--primary-foreground))] opacity-0 shadow-[0_0_14px_var(--effect-danger-glow)]" style={{ animation: "killSlashSecondary 680ms cubic-bezier(0.16,1,0.3,1) 90ms forwards" }} />
                      {[0, 1, 2, 3, 4, 5].map((item) => (
                        <span
                          key={item}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[var(--danger)] opacity-0 shadow-[0_0_8px_var(--effect-danger-glow)]"
                          style={{
                            animation: "killShard 620ms cubic-bezier(0.16,1,0.3,1) forwards",
                            animationDelay: `${item * 35}ms`,
                            ["--x" as string]: `${Math.cos((item * Math.PI) / 3) * 27}px`,
                            ["--y" as string]: `${Math.sin((item * Math.PI) / 3) * 22}px`,
                          }}
                        />
                      ))}
                    </>
                  )}
                </span>
              )}
              <span className={`pointer-events-none absolute inset-1 rounded-full opacity-0 blur-lg transition duration-300 group-hover/save:opacity-100 ${isSaved ? "group-hover/save:bg-[color:color-mix(in_srgb,var(--info)_28%,transparent)]" : "group-hover/save:bg-[color:color-mix(in_srgb,var(--danger)_18%,transparent)]"}`} />
              <Bookmark className={`relative h-5 w-5 transition duration-300 group-hover/save:scale-110 ${saveEffect ? (saveEffect.type === "save" ? "animate-[saveIconPop_560ms_ease-out]" : "animate-[killIconShake_520ms_ease-out]") : ""} ${isSaved ? "fill-[var(--reaction-active-foreground)] text-[var(--reaction-active-foreground)]" : ""}`} />
            </button>
          </div>        </div>

        <div className="px-4 md:px-5">
          <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="mb-1 block">
            <h3 className="line-clamp-2 break-words text-base font-semibold leading-snug text-[var(--foreground)] transition hover:text-[var(--accent)]">
              {post.title}
            </h3>
          </Link>
        <div className="mb-3">
          <p
            className={`text-sm leading-5 text-[var(--secondary-foreground)] ${
              isDescriptionExpanded ? "" : "line-clamp-2"
            }`}
          >
            {post.description}
          </p>

          {shouldShowDescriptionToggle ? (
            <button
              type="button"
              onClick={() => setIsDescriptionExpanded((current) => !current)}
              className="mt-1 text-sm font-medium text-[var(--accent)] transition hover:text-[var(--foreground)]"
            >
              {isDescriptionExpanded ? "Thu gọn" : "Xem thêm"}
            </button>
          ) : null}
        </div>          

          <div className="relative group/mobile-gallery mb-5">
            <div 
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className={`theme-post-gallery flex overflow-x-auto snap-x snap-mandatory custom-scrollbar md:grid overflow-hidden rounded-xl ${getGalleryGridClassName(images.length)}`}
            >
              {images.map((image, index) => {
                const remainingImages = Math.max(0, totalImages - 3);

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => openImageViewer(index)}
                    className={`group relative block shrink-0 w-full snap-center overflow-hidden bg-[var(--surface)] text-left ${getTileClassName(images.length, index)} ${index > 2 ? "md:hidden" : ""} md:w-auto md:shrink`}
                  >
                    <img
                      src={imageError ? imageFallback : image.imageUrl}
                      alt={`${post.title} ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                      onError={() => setImageError(true)}
                    />

                    {remainingImages > 0 && index === 2 && (
                      <div className="theme-overlay-strong absolute inset-0 hidden md:flex items-center justify-center text-2xl font-bold text-[var(--foreground)] backdrop-blur-[1px]">
                        +{remainingImages}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {totalImages > 1 && totalImages - 1 - visibleImageIndex > 0 && (
              <div className="theme-overlay-dim absolute bottom-3 right-3 pointer-events-none rounded-md px-2 py-1 text-xs font-semibold text-white shadow-sm md:hidden">
                +{totalImages - 1 - visibleImageIndex} ảnh
              </div>
            )}
            
            {images.length > 1 && (
              <>
                <button 
                  type="button"
                  onClick={(e) => scrollGallery("left", e)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover/mobile-gallery:opacity-100 md:hidden"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button 
                  type="button"
                  onClick={(e) => scrollGallery("right", e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover/mobile-gallery:opacity-100 md:hidden"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4 md:px-5 md:pb-5">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
            <Metric icon={Building2} label="Giá bán" value={formatCompactPrice(post.price)} title={formatPrice(post.price)} />
            <Metric icon={Ruler} label="Diện tích" value={formatArea(post.area)} />
            <Metric className="col-span-2 md:col-span-1" icon={MapPin} label="Vị trí" value={location} />
          </div>

          <div className="theme-bottom-action grid grid-cols-3 overflow-visible rounded-xl text-sm border border-[var(--border)]">
            <button
              type="button"
              onClick={handleLikeClick}
              disabled={isLikeSubmitting}
              className={`group/like relative inline-flex items-center justify-center gap-2 overflow-visible border-r border-[var(--border)] px-2 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--danger)_10%,transparent)] ${
                isLiked ? "theme-reaction-active" : "hover:text-[var(--danger-foreground)]"
              }`}
            >
              <span className="pointer-events-none absolute inset-1 rounded-xl opacity-0 blur-xl transition duration-500 group-hover/like:bg-[color:color-mix(in_srgb,var(--danger)_18%,transparent)] group-hover/like:opacity-100" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color:color-mix(in_srgb,var(--danger-border)_0%,transparent)] transition duration-500 group-hover/like:scale-150 group-hover/like:border-[color:color-mix(in_srgb,var(--danger-border)_55%,transparent)] group-hover/like:opacity-0" />
              {likeBurstKey > 0 && (
                <span key={likeBurstKey} className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-1 w-1 -translate-x-1/2 -translate-y-1/2">
                  {[
                    ["-34px", "-34px", "-24deg", "0ms"],
                    ["0px", "-42px", "8deg", "40ms"],
                    ["34px", "-34px", "28deg", "80ms"],
                    ["-42px", "2px", "-42deg", "20ms"],
                    ["42px", "2px", "42deg", "60ms"],
                    ["-20px", "32px", "18deg", "100ms"],
                    ["20px", "32px", "-18deg", "120ms"],
                  ].map(([x, y, rotate, delay], index) => (
                    <span
                      key={index}
                      className="absolute text-[var(--danger)] opacity-0 drop-shadow-[0_0_10px_var(--effect-like)]"
                      style={{
                        animation: "heartBurst 760ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        animationDelay: delay,
                        ["--x" as string]: x,
                        ["--y" as string]: y,
                        ["--r" as string]: rotate,
                      }}
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" />
                    </span>
                  ))}
                </span>
              )}
              <Heart
                className={`relative h-4 w-4 transition duration-500 group-hover/like:-translate-y-0.5 group-hover/like:scale-125 group-hover/like:rotate-[-10deg] ${
                  isLiked ? "scale-125 fill-[var(--danger)] text-[var(--danger)] drop-shadow-[0_0_10px_var(--effect-like)]" : ""
                }`}
              />
              <span className="hidden sm:inline">Thích</span>
              <span className="text-xs text-[var(--muted-foreground)]">{likeCount}</span>
            </button>
            <button
              type="button"
              onClick={openComments}
              data-pulse={commentPulseKey > 0 ? "true" : "false"}
              className="theme-comment-action group/comment relative inline-flex items-center justify-center gap-2 overflow-hidden px-2 py-3 transition data-[pulse=true]:animate-[commentButtonPulse_700ms_ease-out]"
            >
              <span className="pointer-events-none absolute bottom-1 left-1/2 h-7 w-16 -translate-x-1/2 rounded-full bg-[color:color-mix(in_srgb,var(--effect-comment)_0%,transparent)] blur-md transition duration-500 group-hover/comment:bg-[color:color-mix(in_srgb,var(--effect-comment)_35%,transparent)]" />
              {[0, 1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className="pointer-events-none absolute bottom-2 h-2 w-2 rounded-full bg-[color:color-mix(in_srgb,var(--effect-comment)_44%,white)] opacity-0 blur-[1px] group-hover/comment:animate-[commentSmoke_1.25s_ease-out_infinite]"
                  style={{
                    left: `${34 + item * 8}%`,
                    animationDelay: `${item * 120}ms`,
                  }}
                />
              ))}
              <MessageCircle className="relative h-4 w-4 transition duration-500 group-hover/comment:-translate-y-0.5 group-hover/comment:scale-110 group-hover/comment:drop-shadow-[0_0_10px_var(--effect-comment)]" />
              <span className="hidden sm:inline">Bình luận</span>
              <span className="relative text-xs text-[var(--muted-foreground)]">{commentCount}</span>
            </button>
            <Link              href={`/posts/${post.id}`}
              onClick={() => {
                cachePostDetailPreview();
                playDetail();
              }}
              className="theme-button-primary group relative inline-flex items-center justify-center gap-2 overflow-hidden border-l border-[var(--info-border)] px-2 py-3 font-semibold transition duration-300 hover:scale-[1.01]"
            >
              <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(120deg,transparent,color-mix(in_srgb,var(--primary-foreground)_35%,transparent),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--primary-foreground)_16%,transparent)] text-[var(--primary-foreground)] ring-1 ring-[color:color-mix(in_srgb,var(--primary-foreground)_22%,transparent)] transition duration-700 ease-out group-hover:rotate-[720deg] group-hover:scale-110">
                <Expand className="h-4 w-4 transition duration-700 ease-out group-hover:rotate-[360deg] group-hover:scale-125" />
              </span>
              <span className="relative hidden sm:inline">Xem chi tiết</span>
              <span className="relative sm:hidden">Chi tiết</span>
            </Link>
          </div>
        </div>
      </article>

      {isClient && isImageViewerOpen &&
        createPortal(
        <div
          className="theme-media-backdrop fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsImageViewerOpen(false);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageViewerOpen(false);
            }}
            className="theme-media-control absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition"
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousImage();
                }}
                className="theme-media-control absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                className="theme-media-control absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="flex h-full w-full max-w-6xl flex-col items-center justify-center gap-4 py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-1 items-center justify-center overflow-hidden w-full">
              <img
                key={activeImageIndex}
                src={activeImage}
                alt={`${post.title} ${activeImageIndex + 1}`}
                className="max-h-[70vh] md:max-h-[76vh] max-w-full rounded-xl object-contain shadow-2xl animate-in fade-in zoom-in-95 duration-300"
              />
            </div>
            <div className="theme-count-pill rounded-full px-3 py-1 text-xs font-medium">
              {activeImageIndex + 1} / {images.length}
            </div>
            {images.length > 1 && (
              <div className="scrollbar-hidden flex max-w-full gap-2 overflow-x-auto py-1">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImageIndex(index);
                    }}
                    className={`h-9 w-14 shrink-0 overflow-hidden rounded-md border transition ${
                      activeImageIndex === index ? "border-[var(--info-border)] scale-105 opacity-100" : "border-[var(--border)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={image.imageUrl} alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      , document.body)}

      {isClient && isCommentOpen &&
        createPortal(
        <div
          className="theme-media-backdrop fixed inset-0 z-[9999] flex items-center justify-center p-3 backdrop-blur-md md:p-6"
          onClick={(e) => closeComments(e)}
        >
          <div
            className="theme-modal-surface relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-4 py-4 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                  ) : (
                    getInitial(post.author.fullName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-2 break-words font-semibold leading-snug text-[var(--foreground)]">{post.author.fullName}</p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {getRelativeTime(post.createdAt)} · {propertyTypeLabels[post.propertyType]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeComments}
                className="theme-icon-button inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition"
                aria-label="Đóng bình luận"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="scrollbar-hidden overflow-y-auto p-4 md:p-5">
              <div className="theme-post-gallery relative overflow-hidden rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsImageViewerOpen(true)}
                  className="group/image block w-full text-left"
                  aria-label="Phóng to ảnh bài đăng"
                >
                  <img
                    src={activeImage}
                    alt={post.title}
                    className="aspect-[16/9] w-full object-cover transition duration-300 group-hover/image:scale-[1.02]"
                  />
                  <div className="theme-media-overlay pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-3 py-3 opacity-100">
                    <span className="theme-overlay-badge rounded-full px-3 py-1 text-xs font-medium backdrop-blur">
                      Bấm để phóng to
                    </span>
                  </div>
                </button>
                <div className="theme-overlay-badge absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md">
                  {activeImageIndex + 1}/{images.length}
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      className="theme-media-control absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextImage}
                      className="theme-media-control absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition"
                      aria-label="Ảnh tiếp theo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="scrollbar-hidden mt-3 flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      className={`h-12 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                        activeImageIndex === index ? "border-[var(--info-border)]" : "border-[var(--border)] opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={image.imageUrl} alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-2xl font-bold text-[var(--foreground)]">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--secondary-foreground)]">{post.description}</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric icon={Building2} label="Giá bán" value={formatCompactPrice(post.price)} title={formatPrice(post.price)} />
                <Metric icon={Expand} label="Diện tích" value={formatArea(post.area)} />
                <Metric icon={MapPin} label="Vị trí" value={location} />
              </div>

              <div className="mt-4">
                <CommentSection postId={post.id} postAuthorId={post.author.id} />
              </div>
              <div className="hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--foreground)]">Bình luận ({commentCount})</h4>
                  <span className="text-xs text-[var(--muted-foreground)]">Mới nhất</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                    T
                  </div>
                  <div className="theme-post-metric flex min-w-0 flex-1 items-center rounded-xl px-3 text-sm text-[var(--muted-foreground)]">
                    Viết bình luận của bạn...
                  </div>
                  <button
                    type="button"
                    className="theme-button-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition"
                    aria-label="Gửi bình luận"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="theme-subtle-card rounded-xl p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Nguyễn Hoàng</p>
                    <p className="mt-1 text-sm text-[var(--secondary-foreground)]">Vị trí đẹp, giá này có thương lượng thêm không?</p>
                  </div>
                  <div className="theme-subtle-card rounded-xl p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">Trần Mai Anh</p>
                    <p className="mt-1 text-sm text-[var(--secondary-foreground)]">Mình muốn xem thêm pháp lý và lịch hẹn xem nhà.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      <ReportPostDialog
        open={isReportDialogOpen}
        postId={post.id}
        postTitle={post.title}
        onClose={() => setIsReportDialogOpen(false)}
      />

      <style jsx global>{`
        @keyframes commentButtonPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(103, 232, 249, 0.35);
          }
          60% {
            transform: scale(1.06);
            box-shadow: 0 0 0 12px rgba(103, 232, 249, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(103, 232, 249, 0);
          }
        }

        @keyframes heartBurst {
          0% {
            opacity: 0;
            transform: translate(0, 0) rotate(0deg) scale(0.45);
          }
          16% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(var(--x), var(--y)) rotate(var(--r)) scale(1.35);
          }
        }

        @keyframes commentSmoke {
          0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.45);
          }
          18% {
            opacity: 0.85;
          }
          100% {
            opacity: 0;
            transform: translate3d(10px, -34px, 0) scale(1.9);
          }
        }

        @keyframes killImpactFlash {
          0% {
            opacity: 0;
            background: color-mix(in srgb, var(--effect-danger-glow) 0%, transparent);
            transform: scale(0.35);
          }
          20% {
            opacity: 1;
            background: var(--effect-danger-glow);
            transform: scale(1);
          }
          100% {
            opacity: 0;
            background: color-mix(in srgb, var(--effect-danger-glow) 0%, transparent);
            transform: scale(1.35);
          }
        }

        @keyframes savePulse {
          0% {
            opacity: 0;
            background: color-mix(in srgb, var(--effect-save) 0%, transparent);
            transform: scale(0.35);
          }
          24% {
            opacity: 1;
            background: var(--effect-save);
            transform: scale(1);
          }
          100% {
            opacity: 0;
            background: color-mix(in srgb, var(--effect-save) 0%, transparent);
            transform: scale(1.35);
          }
        }

        @keyframes saveRing {
          0% {
            opacity: 0;
            border-color: color-mix(in srgb, var(--effect-info-glow) 0%, transparent);
            transform: translate(-50%, -50%) scale(0.35);
          }
          28% {
            opacity: 1;
            border-color: var(--effect-info-glow);
          }
          100% {
            opacity: 0;
            border-color: color-mix(in srgb, var(--effect-info-glow) 0%, transparent);
            transform: translate(-50%, -50%) scale(1.6);
          }
        }

        @keyframes saveSpark {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          20% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2);
          }
        }

        @keyframes saveIconPop {
          0% {
            transform: scale(1) rotate(0deg);
          }
          35% {
            transform: scale(1.26) rotate(-8deg);
          }
          62% {
            transform: scale(0.95) rotate(4deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes killSlash {
          0% {
            opacity: 0;
            transform: translate(-145%, 95%) rotate(-45deg) scaleX(0.2);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(42%, -130%) rotate(-45deg) scaleX(1.3);
          }
        }

        @keyframes killSlashSecondary {
          0% {
            opacity: 0;
            transform: translate(90%, 90%) rotate(45deg) scaleX(0.18);
          }
          18% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate(-120%, -120%) rotate(45deg) scaleX(1.05);
          }
        }

        @keyframes killShard {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2);
          }
        }

        @keyframes killIconShake {
          0% {
            transform: translateX(0) rotate(0deg) scale(1);
          }
          18% {
            transform: translateX(-2px) rotate(-14deg) scale(1.18);
          }
          36% {
            transform: translateX(2px) rotate(12deg) scale(1.08);
          }
          58% {
            transform: translateX(-1px) rotate(-7deg) scale(1.12);
          }
          100% {
            transform: translateX(0) rotate(0deg) scale(1);
          }
        }
      `}</style>
    </>
  );
}
