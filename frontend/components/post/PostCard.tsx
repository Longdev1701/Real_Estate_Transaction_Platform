"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [imageError, setImageError] = useState(false);

  const mainImage = post.images.length > 0 ? post.images[0].imageUrl : imageFallback;

  return (
    <article className="glass-card overflow-hidden p-4 md:p-5 flex flex-col h-full">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-200 shrink-0">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.fullName} className="h-full w-full object-cover" />
            ) : (
              post.author.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-white line-clamp-1">{post.author.fullName}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
              <span className="text-blue-400 font-medium">{postTypeLabels[post.postType]}</span>
              <span className="h-1 w-1 rounded-full bg-gray-600" />
              <span>{propertyTypeLabels[post.propertyType]}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      </div>

      {/* Main Image */}
      <Link href={`/posts/${post.id}`} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 mb-4 aspect-video group shrink-0 block">
        <img
          src={imageError ? imageFallback : mainImage}
          alt={post.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-medium text-white border border-white/10">
          {post.images.length} ảnh
        </div>
      </Link>

      {/* Content */}
      <div className="flex-grow flex flex-col">
        <Link href={`/posts/${post.id}`} className="block text-xl font-bold text-white transition hover:text-blue-400 line-clamp-2 mb-2">
          {post.title}
        </Link>
        
        <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-grow">
          {post.description}
        </p>

        <div className="mt-auto">
          <p className="text-2xl font-bold text-blue-400 mb-3">{formatPrice(post.price)}</p>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-5">
            <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <Expand className="h-3.5 w-3.5 text-gray-400" />
              {formatArea(post.area)}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              <span className="line-clamp-1 max-w-[120px]">{post.city}</span>
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-4 border-t border-white/10">
            <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-gray-300 transition hover:bg-white/10 hover:text-white text-sm">
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">Lưu</span>
            </button>
            <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-gray-300 transition hover:bg-white/10 hover:text-white text-sm">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Chia sẻ</span>
            </button>
            <Link
              href={`/posts/${post.id}`}
              className="flex-[2] inline-flex items-center justify-center rounded-xl bg-blue-600 py-2 font-medium text-white transition hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-sm"
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
