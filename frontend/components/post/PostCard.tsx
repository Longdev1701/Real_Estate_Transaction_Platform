"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
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
  X,
} from "lucide-react";

import {
  formatArea,
  formatLocation,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
} from "@/lib/posts";
import { useSound } from "@/hooks/useSound";
import { api } from "@/lib/api";
import { writeSessionCache } from "@/lib/client-cache";
import { useAuthStore } from "@/stores/auth.store";

const CommentSection = dynamic(() => import("@/components/comment/CommentSection"));
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

const Metric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
    <div className="flex min-w-0 items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-blue-300" />
      <p className="truncate text-sm font-semibold text-white">{value}</p>
    </div>
    <p className="mt-1 pl-6 text-xs text-gray-400">{label}</p>
  </div>
);

const getTileClassName = (imageCount: number, index: number) => {
  if (imageCount === 1) return "h-80";
  if (imageCount === 2) return "h-64";
  if (imageCount === 3) return index === 0 ? "col-span-2 h-64" : "h-52";
  return "h-56";
};

const getGalleryGridClassName = (imageCount: number) => {
  if (imageCount === 1) return "grid-cols-1";
  if (imageCount === 2) return "grid-cols-2 gap-1";
  if (imageCount === 3) return "grid-cols-2 gap-1 auto-rows-min";
  return "grid-cols-3 gap-1";
};

export function PostCard({ post }: { post: Post }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { playDetail, playLikeBegin, playLikeEnd, playComment, playSave } = useSound();
  const [imageError, setImageError] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [isSaved, setIsSaved] = useState(Boolean(post.isSaved));
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [saveEffect, setSaveEffect] = useState<{ key: number; type: "save" | "unsave" } | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const images = useMemo(
    () => (post.images.length > 0 ? post.images : [{ id: "fallback", imageUrl: imageFallback, order: 0 }]),
    [post.images],
  );

  const totalImages = post.imageCount ?? post.images.length;
  const visibleImages = images.slice(0, Math.min(images.length, 3));
  const activeImage = images[activeImageIndex]?.imageUrl ?? imageFallback;
  const location = formatLocation(post) || post.address || post.city;
  const canReportPost = !user || user.id !== post.author.id;
  const engagementSeed = post.id.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  const likeCount = 48 + (engagementSeed % 96);
  const commentCount = post.commentCount ?? 0;

  const openImageViewer = (index: number) => {
    setActiveImageIndex(index);
    setIsImageViewerOpen(true);
  };

  const cachePostDetailPreview = () => {
    writeSessionCache(`posts:detail:${post.id}`, {
      ...post,
      features: post.features ?? [],
      relatedPosts: post.relatedPosts ?? [],
    }, { ttlMs: POST_DETAIL_CACHE_TTL_MS });
  };

  const goToPreviousImage = () => {
    setActiveImageIndex((current) => (current === 0 ? images.length - 1 : current - 1));
  };

  const goToNextImage = () => {
    setActiveImageIndex((current) => (current === images.length - 1 ? 0 : current + 1));
  };

  const handleLikeClick = () => {
    setIsLiked((current) => {
      if (current) {
        playLikeEnd();
      } else {
        playLikeBegin();
      }
      return !current;
    });
    setLikeBurstKey((current) => current + 1);
  };

  const handleSaveClick = async () => {
    if (isSaveSubmitting) {
      return;
    }

    if (!user) {
      router.push("/auth/login");
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
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setIsReportDialogOpen(true);
  };

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-blue-400/15 bg-slate-950/55 shadow-[0_20px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 px-4 pb-3 pt-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">

            <Link
              href={`/profile/posts?authorId=${post.author.id}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-500/10 text-sm font-semibold text-blue-100 transition hover:border-blue-300 hover:ring-2 hover:ring-blue-500/30"
              aria-label={`Xem bài đăng của ${post.author.fullName}`}
            >
              {post.author.avatarUrl ? (
                <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
              ) : (
                getInitial(post.author.fullName)
              )}
            </Link>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate font-semibold text-white">{post.author.fullName}</p>
                <BadgeCheck className="h-4 w-4 shrink-0 fill-blue-500 text-slate-950" />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>{getRelativeTime(post.createdAt)}</span>
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 font-medium text-blue-200">
                  {propertyTypeLabels[post.propertyType]}
                </span>
                <span className="rounded-full bg-white/5 px-2 py-0.5 font-medium text-gray-200">
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
                className="group/report relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-amber-200 transition hover:border-amber-400/35 hover:bg-amber-500/10 hover:text-amber-100"
                aria-label="Báo cáo bài đăng"
                title="Báo cáo bài đăng"
              >
                <span className="pointer-events-none absolute inset-1 rounded-full opacity-0 blur-lg transition duration-300 group-hover/report:bg-amber-400/20 group-hover/report:opacity-100" />
                <TriangleAlert className="relative h-5 w-5 transition duration-300 group-hover/report:-translate-y-0.5 group-hover/report:scale-110 group-hover/report:drop-shadow-[0_0_10px_rgba(251,191,36,0.75)]" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaveSubmitting}
              className={`group/save relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-70 ${
                isSaved
                  ? "border-blue-400/40 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 hover:text-white"
                  : "border-white/15 bg-white/5 text-gray-300 hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-blue-100"
              }`}
              aria-label="Lưu bài đăng"
              title="Lưu bài đăng"
            >
              {saveEffect && (
                <span key={saveEffect.key} className="pointer-events-none absolute inset-0 z-20">
                  {saveEffect.type === "save" ? (
                    <>
                      <span className="absolute -inset-2 rounded-full bg-blue-400/0" style={{ animation: "savePulse 720ms ease-out forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-200/0" style={{ animation: "saveRing 760ms ease-out forwards" }} />
                      {[0, 1, 2, 3, 4, 5].map((item) => (
                        <span
                          key={item}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-blue-300 opacity-0 shadow-[0_0_10px_rgba(96,165,250,0.95)]"
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
                      <span className="absolute -inset-3 rounded-full bg-red-500/0" style={{ animation: "killImpactFlash 620ms ease-out forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-1.5 w-16 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-gradient-to-r from-transparent via-red-500 to-yellow-100 opacity-0 shadow-[0_0_18px_rgba(248,113,113,0.95)]" style={{ animation: "killSlash 680ms cubic-bezier(0.16,1,0.3,1) forwards" }} />
                      <span className="absolute left-1/2 top-1/2 h-1 w-12 origin-center -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-gradient-to-r from-transparent via-red-400 to-white opacity-0 shadow-[0_0_14px_rgba(239,68,68,0.9)]" style={{ animation: "killSlashSecondary 680ms cubic-bezier(0.16,1,0.3,1) 90ms forwards" }} />
                      {[0, 1, 2, 3, 4, 5].map((item) => (
                        <span
                          key={item}
                          className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-red-400 opacity-0 shadow-[0_0_8px_rgba(248,113,113,0.9)]"
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
              <span className={`pointer-events-none absolute inset-1 rounded-full opacity-0 blur-lg transition duration-300 group-hover/save:opacity-100 ${isSaved ? "group-hover/save:bg-blue-400/30" : "group-hover/save:bg-red-400/20"}`} />
              <Bookmark className={`relative h-5 w-5 transition duration-300 group-hover/save:scale-110 ${saveEffect ? (saveEffect.type === "save" ? "animate-[saveIconPop_560ms_ease-out]" : "animate-[killIconShake_520ms_ease-out]") : ""} ${isSaved ? "fill-blue-400 text-blue-400" : ""}`} />
            </button>
          </div>        </div>

        <div className="px-4 md:px-5">
          <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="mb-1 block">
            <h3 className="line-clamp-1 text-base font-semibold text-white transition hover:text-blue-200">
              {post.title}
            </h3>
          </Link>
          <p className="mb-3 line-clamp-2 text-sm leading-5 text-gray-300">{post.description}</p>

          <div className={`grid overflow-hidden rounded-xl border border-white/10 bg-slate-900 ${getGalleryGridClassName(images.length)}`}>
            {visibleImages.map((image, index) => {
              const remainingImages = Math.max(0, totalImages - 3);
              const isLastVisibleImage = index === visibleImages.length - 1;

              return (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => openImageViewer(index)}
                  className={`group relative block overflow-hidden bg-slate-900 text-left ${getTileClassName(images.length, index)}`}
                >
                  <img
                    src={imageError ? imageFallback : image.imageUrl}
                    alt={`${post.title} ${index + 1}`}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    onError={() => setImageError(true)}
                  />
                  {index === 0 && (
                    <div className="absolute left-3 top-3 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)]">
                      {propertyTypeLabels[post.propertyType]}
                    </div>
                  )}
                  {remainingImages > 0 && isLastVisibleImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-2xl font-bold text-white backdrop-blur-[1px]">
                      +{remainingImages}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4 md:px-5 md:pb-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric icon={Building2} label="Giá bán" value={formatPrice(post.price)} />
            <Metric icon={Ruler} label="Diện tích" value={formatArea(post.area)} />
            <Metric icon={MapPin} label="Vị trí" value={location} />
          </div>

          <div className="grid grid-cols-3 overflow-visible rounded-xl border border-white/10 bg-slate-950/25 text-sm text-gray-300">
            <button
              type="button"
              onClick={handleLikeClick}
              className={`group/like relative inline-flex items-center justify-center gap-2 overflow-visible px-2 py-3 transition hover:bg-rose-500/10 ${
                isLiked ? "text-rose-300" : "hover:text-rose-100"
              }`}
            >
              <span className="pointer-events-none absolute inset-1 rounded-xl opacity-0 blur-xl transition duration-500 group-hover/like:bg-rose-500/20 group-hover/like:opacity-100" />
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-300/0 transition duration-500 group-hover/like:scale-150 group-hover/like:border-rose-300/25 group-hover/like:opacity-0" />
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
                      className="absolute text-rose-400 opacity-0 drop-shadow-[0_0_10px_rgba(251,113,133,0.9)]"
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
                  isLiked ? "scale-125 fill-rose-400 text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.75)]" : ""
                }`}
              />
              <span className="hidden sm:inline">Thích</span>
              <span className="text-xs text-gray-500">{likeCount + (isLiked ? 1 : 0)}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playComment();
                setIsCommentOpen(true);
              }}
              className="group/comment relative inline-flex items-center justify-center gap-2 overflow-hidden border-l border-white/10 px-2 py-3 text-blue-200 transition hover:bg-cyan-400/10 hover:text-cyan-100"
            >
              <span className="pointer-events-none absolute bottom-1 left-1/2 h-7 w-16 -translate-x-1/2 rounded-full bg-cyan-200/0 blur-md transition duration-500 group-hover/comment:bg-cyan-200/15" />
              {[0, 1, 2, 3, 4].map((item) => (
                <span
                  key={item}
                  className="pointer-events-none absolute bottom-2 h-2 w-2 rounded-full bg-cyan-100/35 opacity-0 blur-[1px] group-hover/comment:animate-[commentSmoke_1.25s_ease-out_infinite]"
                  style={{
                    left: `${34 + item * 8}%`,
                    animationDelay: `${item * 120}ms`,
                  }}
                />
              ))}
              <MessageCircle className="relative h-4 w-4 transition duration-500 group-hover/comment:-translate-y-0.5 group-hover/comment:scale-110 group-hover/comment:drop-shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
              <span className="hidden sm:inline">Bình luận</span>
              <span className="relative text-xs text-gray-500">{commentCount}</span>
            </button>
            <Link              href={`/posts/${post.id}`}
              onClick={() => {
                cachePostDetailPreview();
                playDetail();
              }}
              className="group relative inline-flex items-center justify-center gap-2 overflow-hidden border-l border-cyan-300/25 bg-[linear-gradient(135deg,#0ea5e9,#2563eb_48%,#7c3aed)] px-2 py-3 font-semibold text-white shadow-[0_0_24px_rgba(14,165,233,0.35)] transition duration-300 hover:scale-[1.01] hover:shadow-[0_0_34px_rgba(34,211,238,0.55)]"
            >
              <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
              <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-cyan-100 ring-1 ring-white/20 transition duration-700 ease-out group-hover:rotate-[720deg] group-hover:scale-110 group-hover:bg-white/25 group-hover:text-white">
                <Expand className="h-4 w-4 transition duration-700 ease-out group-hover:rotate-[360deg] group-hover:scale-125" />
              </span>
              <span className="relative">Xem chi tiết</span>
            </Link>
          </div>
        </div>
      </article>

      {isImageViewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 backdrop-blur-sm md:p-6">
          <button
            type="button"
            onClick={() => setIsImageViewerOpen(false)}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPreviousImage}
                className="absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                className="absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="flex max-h-[92vh] w-full max-w-6xl flex-col items-center gap-4">
            <img
              src={activeImage}
              alt={`${post.title} ${activeImageIndex + 1}`}
              className="max-h-[78vh] max-w-full rounded-xl object-contain"
            />
            <div className="rounded-full bg-black/55 px-4 py-2 text-sm font-medium text-white">
              {activeImageIndex + 1} / {images.length}
            </div>
            {images.length > 1 && (
              <div className="scrollbar-hidden flex max-w-full gap-2 overflow-x-auto px-2">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-14 w-24 shrink-0 overflow-hidden rounded-lg border transition ${
                      activeImageIndex === index ? "border-blue-400 opacity-100" : "border-white/15 opacity-65 hover:opacity-100"
                    }`}
                  >
                    <img src={image.imageUrl} alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isCommentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-md md:p-6">
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-blue-400/30 bg-[#061225] shadow-[0_30px_120px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-500/10 text-sm font-semibold text-blue-100">
                  {post.author.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                  ) : (
                    getInitial(post.author.fullName)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-white">{post.author.fullName}</p>
                    <BadgeCheck className="h-4 w-4 shrink-0 fill-blue-500 text-slate-950" />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {getRelativeTime(post.createdAt)} · {propertyTypeLabels[post.propertyType]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCommentOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng bình luận"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="scrollbar-hidden overflow-y-auto p-4 md:p-5">
              <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                <img src={activeImage} alt={post.title} className="aspect-[16/9] w-full object-cover" />
                <div className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                  {activeImageIndex + 1}/{images.length}
                </div>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
                      aria-label="Ảnh trước"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextImage}
                      className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
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
                        activeImageIndex === index ? "border-blue-400" : "border-white/10 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={image.imageUrl} alt={`${post.title} ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <h3 className="text-2xl font-bold text-white">{post.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-300">{post.description}</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Metric icon={Building2} label="Giá bán" value={formatPrice(post.price)} />
                <Metric icon={Expand} label="Diện tích" value={formatArea(post.area)} />
                <Metric icon={MapPin} label="Vị trí" value={location} />
              </div>

              <div className="mt-4">
                <CommentSection postId={post.id} postAuthorId={post.author.id} />
              </div>
              <div className="hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-white">Bình luận ({commentCount})</h4>
                  <span className="text-xs text-gray-400">Mới nhất</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-blue-500/10 text-xs font-semibold text-blue-100">
                    T
                  </div>
                  <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-slate-950/35 px-3 text-sm text-gray-400">
                    Viết bình luận của bạn...
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500"
                    aria-label="Gửi bình luận"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-sm font-semibold text-white">Nguyễn Hoàng</p>
                    <p className="mt-1 text-sm text-gray-300">Vị trí đẹp, giá này có thương lượng thêm không?</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-3">
                    <p className="text-sm font-semibold text-white">Trần Mai Anh</p>
                    <p className="mt-1 text-sm text-gray-300">Mình muốn xem thêm pháp lý và lịch hẹn xem nhà.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportPostDialog
        open={isReportDialogOpen}
        postId={post.id}
        postTitle={post.title}
        onClose={() => setIsReportDialogOpen(false)}
      />

      <style jsx global>{`
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
            background: rgba(239, 68, 68, 0);
            transform: scale(0.35);
          }
          20% {
            opacity: 1;
            background: rgba(239, 68, 68, 0.28);
            transform: scale(1);
          }
          100% {
            opacity: 0;
            background: rgba(239, 68, 68, 0);
            transform: scale(1.35);
          }
        }

        @keyframes savePulse {
          0% {
            opacity: 0;
            background: rgba(59, 130, 246, 0);
            transform: scale(0.35);
          }
          24% {
            opacity: 1;
            background: rgba(59, 130, 246, 0.28);
            transform: scale(1);
          }
          100% {
            opacity: 0;
            background: rgba(59, 130, 246, 0);
            transform: scale(1.35);
          }
        }

        @keyframes saveRing {
          0% {
            opacity: 0;
            border-color: rgba(191, 219, 254, 0);
            transform: translate(-50%, -50%) scale(0.35);
          }
          28% {
            opacity: 1;
            border-color: rgba(191, 219, 254, 0.9);
          }
          100% {
            opacity: 0;
            border-color: rgba(191, 219, 254, 0);
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
