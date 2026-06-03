"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X, ArrowRight, ChevronDown } from "lucide-react";
import { getPrimaryImage, type Post } from "@/lib/posts";

export function FloatingCompareBar() {
  const pathname = usePathname();
  const [comparedPosts, setComparedPosts] = useState<Post[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem("compared_posts");
        const list = stored ? JSON.parse(stored) : [];
        if (Array.isArray(list)) {
          setComparedPosts(list);
          setIsVisible(list.length > 0);
          // If no posts, make sure it's not collapsed next time
          if (list.length === 0) {
            setIsCollapsed(false);
          }
        } else {
          setComparedPosts([]);
          setIsVisible(false);
          setIsCollapsed(false);
        }
      } catch {
        setComparedPosts([]);
        setIsVisible(false);
        setIsCollapsed(false);
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
      setIsCollapsed(false);
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/messages")) {
    return null;
  }

  if (!isVisible || comparedPosts.length === 0) return null;

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 left-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full border border-blue-500/30 bg-slate-950/90 text-blue-400 shadow-[0_10px_30px_rgba(30,58,138,0.45)] backdrop-blur-xl hover:bg-slate-900 transition-all duration-300 hover:scale-105 active:scale-95 animate-in fade-in zoom-in-50 md:bottom-8 md:left-8"
        title="Mở rộng thanh so sánh"
      >
        <Scale className="h-6 w-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-md border border-slate-950">
          {comparedPosts.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[999] w-[90%] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative flex items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-slate-950/90 p-2 shadow-[0_15px_40px_rgba(30,58,138,0.45)] backdrop-blur-xl">
        
        {/* Left: Icon & Count */}
        <div className="flex items-center gap-2 pl-1.5 shrink-0">
          <Scale className="h-4.5 w-4.5 text-blue-400" />
          <span className="text-xs font-bold text-white">{comparedPosts.length}/3</span>
        </div>

        {/* Center: Previews */}
        <div className="flex items-center gap-1.5">
          {comparedPosts.map((post) => (
            <div
              key={post.id}
              className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-slate-900"
            >
              <img
                src={getPrimaryImage(post)}
                alt={post.title}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(post.id)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Bỏ chọn"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            title="Thu gọn"
          >
            <ChevronDown className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            Xóa hết
          </button>
          <Link
            href="/compare"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-500 transition-colors"
          >
            So sánh
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
