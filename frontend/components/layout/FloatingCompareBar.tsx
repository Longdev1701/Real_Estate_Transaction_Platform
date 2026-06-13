"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale, X, ArrowRight, ChevronDown, Trash2 } from "lucide-react";
import { getPrimaryImage, type Post } from "@/lib/posts";
import { confirm } from "@/stores/confirm.store";

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

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: "Xóa so sánh",
      message: "Xóa toàn bộ bất động sản đã chọn để so sánh?",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy"
    });
    if (!confirmed) return;

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

  if (!isVisible || comparedPosts.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="theme-floating-panel fixed bottom-24 left-4 z-[999] flex h-14 w-14 animate-in fade-in zoom-in-50 items-center justify-center rounded-full border border-[var(--accent-border)] text-[var(--accent)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-[var(--hover)] active:scale-95 sm:bottom-24 sm:left-6 md:bottom-8 md:left-8"
        title="Mở rộng thanh so sánh"
      >
        <Scale className="h-6 w-6 animate-pulse" />
        <span className="theme-button-primary absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--card)] text-xs font-bold shadow-md">
          {comparedPosts.length}
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-[999] w-[90%] max-w-md -translate-x-1/2 animate-in fade-in slide-in-from-bottom-5 duration-300 sm:bottom-24 md:bottom-6">
      <div className="theme-floating-panel relative flex items-center justify-between gap-3 rounded-xl border border-[var(--accent-border)] p-2 backdrop-blur-xl">
        <div className="flex shrink-0 items-center gap-2 pl-1.5">
          <Scale className="h-4.5 w-4.5 text-[var(--accent)]" />
          <span className="text-xs font-bold text-[var(--foreground)]">{comparedPosts.length}/3</span>
        </div>

        <div className="flex items-center gap-1.5">
          {comparedPosts.map((post) => (
            <div
              key={post.id}
              className="group relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              <img src={getPrimaryImage(post)} alt={post.title} className="h-full w-full object-cover" />

              <button
                type="button"
                onClick={() => handleRemove(post.id)}
                className="theme-overlay-strong absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                title="Bỏ chọn"
              >
                <X className="h-3 w-3 text-[var(--foreground)]" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="group flex h-7 w-7 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
            title="Thu gọn"
          >
            <ChevronDown className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-y-0.5" />
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--secondary-foreground)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
            title="Xóa toàn bộ mục đã chọn"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Xóa hết
          </button>

          <Link
            href="/compare"
            className="btn-primary inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            So sánh
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
