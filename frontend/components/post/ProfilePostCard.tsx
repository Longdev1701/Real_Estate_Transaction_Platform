"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Expand, MapPin, Trash2 } from "lucide-react";

import {
  formatArea,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  statusLabels,
  type Post,
} from "@/lib/posts";
import { writeSessionCache } from "@/lib/client-cache";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

const profileStatusColors: Record<string, string> = {
  ACTIVE: "theme-badge-success",
  HIDDEN: "theme-badge-warning",
  BANNED: "theme-badge-danger",
};
const POST_DETAIL_PREVIEW_CACHE_TTL_MS = 2 * 60 * 1000;

export function ProfilePostCard({ post, isOwnProfile, onDelete }: { post: Post, isOwnProfile?: boolean, onDelete?: (id: string) => void }) {
  const [imageError, setImageError] = useState(false);

  const mainImage = post.images.length > 0 ? post.images[0].imageUrl : imageFallback;
  const totalImages = post.imageCount ?? post.images.length;
  const cachePostDetailPreview = () => {
    writeSessionCache(`posts:detail:${post.id}`, {
      ...post,
      features: post.features ?? [],
      relatedPosts: post.relatedPosts ?? [],
    }, {
      ttlMs: POST_DETAIL_PREVIEW_CACHE_TTL_MS,
    });
  };

  return (
    <article className="glass-card flex h-full flex-col overflow-hidden p-4 md:p-5">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--accent-border)] bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
            ) : (
              post.author.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="line-clamp-1 font-semibold text-[var(--foreground)]">{post.author.fullName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <span className="font-medium text-[var(--accent)]">{postTypeLabels[post.postType]}</span>
              <span className="h-1 w-1 rounded-full bg-[var(--notification-read-dot)]" />
              <span>{propertyTypeLabels[post.propertyType]}</span>
            </div>
          </div>
          {post.status !== "ACTIVE" ? (
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${profileStatusColors[post.status] ?? "theme-badge-danger"}`}>
              {statusLabels[post.status] ?? post.status}
            </span>
          ) : null}
        </div>
      </div>

      <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="group relative mb-4 block aspect-video shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <img
          src={imageError ? imageFallback : mainImage}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="theme-overlay-badge absolute left-2 top-2 rounded-md px-2.5 py-1 text-xs font-medium backdrop-blur-md">
          {totalImages} ảnh
        </div>
        {post.isSaved ? (
          <div className="theme-badge-info absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md">
            <Bookmark className="h-3.5 w-3.5 fill-current text-current" />
            Đã lưu
          </div>
        ) : null}
      </Link>

      <div className="flex flex-grow flex-col">
        <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="mb-2 block line-clamp-2 text-xl font-bold text-[var(--foreground)] transition hover:text-[var(--accent)]">
          {post.title}
        </Link>

        <p className="mb-4 line-clamp-2 flex-grow text-sm text-[var(--secondary-foreground)]">
          {post.description}
        </p>

        <div className="mt-auto">
          <p className="mb-3 text-2xl font-bold text-[var(--accent)]">{formatPrice(post.price)}</p>

          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-[var(--secondary-foreground)]">
            <span className="theme-chip inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1">
              <Expand className="h-3.5 w-3.5 text-[var(--muted)]" />
              {formatArea(post.area)}
            </span>
            <span className="theme-chip inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1">
              <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" />
              <span className="line-clamp-1 max-w-[120px]">{post.city}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-4">
            <Link
              href={`/posts/${post.id}`}
              onClick={cachePostDetailPreview}
              className="theme-button-primary inline-flex flex-1 items-center justify-center rounded-xl py-2 text-sm font-medium transition"
            >
              Xem chi tiết
            </Link>
            {isOwnProfile && onDelete && post.status === "HIDDEN" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(post.id);
                }}
                className="theme-button-danger inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition"
              >
                <Trash2 className="h-4 w-4" />
                Xoá bài
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
