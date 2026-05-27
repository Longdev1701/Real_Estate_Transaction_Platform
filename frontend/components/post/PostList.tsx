"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AxiosError } from "axios";
import {
  Building2,
  Gem,
  House,
  Landmark,
  LoaderCircle,
  MapPinned,
  Newspaper,
  Search,
  Warehouse,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  buildPostQuery,
  defaultPostFilter,
  POST_TYPES,
  PROPERTY_TYPES,
  type Post,
  type PostFilterValue,
  type PostListData,
} from "@/lib/posts";
import { PostCard } from "./PostCard";
import { PostFilter } from "./PostFilter";

const PAGE_SIZE = 8;

const propertyChips = [
  { value: "", label: "T\u1ea5t c\u1ea3" },
  { value: "APARTMENT", label: "C\u0103n h\u1ed9" },
  { value: "HOUSE", label: "Nh\u00e0 ri\u00eang" },
  { value: "LAND", label: "\u0110\u1ea5t n\u1ec1n" },
  { value: "ROOM", label: "Ph\u00f2ng" },
] as const;

const leftNavItems = [
  { icon: Newspaper, label: "B\u1ea3ng tin", active: true },
];

const categoryItems = [
  { icon: Building2, label: "C\u0103n h\u1ed9 chung c\u01b0" },
  { icon: House, label: "Nh\u00e0 ri\u00eang" },
  { icon: Landmark, label: "Bi\u1ec7t th\u1ef1" },
  { icon: MapPinned, label: "\u0110\u1ea5t n\u1ec1n" },
  { icon: Gem, label: "Nh\u00e0 m\u1eb7t ph\u1ed1" },
  { icon: Warehouse, label: "V\u0103n ph\u00f2ng" },
];

const getInitialFilter = (searchParams: URLSearchParams): PostFilterValue => {
  const postType = searchParams.get("postType");
  const propertyType = searchParams.get("propertyType");

  return {
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
  };
};

export function PostList() {
  const searchParams = useSearchParams();
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
        const response = await api.get<{ data: PostListData }>(`/posts?${query}`);
        const payload = response.data.data;

        if (requestId !== requestIdRef.current) {
          return;
        }

        setPosts((currentPosts) =>
          append ? [...currentPosts, ...payload.items] : payload.items,
        );
        setPage(payload.meta.page);
        setHasMore(payload.meta.hasMore);
        setTotal(payload.meta.total ?? payload.items.length);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (requestId === requestIdRef.current) {
          setError(axiosError.response?.data?.message ?? "Kh\u00f4ng th\u1ec3 t\u1ea3i danh s\u00e1ch b\u00e0i \u0111\u0103ng.");
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
    [],
  );

  useEffect(() => {
    fetchPosts(1, false, activeFilter);
  }, [activeFilter, fetchPosts]);

  useEffect(() => {
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
        rootMargin: "320px 0px",
      },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeFilter, fetchPosts, hasMore, isLoading, isLoadingMore, page]);

  return (
    <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="hidden min-h-0 xl:block">
        <div className="sticky top-20 h-full max-h-[calc(100vh-100px)] space-y-5">
          <div className="glass-card p-4">
            <nav className="space-y-2">
              {leftNavItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                    item.active
                      ? "border border-blue-500/40 bg-blue-500/10 text-blue-300 shadow-[0_0_24px_rgba(37,99,235,0.18)]"
                      : "text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="glass-card p-5">
            <h2 className="mb-4 text-xl font-semibold text-blue-300">{"Danh m\u1ee5c"}</h2>
            <div className="space-y-2">
              {categoryItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-gray-200 transition hover:bg-white/5"
                >
                  <item.icon className="h-4 w-4 text-blue-300" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="no-scrollbar h-full max-h-[calc(100vh-100px)] min-w-0 overflow-y-auto pr-1">
        <div className="space-y-5">
          <section className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
            <span>{"Trang ch\u1ee7"}</span>
            <span>/</span>
            <span className="text-white">{"B\u00e0i \u0111\u0103ng"}</span>
          </section>

          <div className="glass-card p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-200">
                T
              </div>
              <div className="flex-1">
                <form
                  className="flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setActiveFilter({ ...draftFilter });
                  }}
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-300" />
                    <input
                      type="search"
                      value={draftFilter.keyword}
                      onChange={(event) => setDraftFilter({ ...draftFilter, keyword: event.target.value })}
                      className="input-dark pl-11 text-base"
                      placeholder={"B\u1ea1n \u0111ang t\u00ecm ki\u1ebfm b\u1ea5t \u0111\u1ed9ng s\u1ea3n n\u00e0o?"}
                    />
                  </div>
                  <Link href="/posts/create" className="btn-primary inline-flex items-center justify-center px-6 py-3">
                    {"\u0110\u0103ng b\u00e0i"}
                  </Link>
                </form>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              {propertyChips.map((chip) => {
                const active = draftFilter.propertyType === chip.value;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      const nextValue = {
                        ...draftFilter,
                        propertyType: chip.value as PostFilterValue["propertyType"],
                      };
                      setDraftFilter(nextValue);
                      setActiveFilter(nextValue);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.35)]"
                        : "border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-semibold text-white">{"B\u1ea3ng tin b\u1ea5t \u0111\u1ed9ng s\u1ea3n"}</h2>
              <p className="mt-1 text-sm text-gray-400">
                {posts.length > 0
                  ? (total > 0
                    ? `${total} b\u00e0i \u0111\u0103ng \u0111ang hi\u1ec3n th\u1ecb`
                    : `${posts.length} b\u00e0i \u0111\u0103ng \u0111ang hi\u1ec3n th\u1ecb`)
                  : "Ch\u01b0a c\u00f3 b\u00e0i \u0111\u0103ng ph\u00f9 h\u1ee3p."}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-white/10 bg-white/5">
              <div className="inline-flex items-center gap-3 text-gray-300">
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
                {"\u0110ang t\u1ea3i b\u00e0i \u0111\u0103ng..."}
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card flex min-h-[280px] items-center justify-center p-10 text-center text-gray-300">
              {"Kh\u00f4ng t\u00ecm th\u1ea5y b\u00e0i \u0111\u0103ng n\u00e0o kh\u1edbp b\u1ed9 l\u1ecdc hi\u1ec7n t\u1ea1i."}
            </div>
          ) : (
            <>
              <div className="space-y-5">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
                {isLoadingMore ? (
                  <div className="inline-flex items-center gap-3 text-sm text-gray-300">
                    <LoaderCircle className="h-4 w-4 animate-spin text-blue-300" />
                    {"\u0110ang t\u1ea3i th\u00eam..."}
                  </div>
                ) : hasMore ? (
                  <span className="text-sm text-gray-500">{"Cu\u1ed9n \u0111\u1ec3 t\u1ea3i th\u00eam b\u00e0i \u0111\u0103ng"}</span>
                ) : (
                  <span className="text-sm text-gray-500">{"\u0110\u00e3 hi\u1ec3n th\u1ecb to\u00e0n b\u1ed9 b\u00e0i \u0111\u0103ng"}</span>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <aside className="min-h-0">
        <div className="no-scrollbar xl:sticky xl:top-20 xl:h-full xl:max-h-[calc(100vh-100px)] xl:overflow-y-auto xl:space-y-5">
          <PostFilter
            value={draftFilter}
            isLoading={isLoading}
            onChange={setDraftFilter}
            onSubmit={() => setActiveFilter({ ...draftFilter })}
            onReset={() => {
              setDraftFilter(defaultPostFilter);
              setActiveFilter(defaultPostFilter);
            }}
          />
        </div>
      </aside>
    </div>
  );
}
