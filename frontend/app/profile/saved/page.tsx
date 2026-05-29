"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  ArrowUpDown,
  Bookmark,
  Check,
  CheckSquare,
  LoaderCircle,
  MapPin,
  Search,
  SlidersHorizontal,
  Square,
} from "lucide-react";

import { api } from "@/lib/api";
import { readSessionCache, writeSessionCache } from "@/lib/client-cache";
import {
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type SavedPost,
} from "@/lib/posts";
import { useAuthStore } from "@/stores/auth.store";

type SortValue = "newest" | "priceAsc" | "priceDesc";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

export default function SavedPostsPage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortValue>("newest");
  const [removingPostId, setRemovingPostId] = useState<string | null>(null);
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);
  const [isBulkRemoving, setIsBulkRemoving] = useState(false);

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
        const cacheKey = `profile:saved:${user.id}`;
        const cachedSavedPosts = readSessionCache<SavedPost[]>(cacheKey);
        if (cachedSavedPosts && isMounted) {
          setSavedPosts(cachedSavedPosts);
          setIsLoading(false);
        }
        const response = await api.get<{ data: SavedPost[] }>("/saved-posts?imageLimit=1");

        if (isMounted) {
          setSavedPosts(response.data.data);
          writeSessionCache(cacheKey, response.data.data);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Không thể tải danh sách bài đã lưu.");
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

  const cities = useMemo(
    () =>
      Array.from(new Set(savedPosts.map((item) => item.post.city).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "vi"),
      ),
    [savedPosts],
  );

  const filteredSavedPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = savedPosts.filter((item) => {
      const post = item.post;
      const matchesSearch =
        !normalizedSearch ||
        [post.title, post.description, post.address, post.city, post.district]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      const matchesCity = !cityFilter || post.city === cityFilter;
      const matchesPropertyType =
        !propertyTypeFilter || post.propertyType === propertyTypeFilter;
      const matchesPostType = !postTypeFilter || post.postType === postTypeFilter;

      return matchesSearch && matchesCity && matchesPropertyType && matchesPostType;
    });

    return filtered.sort((left, right) => {
      if (sortBy === "priceAsc") {
        return left.post.price - right.post.price;
      }

      if (sortBy === "priceDesc") {
        return right.post.price - left.post.price;
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }, [cityFilter, postTypeFilter, propertyTypeFilter, savedPosts, search, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setCityFilter("");
    setPropertyTypeFilter("");
    setPostTypeFilter("");
    setSortBy("newest");
  };

  const togglePostSelection = (postId: string) => {
    setSelectedPostIds((currentPostIds) =>
      currentPostIds.includes(postId)
        ? currentPostIds.filter((currentPostId) => currentPostId !== postId)
        : [...currentPostIds, postId],
    );
  };

  const selectAllVisiblePosts = () => {
    setSelectedPostIds(filteredSavedPosts.map((item) => item.postId));
  };

  const clearSelection = () => {
    setSelectedPostIds([]);
  };

  const handleUnsave = async (postId: string) => {
    if (!user) return;

    try {
      setRemovingPostId(postId);
      setError(null);
      await api.delete(`/saved-posts/${postId}`);
      setSavedPosts((currentPosts) => {
        const nextPosts = currentPosts.filter((item) => item.postId !== postId);
        writeSessionCache(`profile:saved:${user.id}`, nextPosts);
        return nextPosts;
      });
      setSelectedPostIds((currentPostIds) => currentPostIds.filter((currentPostId) => currentPostId !== postId));
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể bỏ lưu bài đăng này.");
    } finally {
      setRemovingPostId(null);
    }
  };

  const handleBulkUnsave = async () => {
    if (!user) return;

    if (selectedPostIds.length === 0) {
      return;
    }

    const shouldContinue = window.confirm(
      `Bạn có chắc muốn bỏ lưu ${selectedPostIds.length} bài đăng đã chọn không?`,
    );

    if (!shouldContinue) {
      return;
    }

    try {
      setIsBulkRemoving(true);
      setError(null);
      await api.post("/saved-posts/bulk-remove", {
        postIds: selectedPostIds,
      });
      setSavedPosts((currentPosts) => {
        const nextPosts = currentPosts.filter((item) => !selectedPostIds.includes(item.postId));
        writeSessionCache(`profile:saved:${user.id}`, nextPosts);
        return nextPosts;
      });
      setSelectedPostIds([]);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message ?? "Không thể bỏ lưu các bài đã chọn.");
    } finally {
      setIsBulkRemoving(false);
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="glass-card overflow-hidden p-0">
          <div className="relative overflow-hidden px-6 py-8 md:px-8 md:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.14),transparent_25%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
                  <Bookmark className="h-4 w-4 fill-blue-400 text-blue-400" />
                  Bộ sưu tập quan tâm
                </div>
                <h1 className="text-3xl font-bold text-white md:text-4xl">Bài đã lưu</h1>
                <p className="mt-3 max-w-xl text-gray-300">
                  Những bất động sản bạn đã lưu để xem lại, so sánh và liên hệ khi cần.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-gray-400">Tổng bài đã lưu</p>
                  <p className="mt-2 text-3xl font-bold text-white">{savedPosts.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-gray-400">Đang hiển thị</p>
                  <p className="mt-2 text-3xl font-bold text-blue-300">{filteredSavedPosts.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-5 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input-dark pl-11"
                placeholder="Tìm trong bài đã lưu..."
              />
            </label>

            <select
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              className="input-dark"
            >
              <option value="">Tất cả khu vực</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={propertyTypeFilter}
              onChange={(event) => setPropertyTypeFilter(event.target.value)}
              className="input-dark"
            >
              <option value="">Tất cả loại BĐS</option>
              <option value="HOUSE">Nhà</option>
              <option value="APARTMENT">Căn hộ</option>
              <option value="LAND">Đất</option>
              <option value="ROOM">Phòng</option>
            </select>

            <select
              value={postTypeFilter}
              onChange={(event) => setPostTypeFilter(event.target.value)}
              className="input-dark"
            >
              <option value="">Tất cả giao dịch</option>
              <option value="SELL">Bán</option>
              <option value="RENT">Cho thuê</option>
              <option value="FIND">Cần tìm</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortValue)}
              className="input-dark"
            >
              <option value="newest">Mới lưu gần đây</option>
              <option value="priceAsc">Giá tăng dần</option>
              <option value="priceDesc">Giá giảm dần</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-gray-400">
              <SlidersHorizontal className="h-4 w-4 text-blue-300" />
              Bộ lọc đang áp dụng
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
            >
              Xóa tất cả bộ lọc
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200">
              <ArrowUpDown className="h-4 w-4" />
              {sortBy === "newest"
                ? "Ưu tiên bài lưu gần đây"
                : sortBy === "priceAsc"
                  ? "Ưu tiên giá thấp"
                  : "Ưu tiên giá cao"}
            </span>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card overflow-hidden p-0">
                <div className="aspect-[16/10] animate-pulse bg-white/5" />
                <div className="space-y-4 p-5">
                  <div className="h-6 animate-pulse rounded-full bg-white/5" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/5" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSavedPosts.length === 0 ? (
          <div className="glass-card flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <Bookmark className="h-9 w-9 fill-blue-400 text-blue-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white">
              {savedPosts.length === 0 ? "Bạn chưa lưu bài đăng nào" : "Không có bài nào khớp bộ lọc"}
            </h2>
            <p className="mt-3 max-w-xl text-gray-400">
              {savedPosts.length === 0
                ? "Hãy khám phá bảng tin và lưu lại những bất động sản bạn quan tâm để xem lại sau."
                : "Thử đổi từ khóa hoặc xóa bớt bộ lọc để xem thêm các bất động sản đã lưu."}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/posts" className="btn-primary">
                Khám phá bài đăng
              </Link>
              {savedPosts.length > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10"
                >
                  Xóa bộ lọc
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredSavedPosts.map((savedPost) => {
              const { post } = savedPost;
              const imageUrl = post.images[0]?.imageUrl ?? imageFallback;
              const isSelected = selectedPostIds.includes(post.id);

              return (
                <article
                  key={savedPost.id}
                  className={`glass-card group overflow-hidden p-0 transition ${
                    isSelected ? "ring-2 ring-blue-500/60" : ""
                  }`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Link
                      href={`/posts/${post.id}`}
                      onClick={() => writeSessionCache(`posts:detail:${post.id}`, post)}
                      className="block h-full w-full"
                    >
                      <img
                        src={imageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </Link>
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
                      <button
                        type="button"
                        onClick={() => togglePostSelection(post.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white backdrop-blur-md transition hover:bg-white/10"
                        title={isSelected ? "Bỏ chọn" : "Chọn bài đăng"}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-blue-300" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-300" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnsave(post.id)}
                        disabled={removingPostId === post.id || isBulkRemoving}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-blue-300 backdrop-blur-md transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Bỏ lưu"
                      >
                        {removingPostId === post.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bookmark className="h-4 w-4 fill-blue-400 text-blue-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {postTypeLabels[post.postType]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        {propertyTypeLabels[post.propertyType]}
                      </span>
                    </div>

                    <div>
                      <p className="text-2xl font-bold text-blue-300">{formatPrice(post.price)}</p>
                      <Link
                        href={`/posts/${post.id}`}
                        onClick={() => writeSessionCache(`posts:detail:${post.id}`, post)}
                        className="mt-2 block line-clamp-2 text-lg font-semibold text-white transition hover:text-blue-300"
                      >
                        {post.title}
                      </Link>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-400">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                      <span className="line-clamp-1">
                        {[post.district, post.city].filter(Boolean).join(", ")}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-300">{post.area} m²</p>

                    <button
                      type="button"
                      onClick={() => handleUnsave(post.id)}
                      disabled={removingPostId === post.id || isBulkRemoving}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {removingPostId === post.id ? "Đang bỏ lưu..." : "Bỏ lưu"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedPostIds.length > 0 ? (
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-blue-400/20 bg-slate-950/90 px-4 py-3 shadow-[0_20px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl">
              <span className="text-sm font-medium text-white">
                Đã chọn {selectedPostIds.length} bài
              </span>
              <button
                type="button"
                onClick={selectAllVisiblePosts}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-white/10"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={handleBulkUnsave}
                disabled={isBulkRemoving}
                className="rounded-full border border-blue-400/20 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkRemoving ? "Đang bỏ lưu..." : "Bỏ lưu đã chọn"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
