"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Post, formatLocation, formatCompactPrice, formatArea } from "@/lib/posts";

const imageFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><rect width='1200' height='800' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='52'>TrustEstate</text></svg>";

export function RelatedPostsCarousel({
  posts,
  isLoading = false,
  onPostIntent,
}: {
  posts: Post[];
  isLoading?: boolean;
  onPostIntent?: (postId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    const target = rootRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [isVisible, posts]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollFrameRef.current);
    }
  }, []);

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      checkScroll();
    });
  };

  const scrollBy = (direction: 1 | -1) => {
    if (!containerRef.current) return;
    const { clientWidth } = containerRef.current;
    const scrollAmount = clientWidth * 0.8 * direction;
    containerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const shouldShowSkeleton = isLoading || (!isVisible && posts.length > 0);

  if (shouldShowSkeleton) {
    return (
      <div ref={rootRef} className="relative">
        <div className="flex gap-4 overflow-hidden pb-4" aria-busy={isLoading}>
          {[0, 1, 2].map((item) => (
            <div key={item} className="w-[260px] sm:w-[280px] shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="theme-skeleton h-40 w-full rounded-xl" />
              <div className="mt-3 space-y-2">
                <div className="theme-skeleton h-4 w-4/5 rounded" />
                <div className="theme-skeleton h-3 w-2/3 rounded" />
                <div className="theme-skeleton h-5 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div ref={rootRef} className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)]">
        <p className="text-sm text-[var(--muted-foreground)]">Chưa có bài đăng tương tự.</p>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative group">
      <>
      {/* Scroll buttons for desktop */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-[-1rem] top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-md transition-all hover:scale-110 sm:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-[-1rem] top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-md transition-all hover:scale-110 sm:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Carousel Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hidden -mx-5 px-5 sm:mx-0 sm:px-0"
      >
        {posts.map((item) => (
          <Link
            key={item.id}
            href={`/posts/${item.id}`}
            onFocus={() => onPostIntent?.(item.id)}
            onMouseEnter={() => onPostIntent?.(item.id)}
            onTouchStart={() => onPostIntent?.(item.id)}
            className="flex w-[260px] sm:w-[280px] shrink-0 snap-center flex-col gap-3 rounded-2xl border border-transparent bg-[var(--surface-muted)] sm:bg-[var(--surface)] sm:border-[var(--border)] p-2 sm:p-3 transition-all hover:border-[var(--accent-border)] hover:bg-[var(--surface-muted)] group/card"
          >
            <div className="relative h-40 w-full overflow-hidden rounded-xl">
              <img
                src={item.images[0]?.imageUrl || imageFallback}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-110"
              />
            </div>
            <div className="flex flex-col justify-between flex-1 min-w-0 px-1 pb-1">
              <div>
                <p className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug text-[var(--foreground)]">{item.title}</p>
                <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)] truncate">{formatLocation(item)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-1 border-t border-[var(--border)] pt-2 sm:pt-3">
                <span className="truncate font-bold text-[var(--accent)] text-lg tabular-nums">
                  {formatCompactPrice(item.price)}
                </span>
                <span className="text-xs sm:text-sm font-medium text-[var(--secondary-foreground)] bg-[var(--surface-muted)] px-2 py-1 rounded-md">{formatArea(item.area)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      </>
    </div>
  );
}
