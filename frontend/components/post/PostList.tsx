"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import {
  Building2,
  Filter,
  Gem,
  House,
  Landmark,
  LoaderCircle,
  MapPinned,
  Newspaper,
  Search,
  SlidersHorizontal,
  X,
  Warehouse,
} from "lucide-react";

import { api } from "@/lib/api";
import { getVersionedStorageKey, readSessionCache, writeSessionCache } from "@/lib/client-cache";
import { useAuthStore } from "@/stores/auth.store";
import {
  buildPostQuery,
  defaultPostFilter,
  normalizePostFilter,
  POST_TYPES,
  PROPERTY_TYPES,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
  type PostFilterValue,
  type PostListData,
  type PostType,
  type PropertyType,
} from "@/lib/posts";
import { PostCard } from "./PostCard";
import { PostFilter } from "./PostFilter";

const PAGE_SIZE = 15;
const POST_LIST_CACHE_TTL_MS = 2 * 60 * 1000;
const getPostListStateKey = (scope: string) => `posts_page_state:${scope}`;

const leftNavItems = [
  { icon: Newspaper, label: "Bảng tin", active: true },
];

const categoryIconMap: Record<PropertyType, React.ComponentType<{ className?: string }>> = {
  APARTMENT: Building2,
  HOUSE: House,
  LAND: MapPinned,
  ROOM: House,
  VILLA: Landmark,
  OFFICE: Building2,
  SHOPHOUSE: Gem,
  WAREHOUSE: Warehouse,
};

const categoryItems: Array<{ value: "" | PropertyType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "", label: "Tất cả", icon: Newspaper },
  ...PROPERTY_TYPES.map((propertyType) => ({
    value: propertyType,
    label: propertyTypeLabels[propertyType],
    icon: categoryIconMap[propertyType],
  })),
];

const transactionItems: Array<{ value: "" | PostType; label: string }> = [
  { value: "", label: "Tất cả" },
  ...POST_TYPES.map((postType) => ({
    value: postType,
    label: postTypeLabels[postType],
  })),
];

const getInitialFilter = (searchParams: URLSearchParams): PostFilterValue => {
  const postType = searchParams.get("postType");
  const propertyType = searchParams.get("propertyType");

  return normalizePostFilter({
    ...defaultPostFilter,
    keyword: searchParams.get("keyword") ?? "",
    city: searchParams.get("city") ?? "",
    district: searchParams.get("district") ?? "",
    postType: POST_TYPES.includes(postType as (typeof POST_TYPES)[number])
      ? (postType as PostFilterValue["postType"])
      : "",
    propertyType: PROPERTY_TYPES.includes(propertyType as (typeof PROPERTY_TYPES)[number])
      ? (propertyType as PostFilterValue["propertyType"])
      : "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    minArea: searchParams.get("minArea") ?? "",
    maxArea: searchParams.get("maxArea") ?? "",
    featureIds: searchParams.get("featureIds") ?? "",
  });
};

export function PostList() {
  const searchParams = useSearchParams();
  const { user, hasHydrated, isLoadingUser } = useAuthStore();
  const searchParamString = searchParams.toString();
  const initialFilter = useMemo(
    () => getInitialFilter(new URLSearchParams(searchParamString)),
    [searchParamString],
  );
  const [draftFilter, setDraftFilter] = useState<PostFilterValue>(initialFilter);
  const [activeFilter, setActiveFilter] = useState<PostFilterValue>(initialFilter);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [hasRestoredAttempted, setHasRestoredAttempted] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isFirstMountRef = useRef(true);
  const scrollSaveFrameRef = useRef<number | null>(null);
  const pendingScrollTopRef = useRef(0);
  const canUsePostListCache = hasHydrated && !isLoadingUser;
  const postListCacheScope = user?.id ? `user:${user.id}` : "guest";
  const postListStateKey = getVersionedStorageKey(getPostListStateKey(postListCacheScope));
  const postListScrollKey = getVersionedStorageKey(`${getPostListStateKey(postListCacheScope)}:scroll`);

  const fetchPosts = useCallback(
    async (nextPage: number, append: boolean, filter: PostFilterValue) => {
      const requestId = ++requestIdRef.current;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      if (!append) {
        setError(null);
      }

      try {
        const query = buildPostQuery(filter, nextPage, PAGE_SIZE);
        const cacheKey = `posts:list:${postListCacheScope}:${query}`;
        if (!append && canUsePostListCache) {
          const cachedPayload = readSessionCache<PostListData>(cacheKey);
          if (cachedPayload) {
            setPosts(cachedPayload.items);
            setPage(cachedPayload.meta.page);
            setHasMore(cachedPayload.meta.hasMore);
            setTotal(cachedPayload.meta.total ?? cachedPayload.items.length);
            setIsLoading(false);
            return;
          }
        }
        const response = await api.get<{ data: PostListData }>(`/posts?${query}`);
        const payload = response.data.data;

        if (requestId !== requestIdRef.current) {
          return;
        }

        setPosts((currentPosts) => (append ? [...currentPosts, ...payload.items] : payload.items));
        setPage(payload.meta.page);
        setHasMore(payload.meta.hasMore);
        setTotal(payload.meta.total ?? payload.items.length);
        if (!append && canUsePostListCache) {
          writeSessionCache(cacheKey, payload, { ttlMs: POST_LIST_CACHE_TTL_MS });
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (requestId === requestIdRef.current) {
          setError(axiosError.response?.data?.message ?? "Không thể tải danh sách bài đăng.");
          if (!append) {
            setPosts([]);
            setTotal(0);
          }
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [canUsePostListCache, postListCacheScope],
  );

  // Restore state on mount matching search params
  useEffect(() => {
    if (!hasHydrated || isLoadingUser) {
      return;
    }

    try {
      const saved = sessionStorage.getItem(postListStateKey);
      if (saved) {
        const state = JSON.parse(saved);
        const stateSearchParams = new URLSearchParams(state.searchParamString);
        const currentSearchParams = new URLSearchParams(searchParamString);
        stateSearchParams.delete("commentPostId");
        currentSearchParams.delete("commentPostId");
        if (stateSearchParams.toString() === currentSearchParams.toString() && state.posts && Array.isArray(state.posts)) {
          setPosts(state.posts);
          setPage(state.page || 1);
          setHasMore(state.hasMore !== false);
          setTotal(state.total || 0);
          setDraftFilter(state.draftFilter || defaultPostFilter);
          setActiveFilter(state.activeFilter || defaultPostFilter);
          setIsRestored(true);
          setIsLoading(false);

          // Restore scroll position as soon as layout completes
          const restoreScroll = () => {
            const savedScrollTop = Number(sessionStorage.getItem(postListScrollKey) ?? state.scrollTop ?? 0);
            if (scrollContainerRef.current && Number.isFinite(savedScrollTop)) {
              scrollContainerRef.current.scrollTop = savedScrollTop;
            }
          };
          requestAnimationFrame(() => {
            restoreScroll();
            // Fallback for slower rendering pipelines
            setTimeout(restoreScroll, 50);
          });
        }
      }
    } catch (e) {
      console.error("Failed to restore post list state:", e);
    } finally {
      setHasRestoredAttempted(true);
    }
  }, [canUsePostListCache, hasHydrated, isLoadingUser, postListScrollKey, postListStateKey, searchParamString]);

  // Save state on updates
  useEffect(() => {
    if (isLoading || !hasRestoredAttempted || !canUsePostListCache) return;
    try {
      const saved = sessionStorage.getItem(postListStateKey);
      const state = saved ? JSON.parse(saved) : {};
      state.posts = posts;
      state.page = page;
      state.hasMore = hasMore;
      state.total = total;
      state.activeFilter = activeFilter;
      state.draftFilter = activeFilter;
      state.searchParamString = searchParamString;
      sessionStorage.setItem(postListStateKey, JSON.stringify(state));
    } catch {}
  }, [posts, page, hasMore, total, activeFilter, searchParamString, isLoading, hasRestoredAttempted, canUsePostListCache, postListStateKey]);

  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (!canUsePostListCache) return;

    pendingScrollTopRef.current = e.currentTarget.scrollTop;
    if (scrollSaveFrameRef.current !== null) return;

    scrollSaveFrameRef.current = window.requestAnimationFrame(() => {
      scrollSaveFrameRef.current = null;
      try {
        sessionStorage.setItem(postListScrollKey, String(pendingScrollTopRef.current));
      } catch {}
    });
  };

  useEffect(() => () => {
    if (scrollSaveFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollSaveFrameRef.current);
    }
  }, []);
  useEffect(() => {
    if (!hasHydrated || isLoadingUser) {
      return;
    }

    if (!hasRestoredAttempted) {
      return;
    }

    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      if (isRestored) {
        setIsRestored(false);
        return;
      }
    }

    fetchPosts(1, false, activeFilter);

    // Reset scroll position to top on filter/category changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    const mainScroll = document.getElementById("main-scroll-container");
    if (mainScroll) {
      mainScroll.scrollTop = 0;
    }

    try {
      sessionStorage.setItem(postListScrollKey, "0");
    } catch {}
  }, [activeFilter, fetchPosts, hasHydrated, isLoadingUser, hasRestoredAttempted, postListScrollKey]);

  useEffect(() => {
    if (isFirstMountRef.current) return;
    setDraftFilter(initialFilter);
    setActiveFilter(initialFilter);
  }, [initialFilter]);

  useEffect(() => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          fetchPosts(page + 1, true, activeFilter);
        }
      },
      {
        rootMargin: "1000px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeFilter, fetchPosts, hasMore, isLoading, isLoadingMore, page]);

  useEffect(() => {
    if (!isFilterOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFilterOpen]);

  const applyCategory = (propertyType: "" | PropertyType) => {
    const nextValue = normalizePostFilter({
      ...draftFilter,
      propertyType,
    });
    setDraftFilter(nextValue);
    setActiveFilter(nextValue);
  };

  const applyPostType = (postType: "" | PostType) => {
    const nextValue = normalizePostFilter({
      ...draftFilter,
      postType,
    });
    setDraftFilter(nextValue);
    setActiveFilter(nextValue);
  };

  const applyAdvancedFilter = () => {
    const normalizedFilter = normalizePostFilter(draftFilter);
    setDraftFilter(normalizedFilter);
    setActiveFilter(normalizedFilter);
    setIsFilterOpen(false);
  };

  const resetAdvancedFilter = () => {
    setDraftFilter(defaultPostFilter);
    setActiveFilter(defaultPostFilter);
    setIsFilterOpen(false);
  };

  const activeFilterCount = [
    draftFilter.keyword,
    draftFilter.city,
    draftFilter.district,
    draftFilter.postType,
    draftFilter.propertyType,
    draftFilter.minPrice,
    draftFilter.maxPrice,
    draftFilter.minArea,
    draftFilter.maxArea,
    draftFilter.featureIds,
  ].filter(Boolean).length;

  return (
    <>
    <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="hidden min-h-0 xl:block">
        <div className="sticky top-20 h-full max-h-[calc(100vh-100px)] space-y-5 overflow-y-auto pr-1 scrollbar-thin">
          <div className="glass-card p-2.5">
            <nav className="space-y-1">
              {leftNavItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                    item.active
                      ? "theme-nav-active border"
                      : "theme-nav-item"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="glass-card p-3.5">
            <h2 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Danh mục</h2>
            <div className="space-y-1">
              {categoryItems.map((item) => {
                const active = draftFilter.propertyType === item.value;

                return (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => applyCategory(item.value)}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-left transition ${
                      active
                        ? "theme-nav-active border"
                        : "theme-nav-item"
                    }`}
                  >
                    <item.icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`} />
                    <span className="line-clamp-1">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      <section
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="no-scrollbar min-w-0 xl:h-full xl:max-h-[calc(100vh-100px)] xl:overflow-y-auto xl:pr-1"
      >
        <div className="space-y-5">
          <section className="hidden md:flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <span>Trang chủ</span>
            <span>/</span>
            <span className="text-[var(--foreground)]">Bài đăng</span>
          </section>

          <div className="glass-card p-4 sm:p-5 md:p-6">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const normalizedFilter = normalizePostFilter(draftFilter);
                setDraftFilter(normalizedFilter);
                setActiveFilter(normalizedFilter);
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent)]" />
                  <input
                    type="search"
                    value={draftFilter.keyword}
                    onChange={(event) => setDraftFilter({ ...draftFilter, keyword: event.target.value })}
                    className="input-dark h-12 rounded-xl pl-11 text-sm sm:text-base"
                    placeholder="Tìm kiếm bất động sản..."
                  />
                </div>
                <button type="submit" className="btn-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold sm:min-w-36">
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {transactionItems.map((item) => {
                  const isActive = draftFilter.postType === item.value;
                  return (
                    <button
                      key={item.value || "all"}
                      type="button"
                      onClick={() => applyPostType(item.value)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "theme-filter-chip-active"
                          : "theme-filter-chip"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Bảng tin bất động sản</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {posts.length > 0
                  ? total > 0
                    ? `${total} bài đăng đang hiển thị`
                    : `${posts.length} bài đăng đang hiển thị`
                  : "0 bài đăng đang hiển thị"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="theme-surface-soft inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] xl:hidden"
            >
              <Filter className="h-4 w-4 text-[var(--accent)]" />
              Mở bộ lọc
            </button>
          </div>

          {error && (
            <div className="theme-badge-danger rounded-2xl p-4 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((index) => (
                <div key={index} className="glass-card overflow-hidden rounded-2xl p-4 md:p-5">
                  <div className="flex items-start gap-4">
                    <div className="theme-skeleton h-11 w-11 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="theme-skeleton h-4 w-1/3 rounded" />
                      <div className="theme-skeleton h-3 w-1/4 rounded" />
                    </div>
                  </div>
                  <div className="theme-skeleton mt-4 h-6 w-3/4 rounded" />
                  <div className="theme-skeleton mt-2 h-4 w-1/2 rounded" />
                  <div className="theme-skeleton mt-5 aspect-[4/3] w-full rounded-xl md:aspect-auto md:h-64" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card flex min-h-[280px] items-center justify-center p-10 text-center text-[var(--muted-foreground)]">
              Không tìm thấy bài đăng nào khớp bộ lọc hiện tại.
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {posts.map((post, index) => (
                  <div key={post.id}>
                    <PostCard post={post} isFirstPost={index === 0} />
                  </div>
                ))}
              </div>

              <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
                {isLoadingMore ? (
                  <div className="inline-flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                    <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" />
                    Đang tải thêm...
                  </div>
                ) : hasMore ? (
                  <span className="text-sm text-[var(--muted-foreground)]">Cuộn để tải thêm bài đăng</span>
                ) : (
                  <span className="text-sm text-[var(--muted-foreground)]">Đã hiển thị toàn bộ bài đăng</span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <aside className="hidden min-h-0 xl:block">
        <div className="no-scrollbar sticky top-20 h-full max-h-[calc(100vh-100px)] overflow-y-auto xl:space-y-5">
          <PostFilter
            value={draftFilter}
            isLoading={isLoading}
            onChange={setDraftFilter}
            onSubmit={() => {
              const normalizedFilter = normalizePostFilter(draftFilter);
              setDraftFilter(normalizedFilter);
              setActiveFilter(normalizedFilter);
            }}
            onReset={() => {
              setDraftFilter(defaultPostFilter);
              setActiveFilter(defaultPostFilter);
            }}
          />
        </div>
      </aside>

    </div>
    {isFilterOpen ? (
      <div className="theme-overlay-dim fixed inset-0 z-50 backdrop-blur-sm xl:hidden" onClick={() => setIsFilterOpen(false)}>
        <div
          className="theme-drawer-surface absolute inset-x-3 bottom-3 top-20 overflow-hidden rounded-[28px] sm:left-auto sm:right-4 sm:top-24 sm:w-[360px] xl:right-6 xl:w-[380px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Bộ lọc tìm kiếm</h2>
              <p className="text-xs text-[var(--muted-foreground)]">Giữ cố định ở mép phải để dễ điều chỉnh khi xem bài đăng.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="theme-surface-soft inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Đóng bộ lọc"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="no-scrollbar h-full overflow-y-auto p-4 pb-24">
            <PostFilter
              value={draftFilter}
              isLoading={isLoading}
              onChange={setDraftFilter}
              onSubmit={applyAdvancedFilter}
              onReset={resetAdvancedFilter}
            />
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
