"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import { type Post } from "@/lib/posts";

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
          window.alert("Chỉ có thể so sánh tối đa 3 bất động sản cùng lúc.");
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
      className={`group/compare relative inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-300 shadow-md backdrop-blur-md ${
        isCompared
          ? "border-blue-400/50 bg-blue-600/90 text-white hover:bg-blue-500"
          : "border-white/20 bg-slate-950/70 text-gray-200 hover:border-blue-400/40 hover:bg-blue-600/80 hover:text-white"
      } ${className}`}
      aria-label="So sánh bất động sản"
      title="So sánh bất động sản"
    >
      <span className={`pointer-events-none absolute inset-0.5 rounded-full opacity-0 blur-md transition duration-300 group-hover/compare:opacity-100 ${isCompared ? "group-hover/compare:bg-blue-400/30" : "group-hover/compare:bg-blue-400/20"}`} />
      <Scale className="relative h-4.5 w-4.5 transition duration-300 group-hover/compare:scale-110" />
    </button>
  );
}
