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
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [actionPicker, setActionPicker] = useState<"detail" | "message" | null>(null);

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchSavedPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const cacheKey = `compare:saved:${user.id}`;
        const cachedSavedPosts = readSessionCache<SavedPost[]>(cacheKey);
        if (cachedSavedPosts && isMounted) {
          setSavedPosts(cachedSavedPosts);
          setSelectedPostIds(cachedSavedPosts.slice(0, maxCompareItems).map((item) => item.postId));
          setIsLoading(false);
        }
        const response = await api.get<{ data: SavedPost[] }>("/saved-posts?includeFeatures=true&imageLimit=1");
        const items = response.data.data;

        if (isMounted) {
          setSavedPosts(items);
          setSelectedPostIds(items.slice(0, maxCompareItems).map((item) => item.postId));
          writeSessionCache(cacheKey, items);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải danh sách bất động sản đã lưu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSavedPosts();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, user]);

  const savedPostMap = useMemo(
    () => new Map(savedPosts.map((item) => [item.postId, item])),
    [savedPosts],
  );

  const selectedPosts = useMemo(
    () =>
      selectedPostIds
        .map((postId) => savedPostMap.get(postId)?.post)
        .filter((post): post is Post => Boolean(post)),
    [savedPostMap, selectedPostIds],
  );

  const toggleSelectedPost = (postId: string) => {
    setActionError(null);
    setSelectedPostIds((current) => {
      if (current.includes(postId)) {
        return current.filter((id) => id !== postId);
      }

      if (current.length >= maxCompareItems) {
        setActionError("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
        return current;
      }

      return [...current, postId];
    });
  };

  const removeFromCompare = (postId: string) => {
    setSelectedPostIds((current) => current.filter((id) => id !== postId));
  };

  const clearCompare = () => {
    setSelectedPostIds([]);
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
      router.push(`/messages/${response.data.data.conversation.id}`);
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
        <aside className="glass-card h-fit p-4 xl:sticky xl:top-24">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Bất động sản đã lưu</h2>
              <p className="mt-1 text-sm text-gray-400">Chọn tối đa 3 bất động sản để so sánh.</p>
            </div>
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-sm font-semibold text-blue-200">
              {savedPosts.length}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
              Bạn chưa lưu bất động sản nào.
              <Link href="/posts" className="mt-4 inline-flex text-blue-300 hover:text-blue-200">
                Mở bảng tin
              </Link>
            </div>
          ) : (
            <div className="no-scrollbar max-h-[58vh] space-y-3 overflow-y-auto overflow-x-hidden">
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
                      selected
                        ? "border-blue-400/40 bg-blue-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <img src={imageUrl} alt={post.title} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-white">{post.title}</span>
                      <span className="mt-1 block truncate text-sm text-gray-300">{compactPrice(post.price)}</span>
                    </span>
                    {selected ? (
                      <CheckSquare className="h-5 w-5 shrink-0 text-blue-300" />
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-gray-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/10 p-4">
            <div className="mb-2 inline-flex rounded-full bg-blue-500/15 p-2 text-blue-200">
              <Lightbulb className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white">Mẹo so sánh</h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Các tiêu chí nổi bật sẽ được đánh dấu bằng nhãn xanh để bạn dễ nhận ra lựa chọn phù hợp.
            </p>
          </div>
        </aside>

        <main className="glass-card overflow-hidden p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">So sánh bất động sản</h1>
              <p className="mt-2 max-w-3xl text-gray-400">
                So sánh chi tiết các bất động sản đã lưu để tìm lựa chọn phù hợp nhất với nhu cầu của bạn.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
              <Scale className="h-4 w-4 text-blue-300" />
              Đang so sánh {selectedPosts.length}/{maxCompareItems} bất động sản
            </div>
          </div>

          {(error || actionError) && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error || actionError}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <div className="inline-flex items-center gap-3 text-gray-300">
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
                Đang tải dữ liệu so sánh...
              </div>
            </div>
          ) : selectedPosts.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <div className="mb-5 rounded-full border border-blue-400/20 bg-blue-500/10 p-4 text-blue-300">
                <Scale className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-semibold text-white">Chưa chọn bất động sản để so sánh</h2>
              <p className="mt-3 max-w-xl text-gray-400">
                Chọn các bất động sản đã lưu ở thanh bên trái hoặc lưu thêm bài đăng từ bảng tin.
              </p>
              <Link href="/posts" className="btn-primary mt-6 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Thêm bất động sản
              </Link>
            </div>
          ) : (
            <>
              <div className={`grid gap-4 ${selectedPosts.length === 1 ? "lg:grid-cols-1" : selectedPosts.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                {selectedPosts.map((post) => {
                  const imageUrl = post.images[0]?.imageUrl ?? imageFallback;

                  return (
                    <article key={post.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                      <div className="relative h-44 overflow-hidden">
                        <img src={imageUrl} alt={post.title} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFromCompare(post.id)}
                          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/65 text-white backdrop-blur transition hover:bg-red-500/80"
                          aria-label="Xóa khỏi so sánh"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="space-y-3 p-4">
                        <h2 className="line-clamp-2 text-lg font-semibold text-white">{post.title}</h2>
                        <p className="flex items-start gap-2 text-sm text-gray-400">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                          <span className="line-clamp-1">{formatLocation(post) || post.address}</span>
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-2xl font-bold text-blue-400">{compactPrice(post.price)}</p>
                          <p className="text-sm text-gray-300">{propertyTypeLabels[post.propertyType]}</p>
                        </div>
                        <p className="flex items-center gap-2 text-sm text-gray-400">
                          <CalendarDays className="h-4 w-4" />
                          Cập nhật: {formatDate(post.updatedAt)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[860px] border-collapse text-sm">
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.label} className="border-b border-white/10 last:border-b-0">
                        <th className="w-48 bg-white/[0.03] px-4 py-4 text-left font-medium text-gray-200">
                          <span className="inline-flex items-center gap-3">
                            <row.icon className="h-4 w-4 text-blue-300" />
                            {row.label}
                          </span>
                        </th>
                        {selectedPosts.map((post) => {
                          const best = isBestValue(row, post, selectedPosts);

                          return (
                            <td key={post.id} className="border-l border-white/10 px-4 py-4 text-gray-200">
                              <div className="flex items-center gap-2">
                                {row.label === "Người đăng" && post.author.avatarUrl ? (
                                  <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-8 w-8 rounded-full object-cover" />
                                ) : null}
                                <span>{row.getValue(post)}</span>
                                {best ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-200">
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

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={handleViewDetail}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/35 bg-blue-500/10 px-5 py-3 font-semibold text-blue-200 transition hover:bg-blue-500/20"
                  >
                    <Home className="h-5 w-5" />
                    Xem chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={isStartingConversation}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-[0_0_22px_rgba(37,99,235,0.35)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-500/10 px-5 py-3 font-semibold text-red-200 transition hover:bg-red-500/20"
                  >
                    <Trash2 className="h-5 w-5" />
                    Xóa khỏi so sánh
                  </button>
                </div>
              </div>
            </>
          )}

          {actionPicker ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.65)]">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">
                      {actionPicker === "detail" ? "Chọn căn để xem chi tiết" : "Chọn người để nhắn tin"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {actionPicker === "detail"
                        ? "Bấm vào bất động sản bạn muốn mở trang chi tiết."
                        : "Bấm vào bài đăng của người bạn muốn bắt đầu cuộc trò chuyện."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActionPicker(null)}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:bg-white/10"
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
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:border-blue-400/45 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <img src={imageUrl} alt={post.title} className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-1 font-semibold text-white">{post.title}</span>
                          <span className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                            <UserRound className="h-4 w-4 text-blue-300" />
                            {post.author.fullName}
                          </span>
                          <span className="mt-1 line-clamp-1 text-sm text-gray-400">
                            {formatLocation(post) || post.address}
                          </span>
                          {disabledMessage ? (
                            <span className="mt-2 inline-flex text-xs font-medium text-red-200">
                              Đây là bài đăng của bạn
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 rounded-full border border-blue-400/30 bg-blue-500/10 p-2 text-blue-200 transition group-hover:scale-110 group-hover:bg-blue-500/20">
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
    </div>
  );
}
