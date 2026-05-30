"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Building2,
  ChevronLeft,
  ChevronRight,
  Expand,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
  X,
  Wifi,
  Wind,
  Armchair,
  Droplets,
  Snowflake,
  ThermometerSun,
  Waves,
  ArrowUpDown,
  Car,
  Bike,
  Shield,
  Trees,
  Building,
  Scroll,
  Milestone,
  Home,
  Dog,
  HelpCircle,
  Hash,
  User,
  Map,
  Activity,
  Copy,
  Check,
} from "lucide-react";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import {
  formatArea,
  formatLocation,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  statusLabels,
  statusColors,
  type Post,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";
import dynamic from "next/dynamic";

const PostDetailMap = dynamic(() => import("@/components/map/PostDetailMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] bg-slate-950/40 flex items-center justify-center text-xs text-gray-400 rounded-xl border border-white/10 mt-2">
      Đang tải bản đồ...
    </div>
  ),
});

const featureIconMap: Record<string, React.ComponentType<any>> = {
  wifi: Wifi,
  wind: Wind,
  armchair: Armchair,
  droplets: Droplets,
  snowflake: Snowflake,
  "thermometer-sun": ThermometerSun,
  waves: Waves,
  "arrow-up-down": ArrowUpDown,
  car: Car,
  bike: Bike,
  shield: Shield,
  trees: Trees,
  building: Building,
  scroll: Scroll,
  milestone: Milestone,
  home: Home,
  dog: Dog,
};

const FeatureIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = featureIconMap[name] || HelpCircle;
  return <IconComponent className={className} />;
};

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='52'>TrustEstate</text></svg>";

const savedKey = "trustestate-saved-posts";

const getPostDetailCacheKey = (postId: string) => `posts:detail:${postId}`;

const isUsablePostDetailCache = (value: Post | null): value is Post =>
  Boolean(value?.id && value.author && Array.isArray(value.images));

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [post, setPost] = useState<Post | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaveSubmitting, setIsSaveSubmitting] = useState(false);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);

  // Copy state
  const [isCopied, setIsCopied] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const cacheKey = getPostDetailCacheKey(params.id);
        const cachedPost = readSessionCache<Post>(cacheKey);

        if (isUsablePostDetailCache(cachedPost) && isMounted) {
          setPost(cachedPost);
          setSelectedImage(0);
          setRelatedPosts(cachedPost.relatedPosts ?? []);
          setIsLoading(false);
        }

        const response = await api.get<{ data: Post }>(`/posts/${params.id}`);

        if (!isMounted) {
          return;
        }

        const currentPost = response.data.data;
        setPost(currentPost);
        setSelectedImage(0);
        writeSessionCache(cacheKey, currentPost);

        if (currentPost.relatedPosts) {
          setRelatedPosts(currentPost.relatedPosts);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Khong the tai chi tiet bai dang.");
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

  const canManagePost = useMemo(() => {
    if (!user || !post) {
      return false;
    }

    return user.role === "ADMIN" || user.id === post.author.id;
  }, [post, user]);

  const images = useMemo(() => {
    if (!post) {
      return [];
    }

    return post.images.length > 0 ? post.images : [{ id: "fallback", imageUrl: imageFallback, order: 0 }];
  }, [post]);

  const activeImage = images[selectedImage]?.imageUrl ?? imageFallback;
  const isOwnPost = !!user && !!post && user.id === post.author.id;

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
        writeSessionCache(getPostDetailCacheKey(nextPost.id), nextPost);
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
        writeSessionCache(getPostDetailCacheKey(nextPost.id), nextPost);
        return nextPost;
      });
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể cập nhật bài đã lưu.");
    } finally {
      setIsSaveSubmitting(false);
    }
  };
  const handleCopyId = () => {
    if (!post) return;
    navigator.clipboard.writeText(post.id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Xoa bai dang nay?")) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/posts/${params.id}`);
      router.push("/posts");
      router.refresh();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Khong the xoa bai dang.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMessageClick = async () => {
    if (!user) {
      router.push("/auth/login");
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
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-10 lg:px-8">
        <div className="inline-flex items-center gap-3 text-gray-300">
          <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
          Dang tai chi tiet bai dang...
        </div>
      </div>
    );
  }

  if (error && !post) {
    return (
      <div className="container mx-auto px-4 py-10 lg:px-8">
        <div className="glass-card p-8 text-center">
          <p className="text-lg text-red-200">{error}</p>
          <button type="button" onClick={() => router.push("/posts")} className="btn-primary mt-6">
            Quay lai danh sach
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="container mx-auto space-y-6 px-4 pt-8 pb-28 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="transition hover:text-white">
          Trang chu
        </Link>
        <span>/</span>
        <Link href="/posts" className="transition hover:text-white">
          Bai dang
        </Link>
        <span>/</span>
        <span className="text-white">{post.title}</span>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6 min-w-0">
          <div className="glass-card overflow-hidden p-0">
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

                <div className="absolute left-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white pointer-events-none shadow-md">
                  {postTypeLabels[post.postType]}
                </div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                  className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/50 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-slate-950/80 hover:scale-110 backdrop-blur-sm"
                  title="Phóng to ảnh"
                >
                  <Expand className="h-5 w-5" />
                </button>

                <div className="absolute bottom-4 left-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                    className="rounded-xl border border-white/20 bg-slate-950/60 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-950/80 backdrop-blur-sm"
                  >
                    Ảnh ({images.length})
                  </button>
                </div>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1)); }}
                      className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/50 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-slate-950/80 hover:scale-110 backdrop-blur-sm"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedImage((current) => (current === images.length - 1 ? 0 : current + 1)); }}
                      className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/50 text-white opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-slate-950/80 hover:scale-110 backdrop-blur-sm"
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
                        className="relative overflow-hidden w-full h-full group bg-slate-900"
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
                        <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        {index === 3 && images.length > 5 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-3xl font-semibold text-white transition hover:bg-slate-950/80">
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

          <div className="glass-card p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight text-white break-words">{post.title}</h1>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
                    <BadgeCheck className="h-4 w-4" />
                    Đã xác thực
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-blue-300" />
                    {formatLocation(post)}
                  </span>
                  <span className="text-blue-300">Xem trên bản đồ</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveToggle}
                  disabled={isSaveSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bookmark className={`h-4 w-4 ${post.isSaved ? "fill-blue-400 text-blue-400" : "text-blue-300"}`} />
                  {post.isSaved ? "Đã lưu" : "Lưu"}
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10">
                  <Building2 className="h-4 w-4 text-blue-300" />
                  So sánh
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-gray-200 transition hover:bg-white/10">
                  <Share2 className="h-4 w-4 text-blue-300" />
                  Chia sẻ
                </button>
                {conversationError ? (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {conversationError}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-start gap-x-8 gap-y-6 md:gap-x-12 border-b border-white/10 pb-6">
              <div className="shrink-0">
                <p className="text-3xl sm:text-4xl font-semibold text-blue-300 break-words">{formatPrice(post.price)}</p>
                <p className="mt-1 text-sm text-gray-400">Giá đăng bài</p>
              </div>
              <div className="shrink-0">
                <p className="inline-flex items-center gap-2 text-2xl font-semibold text-white break-words">
                  <Expand className="h-5 w-5 text-blue-300 shrink-0" />
                  {formatArea(post.area)}
                </p>
                <p className="mt-1 text-sm text-gray-400">Diện tích</p>
              </div>
              <div className="shrink-0">
                <p className="text-2xl font-semibold text-white break-words">{propertyTypeLabels[post.propertyType]}</p>
                <p className="mt-1 text-sm text-gray-400">Loại hình</p>
              </div>
              <div className="shrink-0">
                <p className="text-2xl font-semibold text-white break-words">{postTypeLabels[post.postType]}</p>
                <p className="mt-1 text-sm text-gray-400">Loại tin</p>
              </div>
              <div className="shrink-0">
                <p className="text-2xl font-semibold text-white break-words">{post.city.replace(/^(Tỉnh|Thành phố)\s+/i, "")}</p>
                <p className="mt-1 text-sm text-gray-400">Khu vực</p>
              </div>
            </div>

            <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div>
                <h2 className="text-2xl font-semibold text-white">Mô tả chi tiết</h2>
                <p className="mt-4 whitespace-pre-line leading-8 text-gray-300 break-words">{post.description}</p>
              </div>

              <div className="border-t border-white/10 pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <h2 className="text-2xl font-semibold text-white">Thông tin chi tiết</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <Hash className="h-4 w-4" /> Mã tin
                    </dt>
                    <dd className="mt-1 flex items-center gap-2 font-medium text-white break-all">
                      #{post.id.slice(-8).toUpperCase()}
                      <button
                        onClick={handleCopyId}
                        className="inline-flex h-6 w-6 items-center justify-center rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                        title="Copy mã tin"
                      >
                        {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <User className="h-4 w-4" /> Người đăng
                    </dt>
                    <dd className="mt-1 font-medium text-white break-words">{post.author.fullName}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="h-4 w-4" /> Địa chỉ
                    </dt>
                    <dd className="mt-1 font-medium text-white break-words">{post.address}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <Map className="h-4 w-4" /> Quận / huyện
                    </dt>
                    <dd className="mt-1 font-medium text-white break-words">{post.district}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <Map className="h-4 w-4" /> Tỉnh / thành
                    </dt>
                    <dd className="mt-1 font-medium text-white break-words">{post.city}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-gray-400">
                      <Activity className="h-4 w-4" /> Trạng thái
                    </dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColors[post.status] || "bg-gray-500/10 text-gray-300 border-gray-500/20"}`}>
                        {statusLabels[post.status] || post.status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {post.features && post.features.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-2xl font-semibold text-white">Tiện ích & Đặc trưng</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {post.features.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-slate-950/20 p-3.5 text-gray-200 transition-all duration-300 hover:bg-slate-900/40 hover:border-white/10"
                  >
                    <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400">
                      <FeatureIcon name={feature.icon || "help-circle"} className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden p-0">
            <div className="border-b border-white/10 px-6 py-4">
              <h2 className="text-2xl font-semibold text-white">Vị trí trên bản đồ</h2>
            </div>
            <div className="h-[360px] w-full relative">
              <PostDetailMap
                latitude={Number(post.latitude)}
                longitude={Number(post.longitude)}
              />
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="lg:sticky lg:top-24 space-y-5">
            {canManagePost ? (
              <div className="glass-card p-6 border-t-4 border-t-blue-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
                <h2 className="text-xl font-semibold text-white relative">Quản lý bài đăng</h2>
                <p className="text-sm text-gray-400 mt-2 relative">
                  Bạn là người sở hữu bài đăng này. Bạn có quyền chỉnh sửa thông tin hoặc xoá bài viết.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 relative">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-gray-100 transition hover:bg-white/10"
                  >
                    <Pencil className="h-4 w-4" />
                    Chỉnh sửa
                  </Link>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Đang xoá..." : "Xoá bài"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6 border-t-4 border-t-blue-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none" />
                <h2 className="text-xl font-semibold text-white relative">Liên hệ người bán</h2>
                <div className="mt-5 flex items-center gap-4 relative">
                  <div className="relative shrink-0">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-blue-500 bg-blue-500/10 text-xl font-semibold text-blue-200">
                      {post.author.avatarUrl ? (
                        <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
                      ) : (
                        post.author.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 rounded-full bg-slate-900 p-1">
                      <BadgeCheck className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white line-clamp-1">{post.author.fullName}</p>
                    <p className="text-sm text-gray-400 mt-1">Hoạt động gần đây</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 relative">
                  <div className="mb-3 flex items-center gap-2 text-white">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold text-sm">Giao dịch an toàn</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    <li>• Không chuyển khoản trước khi xem nhà.</li>
                    <li>• Kiểm tra giấy tờ và thông tin người đăng.</li>
                    <li>• Liên hệ trực tiếp qua kênh chính thống.</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="glass-card p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">Bất động sản tương tự</h2>
                <Link href="/posts" className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
                  Xem tất cả
                </Link>
              </div>

              <div className="space-y-4">
                {relatedPosts.length === 0 ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-white/10">
                    <p className="text-sm text-gray-400">Chưa có bài đăng tương tự.</p>
                  </div>) : (
                  relatedPosts.map((item) => (
                    <Link
                      key={item.id}
                      href={`/posts/${item.id}`}
                      className="flex gap-3 rounded-2xl border border-transparent p-1 transition hover:border-white/10 hover:bg-white/5"
                    >
                      <img
                        src={item.images[0]?.imageUrl || imageFallback}
                        alt={item.title}
                        loading="lazy"
                        className="h-24 w-28 rounded-2xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-400">{formatLocation(item)}</p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="font-semibold text-blue-300">{formatPrice(item.price)}</span>
                          <span className="text-sm text-gray-400">{formatArea(item.area)}</span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/posts")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lai danh sach
            </button>
          </div>
        </aside>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 p-2 rounded-full transition z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <button
              onClick={() => setSelectedImage((current) => (current === 0 ? images.length - 1 : current - 1))}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          <img
            src={activeImage}
            alt={post.title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          {images.length > 1 && (
            <button
              onClick={() => setSelectedImage((current) => (current === images.length - 1 ? 0 : current + 1))}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-4 py-2 rounded-full text-white text-sm z-10">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Mobile Bottom Action Bar */}
      {!isOwnPost && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 border-t border-white/10 bg-slate-950/90 p-4 pb-6 backdrop-blur-xl lg:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <button
            type="button"
            onClick={handleSaveToggle}
            disabled={isSaveSubmitting}
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Bookmark className={`h-5 w-5 ${post.isSaved ? "fill-blue-400 text-blue-400" : "text-blue-300"}`} />
          </button>
          <a
            href={`mailto:${post.author.email}`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10"
          >
            <MessageCircle className="h-5 w-5" />
            Nhắn tin
          </a>
          <a
            href={post.author.phone ? `tel:${post.author.phone}` : `mailto:${post.author.email}`}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-[0_0_15px_rgba(5,150,105,0.3)] transition hover:bg-emerald-500"
          >
            <Phone className="h-5 w-5" />
            Gọi điện
          </a>
        </div>
      )}
    </div>
  );
}
