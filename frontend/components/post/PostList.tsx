"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import {
  Building2,
  Clock3,
  Gem,
  HeartHandshake,
  House,
  Landmark,
  LayoutGrid,
  LoaderCircle,
  MapPinned,
  Newspaper,
  Search,
  SlidersHorizontal,
  UserRoundPlus,
  Warehouse,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  buildPostQuery,
  defaultPostFilter,
  formatArea,
  formatLocation,
  formatPrice,
  propertyTypeLabels,
  type Post,
  type PostFilterValue,
  type PostListData,
} from "@/lib/posts";
import { PostCard } from "./PostCard";
import { PostFilter } from "./PostFilter";

const PAGE_SIZE = 8;

const propertyChips = [
  { value: "", label: "Tat ca" },
  { value: "APARTMENT", label: "Can ho" },
  { value: "HOUSE", label: "Nha rieng" },
  { value: "LAND", label: "Dat nen" },
  { value: "ROOM", label: "Phong" },
] as const;

const leftNavItems = [
  { icon: Newspaper, label: "Bang tin", active: true },
  { icon: LayoutGrid, label: "Bai viet cua ban" },
  { icon: HeartHandshake, label: "Da luu" },
  { icon: UserRoundPlus, label: "Dang theo doi" },
  { icon: Clock3, label: "Lich su xem" },
];

const categoryItems = [
  { icon: Building2, label: "Can ho chung cu" },
  { icon: House, label: "Nha rieng" },
  { icon: Landmark, label: "Biet thu" },
  { icon: MapPinned, label: "Dat nen" },
  { icon: Gem, label: "Nha mat pho" },
  { icon: Warehouse, label: "Van phong" },
];

export function PostList() {
  const [draftFilter, setDraftFilter] = useState<PostFilterValue>(defaultPostFilter);
  const [activeFilter, setActiveFilter] = useState<PostFilterValue>(defaultPostFilter);
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
        setHasMore(payload.meta.page < payload.meta.totalPages);
        setTotal(payload.meta.total);
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (requestId === requestIdRef.current) {
          setError(axiosError.response?.data?.message ?? "Khong the tai danh sach bai dang.");
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

  const suggestedPosts = useMemo(() => posts.slice(0, 3), [posts]);

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px] 2xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="hidden xl:block">
        <div className="sticky top-24 space-y-5">
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
            <h2 className="mb-4 text-xl font-semibold text-blue-300">Danh muc</h2>
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

          <div className="glass-card overflow-hidden border-blue-500/20 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_60%)] p-5">
            <div className="mb-6 inline-flex rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
              <Gem className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-semibold text-blue-300">Nang cap tai khoan</h3>
            <p className="mt-3 text-sm leading-7 text-gray-300">
              Trai nghiem day du tinh nang voi tai khoan premium de quan ly bai dang tot hon.
            </p>
            <button type="button" className="btn-primary mt-6 w-full py-3">
              Nang cap ngay
            </button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        <div className="glass-card p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-200">
              T
            </div>
            <div className="flex-1">
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 text-lg text-gray-200">
                Ban dang tim kiem bat dong san nao?
              </div>
              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-300 transition hover:bg-white/5">
                  <Search className="h-4 w-4 text-blue-300" />
                  Anh/Video
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-300 transition hover:bg-white/5">
                  <MapPinned className="h-4 w-4 text-blue-300" />
                  Vi tri
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-left text-gray-300 transition hover:bg-white/5">
                  <SlidersHorizontal className="h-4 w-4 text-blue-300" />
                  Bo loc
                </button>
                <Link href="/posts/create" className="btn-primary inline-flex items-center justify-center py-3">
                  Dang bai
                </Link>
              </div>
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
            <h2 className="text-2xl font-semibold text-white">Bang tin bat dong san</h2>
            <p className="mt-1 text-sm text-gray-400">{total > 0 ? `${total} bai dang dang hien thi` : "Chua co bai dang phu hop."}</p>
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
              Dang tai bai dang...
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card flex min-h-[280px] items-center justify-center p-10 text-center text-gray-300">
            Khong tim thay bai dang nao khop bo loc hien tai.
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
                  Dang tai them...
                </div>
              ) : hasMore ? (
                <span className="text-sm text-gray-500">Cuon de tai them bai dang</span>
              ) : (
                <span className="text-sm text-gray-500">Da hien thi toan bo bai dang</span>
              )}
            </div>
          </>
        )}
      </section>

      <aside className="space-y-5">
        <div className="xl:sticky xl:top-24 xl:space-y-5">
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

          <div className="glass-card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Duoc de xuat cho ban</h2>
              <Link href="/posts" className="text-sm font-medium text-blue-300 transition hover:text-blue-200">
                Xem them
              </Link>
            </div>
            <div className="space-y-4">
              {suggestedPosts.map((post) => (
                <Link key={post.id} href={`/posts/${post.id}`} className="flex gap-3 rounded-2xl border border-transparent p-1 transition hover:border-white/10 hover:bg-white/5">
                  <img
                    src={post.images[0]?.imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 240'><rect width='320' height='240' fill='%230b1120'/></svg>"}
                    alt={post.title}
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-medium text-white">{post.title}</p>
                    <p className="mt-1 text-sm text-gray-400">{formatLocation(post)}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="font-semibold text-blue-300">{formatPrice(post.price)}</span>
                      <span className="text-sm text-gray-400">{formatArea(post.area)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
