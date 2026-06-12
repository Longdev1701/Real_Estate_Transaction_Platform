"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  Bath,
  BedDouble,
  Bookmark,
  Building2,
  CalendarDays,
  Check,
  CheckSquare,
  Crown,
  FileBadge,
  Home,
  Lightbulb,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Plus,
  Ruler,
  Scale,
  SlidersHorizontal,
  Square,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import {
  formatArea,
  formatLocation,
  formatPrice,
  propertyTypeLabels,
  type Post,
  type PropertyType,
  type SavedPost,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 760'><rect width='1200' height='760' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='48'>TrustEstate</text></svg>";

const maxCompareItems = 3;

const formatDate = (rawDate: string) => {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return "Không rõ";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const compactPrice = (price: number) => {
  if (price >= 1_000_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(price / 1_000_000_000)} tỷ`;
  }

  if (price >= 1_000_000) {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(price / 1_000_000)} triệu`;
  }

  return formatPrice(price);
};

const getFeatureSummary = (post: Post) => {
  if (!post.features || post.features.length === 0) {
    return "Chưa cập nhật";
  }

  return post.features.map((feature) => feature.name).slice(0, 5).join(", ");
};

const bedroomBathroomExcludedTypes = new Set<PropertyType>(["LAND", "OFFICE", "SHOPHOUSE", "WAREHOUSE"]);

const getEstimatedBedrooms = (post: Post) => {
  if (bedroomBathroomExcludedTypes.has(post.propertyType)) return "Không áp dụng";
  return Math.max(1, Math.min(5, Math.round(post.area / 35))).toString();
};

const getEstimatedBathrooms = (post: Post) => {
  if (bedroomBathroomExcludedTypes.has(post.propertyType)) return "Không áp dụng";
  return Math.max(1, Math.min(4, Math.round(post.area / 50))).toString();
};

const getLegalStatus = (post: Post) => {
  if (post.features?.some((feature) => feature.name.toLowerCase().includes("sổ"))) {
    return "Đã có sổ";
  }

  return post.status === "ACTIVE" ? "Đang hiển thị" : post.status;
};

type CompareRow = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (post: Post) => string;
  getRankValue?: (post: Post) => number | string;
  best?: "min" | "max" | "same";
};

const compareRows: CompareRow[] = [
  {
    label: "Giá bán",
    icon: Scale,
    getValue: (post) => compactPrice(post.price),
    getRankValue: (post) => post.price,
    best: "min",
  },
  {
    label: "Diện tích",
    icon: Ruler,
    getValue: (post) => formatArea(post.area),
    getRankValue: (post) => post.area,
    best: "max",
  },
  {
    label: "Vị trí",
    icon: MapPin,
    getValue: (post) => [post.district, post.city].filter(Boolean).join(", "),
    getRankValue: (post) => post.city,
    best: "same",
  },
  {
    label: "Loại bất động sản",
    icon: Building2,
    getValue: (post) => propertyTypeLabels[post.propertyType],
  },
  {
    label: "Phòng ngủ",
    icon: BedDouble,
    getValue: getEstimatedBedrooms,
    getRankValue: (post) => (bedroomBathroomExcludedTypes.has(post.propertyType) ? 0 : Number(getEstimatedBedrooms(post))),
    best: "max",
  },
  {
    label: "Phòng tắm",
    icon: Bath,
    getValue: getEstimatedBathrooms,
    getRankValue: (post) => (bedroomBathroomExcludedTypes.has(post.propertyType) ? 0 : Number(getEstimatedBathrooms(post))),
    best: "max",
  },
  {
    label: "Pháp lý",
    icon: FileBadge,
    getValue: getLegalStatus,
    getRankValue: getLegalStatus,
    best: "same",
  },
  {
    label: "Tiện ích",
    icon: Lightbulb,
    getValue: getFeatureSummary,
    getRankValue: (post) => post.features?.length ?? 0,
    best: "max",
  },
  {
    label: "Người đăng",
    icon: UserRound,
    getValue: (post) => post.author.fullName,
  },
  {
    label: "Ngày đăng",
    icon: CalendarDays,
    getValue: (post) => formatDate(post.createdAt),
  },
];

const isBestValue = (row: CompareRow, post: Post, selectedPosts: Post[]) => {
  if (!row.best || !row.getRankValue || selectedPosts.length < 2) {
    return false;
  }

  const values = selectedPosts.map((item) => row.getRankValue!(item));
  const currentValue = row.getRankValue(post);

  if (typeof currentValue === "number") {
    const numberValues = values.filter((value): value is number => typeof value === "number");
    if (numberValues.length === 0) return false;
    return row.best === "min"
      ? currentValue === Math.min(...numberValues)
      : currentValue === Math.max(...numberValues);
  }

  if (row.best === "same") {
    const frequency = values.filter((value) => value === currentValue).length;
    return frequency > 1;
  }

  return false;
};

export default function ComparePage() {
  const router = useRouter();
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [comparedPosts, setComparedPosts] = useState<Post[]>([]);
  const [isSavedPostsLoading, setIsSavedPostsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [actionPicker, setActionPicker] = useState<"detail" | "message" | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem("compared_posts");
        const parsed = stored ? JSON.parse(stored) : [];
        setComparedPosts((current) => {
          const currentIds = current.map((p) => p.id).join(",");
          const parsedIds = parsed.map((p: any) => p.id).join(",");
          if (currentIds === parsedIds) {
            return current;
          }
          return parsed;
        });
      } catch (e) {
        console.error(e);
      }
    };
    handleCompareUpdate();
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, []);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setIsSavedPostsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchSavedPosts = async () => {
      try {
        setIsSavedPostsLoading(true);
        setError(null);
        const cacheKey = `compare:saved:${user.id}`;
        const cachedSavedPosts = readSessionCache<SavedPost[]>(cacheKey);
        if (cachedSavedPosts && isMounted) {
          setSavedPosts(cachedSavedPosts);
          setIsSavedPostsLoading(false);
        }
        const response = await api.get<{ data: SavedPost[] }>("/saved-posts?includeFeatures=true&imageLimit=1");
        const items = response.data.data;

        if (isMounted) {
          setSavedPosts(items);
          writeSessionCache(cacheKey, items);

          // If comparedPosts is empty, initialize it with first 3 saved posts of the same postType
          const stored = localStorage.getItem("compared_posts");
          const parsed = stored ? JSON.parse(stored) : [];
          if (parsed.length === 0 && items.length > 0) {
            const firstPost = items[0].post;
            const initialCompared = items
              .filter((item) => item.post.postType === firstPost.postType)
              .slice(0, maxCompareItems)
              .map((item) => item.post);
            setComparedPosts(initialCompared);
            localStorage.setItem("compared_posts", JSON.stringify(initialCompared));
            window.dispatchEvent(new Event("compare_list_updated"));
          }
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải danh sách bất động sản đã lưu.");
        }
      } finally {
        if (isMounted) {
          setIsSavedPostsLoading(false);
        }
      }
    };

    fetchSavedPosts();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, user]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPickerOpen]);

  const savedPostMap = useMemo(
    () => new Map(savedPosts.map((item) => [item.postId, item])),
    [savedPosts],
  );

  const selectedPosts = comparedPosts;

  const selectedPostIds = useMemo(
    () => comparedPosts.map((p) => p.id),
    [comparedPosts]
  );

  const toggleSelectedPost = (postId: string) => {
    setActionError(null);
    const exists = comparedPosts.some((p) => p.id === postId);

    if (exists) {
      const next = comparedPosts.filter((p) => p.id !== postId);
      setComparedPosts(next);
      localStorage.setItem("compared_posts", JSON.stringify(next));
      window.dispatchEvent(new Event("compare_list_updated"));
    } else {
      if (comparedPosts.length >= maxCompareItems) {
        setActionError("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
        return;
      }
      const post = savedPostMap.get(postId)?.post;
      if (post) {
        if (comparedPosts.length > 0 && comparedPosts[0].postType !== post.postType) {
          setActionError("Không thể so sánh bất động sản Bán với bất động sản Cho thuê. Vui lòng chọn cùng loại giao dịch.");
          return;
        }
        const next = [...comparedPosts, post];
        setComparedPosts(next);
        localStorage.setItem("compared_posts", JSON.stringify(next));
        window.dispatchEvent(new Event("compare_list_updated"));
      }
    }
  };

  const removeFromCompare = (postId: string) => {
    const next = comparedPosts.filter((p) => p.id !== postId);
    setComparedPosts(next);
    localStorage.setItem("compared_posts", JSON.stringify(next));
    window.dispatchEvent(new Event("compare_list_updated"));
  };

  const clearCompare = () => {
    setComparedPosts([]);
    localStorage.removeItem("compared_posts");
    window.dispatchEvent(new Event("compare_list_updated"));
    setActionError(null);
  };

  const handleViewDetail = () => {
    if (selectedPosts.length === 0) {
      setActionError("Vui lòng chọn ít nhất một bất động sản để xem chi tiết.");
      return;
    }

    setActionError(null);
    setActionPicker("detail");
  };

  const handleMessage = () => {
    if (selectedPosts.length === 0) {
      setActionError("Vui lòng chọn một bất động sản để nhắn tin.");
      return;
    }

    setActionError(null);
    setActionPicker("message");
  };

  const openPostDetail = (targetPost: Post) => {
    setActionPicker(null);
    writeSessionCache(`posts:detail:${targetPost.id}`, targetPost);
    router.push(`/posts/${targetPost.id}`);
  };

  const startConversation = async (targetPost: Post) => {
    if (user?.id === targetPost.author.id) {
      setActionError("Đây là bài đăng của bạn. Không thể tự tạo cuộc trò chuyện.");
      return;
    }

    try {
      setIsStartingConversation(true);
      setActionError(null);
      setActionPicker(null);
      const response = await api.post("/conversations", {
        postId: targetPost.id,
        sellerId: targetPost.author.id,
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
      setActionError(axiosError.response?.data?.message ?? "Không thể bắt đầu cuộc trò chuyện lúc này.");
    } finally {
      setIsStartingConversation(false);
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 py-5 lg:px-6">
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden glass-card h-fit p-4 xl:sticky xl:top-24 xl:block">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Bất động sản đã lưu</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Chọn tối đa 3 bất động sản để so sánh.</p>
            </div>
            <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
              {savedPosts.length}
            </span>
          </div>

          {isSavedPostsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="theme-skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted-foreground)]">
              Bạn chưa lưu bất động sản nào.
              <Link href="/posts" className="mt-4 inline-flex text-[var(--accent)] hover:text-[var(--foreground)]">
                Mở bảng tin
              </Link>
            </div>
          ) : (
            <div className="no-scrollbar space-y-3 overflow-x-hidden xl:max-h-[58vh] xl:overflow-y-auto">
              {savedPosts.map((savedPost) => {
                const post = savedPost.post;
                const selected = selectedPostIds.includes(post.id);
                const imageUrl = post.images[0]?.imageUrl ?? imageFallback;

                return (
                  <button
                    key={savedPost.id}
                    type="button"
                    onClick={() => toggleSelectedPost(post.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${selected
                        ? "theme-selection-active"
                        : "theme-selection-idle"
                      }`}
                  >
                    <img src={imageUrl} alt={post.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-[var(--foreground)]">{post.title}</span>
                      <span className="mt-1 block truncate text-sm text-[var(--muted-foreground)]">{compactPrice(post.price)}</span>
                    </span>
                    {selected ? (
                      <CheckSquare className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-[var(--info-border)] bg-[var(--info-soft)] p-4">
            <div className="mb-2 inline-flex rounded-full bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-[var(--foreground)]">Mẹo so sánh</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Các tiêu chí nổi bật sẽ được đánh dấu bằng nhãn xanh để bạn dễ nhận ra lựa chọn phù hợp.
            </p>
          </div>
        </aside>

        <main className="glass-card overflow-hidden p-4 md:p-6">
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4 xl:hidden">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Danh sách chọn so sánh</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {selectedPosts.length > 0
                    ? `Đã chọn ${selectedPosts.length}/${maxCompareItems} bất động sản`
                    : "Chọn tối đa 3 bất động sản đã lưu để đưa vào bảng so sánh."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="theme-surface-soft inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
              >
                <SlidersHorizontal className="h-4 w-4 text-[var(--accent)]" />
                Chọn bài
              </button>
            </div>
          </div>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl md:text-4xl">So sánh bất động sản</h1>
              <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)] sm:text-base">
                So sánh chi tiết các bất động sản đã lưu để tìm lựa chọn phù hợp nhất với nhu cầu của bạn.
              </p>
            </div>
            <div className="theme-surface-soft inline-flex w-fit items-center gap-2 rounded-xl px-4 py-3 text-sm text-[var(--secondary-foreground)]">
              <Scale className="h-4 w-4 text-[var(--accent)]" />
              Đang so sánh {selectedPosts.length}/{maxCompareItems} bất động sản
            </div>
          </div>

          {(error || actionError) && (
            <div className="theme-button-danger-solid mb-5 rounded-xl p-4 text-sm">
              {error || actionError}
            </div>
          )}

          {selectedPosts.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <div className="mb-5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] p-4 text-[var(--accent)]">
                <Scale className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Chưa chọn bất động sản để so sánh</h2>
              <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">
                Chọn các bất động sản đã lưu ở thanh bên trái hoặc lưu thêm bài đăng từ bảng tin.
              </p>
              <Link href="/posts" className="btn-primary mt-6 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Thêm bất động sản
              </Link>
            </div>
          ) : (
            <>
              <div className={`hidden gap-4 md:grid ${selectedPosts.length === 1 ? "lg:grid-cols-1" : selectedPosts.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                {selectedPosts.map((post) => {
                  const imageUrl = post.images[0]?.imageUrl ?? imageFallback;

                  return (
                    <article key={post.id} className="theme-card overflow-hidden rounded-xl">
                      <div className="relative h-44 overflow-hidden">
                        <img src={imageUrl} alt={post.title} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFromCompare(post.id)}
                          className="theme-icon-button absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur transition hover:text-[var(--danger)]"
                          aria-label="Xóa khỏi so sánh"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="space-y-3 p-4">
                        <h2 className="line-clamp-2 text-lg font-semibold text-[var(--foreground)]">{post.title}</h2>
                        <p className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                          <span className="line-clamp-1">{formatLocation(post) || post.address}</span>
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-2xl font-bold text-[var(--primary)]">{compactPrice(post.price)}</p>
                          <p className="text-sm text-[var(--muted-foreground)]">{propertyTypeLabels[post.propertyType]}</p>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                          <CalendarDays className="h-4 w-4" />
                          Cập nhật: {formatDate(post.updatedAt)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3 px-1 md:hidden">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Vuốt ngang để xem đầy đủ bảng so sánh.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsPickerOpen(true)}
                    className="theme-surface-soft inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Chọn lại
                  </button>
                </div>
                <p className="hidden px-1 text-xs text-[var(--muted-foreground)] md:hidden">
                  Vuốt ngang để xem đầy đủ bảng so sánh.
                </p>
                <div className="theme-table-surface overflow-x-auto rounded-xl">
                <table className="w-full min-w-[640px] sm:min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="theme-table-header sticky left-0 top-0 z-20 w-32 bg-[var(--surface)] px-3 py-3 text-left font-medium md:w-48 md:px-4 md:py-4">Tiêu chí</th>
                      {selectedPosts.map((post, index) => (
                        <th key={post.id} className="theme-table-header sticky top-0 z-10 border-l border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left align-top md:px-4 md:py-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="theme-badge-info inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold">
                                {index + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFromCompare(post.id)}
                                className="theme-icon-button inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:text-[var(--danger)] md:hidden"
                                aria-label="Xóa khỏi so sánh"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <img
                              src={post.images[0]?.imageUrl ?? imageFallback}
                              alt={post.title}
                              className="h-16 w-full rounded-xl object-cover md:hidden"
                            />
                            <span className="hidden md:inline-flex theme-badge-info h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold">
                              {index + 1}
                            </span>
                            <p className="line-clamp-2 text-sm font-semibold text-[var(--foreground)] md:text-base">{post.title}</p>
                            <p className="text-xs font-medium text-[var(--accent)]">{compactPrice(post.price)}</p>
                            <p className="line-clamp-1 text-[11px] text-[var(--muted-foreground)] md:hidden">
                              {formatLocation(post) || post.address}
                            </p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.label} className="border-b border-[var(--border)] last:border-b-0">
                        <th className="theme-table-header sticky left-0 z-10 w-32 bg-[var(--surface)] px-3 py-4 text-left font-medium md:w-48 md:px-4">
                          <span className="inline-flex items-center gap-3">
                            <row.icon className="h-4 w-4 text-[var(--accent)]" />
                            {row.label}
                          </span>
                        </th>
                        {selectedPosts.map((post) => {
                          const best = isBestValue(row, post, selectedPosts);

                          return (
                            <td key={post.id} className="border-l border-[var(--border)] px-4 py-4 align-top text-[var(--foreground)]">
                              <div className="flex flex-wrap items-center gap-2">
                                {row.label === "Người đăng" && post.author.avatarUrl ? (
                                  <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-8 w-8 rounded-full object-cover" />
                                ) : null}
                                <span className="break-words">{row.getValue(post)}</span>
                                {best ? (
                                  <span className="theme-button-info inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold">
                                    <Crown className="h-3 w-3" />
                                    Tốt nhất
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </div>

              <div className="theme-surface-soft mt-4 rounded-xl p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleViewDetail}
                    className="theme-button-info inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                  >
                    <Home className="h-5 w-5" />
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={isStartingConversation}
                    className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isStartingConversation ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                    Nhắn tin
                  </button>
                  <button
                    type="button"
                    onClick={clearCompare}
                    className="theme-button-danger-solid inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition"
                  >
                    <Trash2 className="h-5 w-5" />
                    Xóa khỏi so sánh
                  </button>
                </div>
              </div>
            </>
          )}

          {actionPicker ? (
            <div className="theme-overlay-dim fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="theme-modal-surface w-full max-w-2xl p-4">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-[var(--foreground)]">
                      {actionPicker === "detail" ? "Chọn căn để xem chi tiết" : "Chọn người để nhắn tin"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      {actionPicker === "detail"
                        ? "Bấm vào bất động sản bạn muốn mở trang chi tiết."
                        : "Bấm vào bài đăng của người bạn muốn bắt đầu cuộc trò chuyện."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionPicker(null)}
                    className="theme-icon-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition"
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid max-h-[65vh] gap-3 overflow-y-auto pr-1">
                  {selectedPosts.map((post) => {
                    const imageUrl = post.images[0]?.imageUrl ?? imageFallback;
                    const disabledMessage = actionPicker === "message" && user?.id === post.author.id;

                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => {
                          if (actionPicker === "detail") {
                            openPostDetail(post);
                          } else {
                            startConversation(post);
                          }
                        }}
                        disabled={disabledMessage || isStartingConversation}
                        className="group theme-card flex flex-col items-start gap-3 rounded-xl p-3 text-left transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-row sm:items-center"
                      >
                        <img src={imageUrl} alt={post.title} className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-semibold text-[var(--foreground)]">{post.title}</span>
                          <span className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <UserRound className="h-4 w-4 text-[var(--accent)]" />
                            {post.author.fullName}
                          </span>
                          <span className="mt-1 line-clamp-1 text-sm text-[var(--muted-foreground)]">
                            {formatLocation(post) || post.address}
                          </span>
                          {disabledMessage ? (
                            <span className="mt-2 inline-flex text-xs font-medium text-[var(--danger-foreground)]">
                              Đây là bài đăng của bạn
                            </span>
                          ) : null}
                        </span>
                        <span className="theme-button-info shrink-0 rounded-full p-2 transition group-hover:scale-110">
                          {actionPicker === "detail" ? <Home className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {isPickerOpen ? (
        <div className="theme-overlay-dim fixed inset-0 z-50 backdrop-blur-sm xl:hidden" onClick={() => setIsPickerOpen(false)}>
          <div
            className="theme-drawer-surface absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-[28px] sm:left-auto sm:right-4 sm:top-24 sm:w-[380px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">Chọn bài để so sánh</h2>
                <p className="text-xs text-[var(--muted-foreground)]">Danh sách bất động sản đã lưu của bạn.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="theme-surface-soft inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
                aria-label="Đóng danh sách chọn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="no-scrollbar h-full overflow-y-auto p-4 pb-24">
              <section className="glass-card p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Bất động sản đã lưu</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Chọn tối đa 3 bất động sản để so sánh.</p>
                  </div>
                  <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">
                    {savedPosts.length}
                  </span>
                </div>

                {isSavedPostsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="theme-skeleton h-24 rounded-xl" />
                    ))}
                  </div>
                ) : savedPosts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--muted-foreground)]">
                    Bạn chưa lưu bất động sản nào.
                    <Link href="/posts" className="mt-4 inline-flex text-[var(--accent)] hover:text-[var(--foreground)]">
                      Mở bảng tin
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPosts.map((savedPost) => {
                      const post = savedPost.post;
                      const selected = selectedPostIds.includes(post.id);
                      const imageUrl = post.images[0]?.imageUrl ?? imageFallback;

                      return (
                        <button
                          key={savedPost.id}
                          type="button"
                          onClick={() => toggleSelectedPost(post.id)}
                          className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                            selected ? "theme-selection-active" : "theme-selection-idle"
                          }`}
                        >
                          <img src={imageUrl} alt={post.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-medium text-[var(--foreground)]">{post.title}</span>
                            <span className="mt-1 block truncate text-sm text-[var(--muted-foreground)]">{compactPrice(post.price)}</span>
                          </span>
                          {selected ? (
                            <CheckSquare className="h-5 w-5 shrink-0 text-[var(--accent)]" />
                          ) : (
                            <Square className="h-5 w-5 shrink-0 text-[var(--muted)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-[var(--info-border)] bg-[var(--info-soft)] p-4">
                  <div className="mb-2 inline-flex rounded-full bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
                    <Lightbulb className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">Mẹo so sánh</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                    Các tiêu chí nổi bật sẽ được đánh dấu bằng nhãn xanh để bạn dễ nhận ra lựa chọn phù hợp.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm"
                >
                  <SlidersHorizontal className="h-4.5 w-4.5" />
                  Xong
                </button>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
