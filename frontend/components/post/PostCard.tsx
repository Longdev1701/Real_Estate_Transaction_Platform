"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bookmark, Building2, Ellipsis, Expand, MapPin, MessageCircle, Share2 } from "lucide-react";

import {
  formatArea,
  formatLocation,
  formatPrice,
  postTypeLabels,
  propertyTypeLabels,
  type Post,
} from "@/lib/posts";

const imageFallback =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'><rect width='800' height='500' fill='%230b1120'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-family='Arial' font-size='32'>TrustEstate</text></svg>";

export function PostCard({ post }: { post: Post }) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const images = useMemo(() => {
    if (post.images.length === 0) {
      return [{ id: `${post.id}-fallback`, imageUrl: imageFallback, order: 0 }];
    }

    return post.images.slice(0, 3);
  }, [post.id, post.images]);

  return (
    <article className="glass-card overflow-hidden p-4 md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-200">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
            ) : (
              post.author.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{post.author.fullName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-400">
              <span>{formatLocation(post)}</span>
              <span className="h-1 w-1 rounded-full bg-gray-500" />
              <span>{postTypeLabels[post.postType]}</span>
              <span className="h-1 w-1 rounded-full bg-gray-500" />
              <span>{propertyTypeLabels[post.propertyType]}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 transition hover:bg-white/10"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <Link href={`/posts/${post.id}`} className="block text-2xl font-semibold text-white transition hover:text-blue-300">
          {post.title}
        </Link>
        <p className="line-clamp-2 text-gray-300">{post.description}</p>
      </div>

      <div className={`mb-5 grid gap-2 ${images.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
        {images.map((image, index) => (
          <Link
            key={image.id}
            href={`/posts/${post.id}`}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 ${
              index === 0 && images.length > 1 ? "col-span-2" : ""
            }`}
          >
            <img
              src={failedImages[image.id] ? imageFallback : image.imageUrl}
              alt={post.title}
              className={`w-full object-cover transition duration-500 hover:scale-105 ${
                index === 0 && images.length > 1 ? "aspect-[1.55/1]" : "aspect-square"
              }`}
              onError={() => setFailedImages((current) => ({ ...current, [image.id]: true }))}
            />
            {index === images.length - 1 && post.images.length > images.length && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-2xl font-semibold text-white">
                +{post.images.length - images.length}
              </div>
            )}
            {index === 0 && (
              <div className="absolute left-3 top-3 rounded-full border border-blue-400/20 bg-blue-500/80 px-3 py-1 text-xs font-medium text-white">
                {propertyTypeLabels[post.propertyType]}
              </div>
            )}
          </Link>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-3xl font-semibold text-blue-300">{formatPrice(post.price)}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="h-4 w-4 text-blue-300" />
            {post.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-200">
          <span className="inline-flex items-center gap-2">
            <Expand className="h-4 w-4 text-blue-300" />
            {formatArea(post.area)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-300" />
            {propertyTypeLabels[post.propertyType]}
          </span>
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-300" />
            {post.city}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-200 transition hover:bg-white/10"
        >
          <Bookmark className="h-4 w-4" />
          Luu
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-200 transition hover:bg-white/10"
        >
          <MessageCircle className="h-4 w-4" />
          Binh luan
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-gray-200 transition hover:bg-white/10"
        >
          <Share2 className="h-4 w-4" />
          Chia se
        </button>
        <Link
          href={`/posts/${post.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2 font-medium text-white transition hover:bg-blue-500"
        >
          Xem chi tiet
        </Link>
      </div>
    </article>
  );
}
