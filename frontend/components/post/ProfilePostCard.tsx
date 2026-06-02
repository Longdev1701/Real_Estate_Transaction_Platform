"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, Expand, MapPin } from "lucide-react";

import {
  formatArea,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  statusColors,
  statusLabels,
  type Post,
} from "@/lib/posts";
import { writeSessionCache } from "@/lib/client-cache";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

export function ProfilePostCard({ post }: { post: Post }) {
  const [imageError, setImageError] = useState(false);

  const mainImage = post.images.length > 0 ? post.images[0].imageUrl : imageFallback;
  const totalImages = post.imageCount ?? post.images.length;
  const cachePostDetailPreview = () => {
    writeSessionCache(`posts:detail:${post.id}`, {
      ...post,
      features: post.features ?? [],
      relatedPosts: post.relatedPosts ?? [],
    });
  };

  return (
    <article className="glass-card flex h-full flex-col overflow-hidden p-4 md:p-5">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-200">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
            ) : (
              post.author.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="line-clamp-1 font-semibold text-white">{post.author.fullName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
              <span className="font-medium text-blue-400">{postTypeLabels[post.postType]}</span>
              <span className="h-1 w-1 rounded-full bg-gray-600" />
              <span>{propertyTypeLabels[post.propertyType]}</span>
            </div>
          </div>
          {post.status !== "ACTIVE" ? (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColors[post.status] ?? "border-red-400/30 bg-red-500/10 text-red-300"}`}>
              {statusLabels[post.status] ?? post.status}
            </span>
          ) : null}
        </div>
      </div>

      <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="group relative mb-4 block aspect-video shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <img
          src={imageError ? imageFallback : mainImage}
          alt={post.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="absolute left-2 top-2 rounded-md border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
          {totalImages} ảnh
        </div>
        {post.isSaved ? (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-slate-950/75 px-2.5 py-1 text-xs font-medium text-blue-200 backdrop-blur-md">
            <Bookmark className="h-3.5 w-3.5 fill-blue-400 text-blue-400" />
            Đã lưu
          </div>
        ) : null}
      </Link>

      <div className="flex flex-grow flex-col">
        <Link href={`/posts/${post.id}`} onClick={cachePostDetailPreview} className="mb-2 block line-clamp-2 text-xl font-bold text-white transition hover:text-blue-400">
          {post.title}
        </Link>

        <p className="mb-4 line-clamp-2 flex-grow text-sm text-gray-400">
          {post.description}
        </p>

        <div className="mt-auto">
          <p className="mb-3 text-2xl font-bold text-blue-400">{formatPrice(post.price)}</p>

          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1">
              <Expand className="h-3.5 w-3.5 text-gray-400" />
              {formatArea(post.area)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <span className="line-clamp-1 max-w-[120px]">{post.city}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 border-t border-white/10 pt-4">
            <Link
              href={`/posts/${post.id}`}
              onClick={cachePostDetailPreview}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 py-2 text-sm font-medium text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] transition hover:bg-blue-500"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
