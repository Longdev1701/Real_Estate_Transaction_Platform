"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { type Post } from "@/lib/posts";
import { toast } from "@/stores/toast.store";

interface CompareButtonProps {
  post: Post;
  className?: string;
}

export function CompareButton({ post, className = "" }: CompareButtonProps) {
  const [isCompared, setIsCompared] = useState(false);

  useEffect(() => {
    const handleCompareUpdate = () => {
      try {
        const stored = localStorage.getItem("compared_posts");
        const list = stored ? JSON.parse(stored) : [];
        setIsCompared(Array.isArray(list) && list.some((item: any) => item.id === post.id));
      } catch {
        setIsCompared(false);
      }
    };
    handleCompareUpdate();
    window.addEventListener("compare_list_updated", handleCompareUpdate);
    return () => window.removeEventListener("compare_list_updated", handleCompareUpdate);
  }, [post.id]);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const stored = localStorage.getItem("compared_posts");
      let list = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(list)) list = [];

      const exists = list.some((item: any) => item.id === post.id);
      if (exists) {
        list = list.filter((item: any) => item.id !== post.id);
        setIsCompared(false);
      } else {
        if (list.length >= 3) {
          toast.warning("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
          return;
        }
        if (list.length > 0 && list[0].postType !== post.postType) {
          toast.warning("Không thể so sánh bất động sản Bán với bất động sản Cho thuê. Vui lòng chọn cùng loại giao dịch.");
          return;
        }
        list.push(post);
        setIsCompared(true);
      }
      localStorage.setItem("compared_posts", JSON.stringify(list));
      window.dispatchEvent(new Event("compare_list_updated"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCompareClick}
      className={`group/compare relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 shadow-md backdrop-blur-md ${
        isCompared
          ? "theme-icon-button-active hover:text-[var(--accent)]"
          : "theme-icon-button hover:text-[var(--accent)]"
      } ${className}`}
      aria-label="So sánh bất động sản"
      title="So sánh bất động sản"
    >
      <span className={`pointer-events-none absolute inset-0.5 rounded-full opacity-0 blur-md transition duration-300 group-hover/compare:opacity-100 ${isCompared ? "group-hover/compare:bg-[color:color-mix(in_srgb,var(--info)_28%,transparent)]" : "group-hover/compare:bg-[color:color-mix(in_srgb,var(--info)_18%,transparent)]"}`} />
      <Scale className="relative h-4.5 w-4.5 transition duration-300 group-hover/compare:scale-110" />
    </button>
  );
}
