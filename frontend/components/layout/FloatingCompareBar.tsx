"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, X, ArrowRight } from "lucide-react";
import { getPrimaryImage, type Post } from "@/lib/posts";

export function FloatingCompareBar() {
  const [comparedPosts, setComparedPosts] = useState<Post[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem("compared_posts");
        const list = stored ? JSON.parse(stored) : [];
        if (Array.isArray(list)) {
          setComparedPosts(list);
          setIsVisible(list.length > 0);
        } else {
          setComparedPosts([]);
          setIsVisible(false);
        }
      } catch {
        setComparedPosts([]);
        setIsVisible(false);
      }
    };

    handleCompareUpdate();
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, []);

  const handleRemove = (postId: string) => {
    try {
      const updated = comparedPosts.filter((post) => post.id !== postId);
      localStorage.setItem("compared_posts", JSON.stringify(updated));
      setComparedPosts(updated);
      setIsVisible(updated.length > 0);
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = () => {
    try {
      localStorage.removeItem("compared_posts");
      setComparedPosts([]);
      setIsVisible(false);
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  if (!isVisible || comparedPosts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[999] w-[92%] max-w-xl -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex flex-col gap-3 rounded-2xl border border-blue-500/30 bg-slate-950/85 p-4 shadow-[0_20px_50px_rgba(30,58,138,0.4)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
            <Scale className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">So sánh bất động sản</h4>
            <p className="text-xs text-gray-400">Đã chọn {comparedPosts.length}/3 căn</p>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto py-1 md:justify-center">
          {comparedPosts.map((post) => (
            <div
              key={post.id}
              className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900"
            >
              <img
                src={getPrimaryImage(post)}
                alt={post.title}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(post.id)}
                className="absolute right-0.5 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-slate-950/80 text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
                title="Bỏ chọn"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {comparedPosts.length < 3 && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 text-xs text-gray-500">
              +{3 - comparedPosts.length}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            Xóa hết
          </button>
          <Link
            href="/compare"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-500 transition-colors"
          >
            So sánh
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
