"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Send, Trash2, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

type CommentAuthor = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
};

type Comment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: CommentAuthor;
};

type CommentResponse = {
  data: {
    items: Comment[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
};

interface CommentSectionProps {
  postId: string;
  postAuthorId?: string;
}

export default function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fetchComments = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      setError(null);
      const response = await api.get<CommentResponse>(`/comments?postId=${postId}&page=${pageNum}&limit=10`);
      const { items, meta } = response.data.data;
      
      setComments((prev) => (append ? [...prev, ...items] : items));
      setHasMore(meta.hasMore);
      setTotalCount(meta.total);
      setPage(meta.page);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
      setError("Không thể tải danh sách bình luận.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(1, false);
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.post<{ data: Comment }>("/comments", {
        postId,
        content: content.trim(),
      });
      
      const newComment = response.data.data;
      setComments((prev) => [newComment, ...prev]);
      setContent("");
      setTotalCount((prev) => prev + 1);
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setError(err.response?.data?.message || "Không thể gửi bình luận lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá bình luận này?")) return;

    try {
      setDeletingId(commentId);
      setError(null);
      await api.delete(`/comments/${commentId}`);
      
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setTotalCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("Failed to delete comment:", err);
      setError("Không thể xoá bình luận. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatCommentDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="glass-card p-6 md:p-7 space-y-6">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <MessageSquare className="h-5 w-5 text-blue-400" />
        <h2 className="text-2xl font-semibold text-white">
          Bình luận ({totalCount})
        </h2>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Form viết bình luận */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-blue-500/30 bg-blue-500/10 text-sm font-semibold text-blue-200">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName || user.name} className="h-full w-full object-cover" />
              ) : (
                (user.fullName || user.name || "?").charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ ý kiến của bạn về bất động sản này..."
              rows={3}
              maxLength={1000}
              className="input-dark w-full text-sm py-2 px-3 focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Gửi bình luận
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center bg-slate-950/20">
          <p className="text-gray-400 text-sm mb-3">Vui lòng đăng nhập để lại bình luận và thảo luận cùng mọi người.</p>
          <Link href="/auth/login" className="btn-primary inline-flex px-5 py-2 text-sm font-medium">
            Đăng nhập ngay
          </Link>
        </div>
      )}

      {/* Danh sách bình luận */}
      <div className="space-y-4">
        {comments.length === 0 && !isLoading ? (
          <p className="text-center py-6 text-sm text-gray-500">
            Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên để lại ý kiến!
          </p>
        ) : (
          <div className="divide-y divide-white/5 space-y-4">
            {comments.map((comment, index) => {
              const isCommentAuthor = user && user.id === comment.authorId;
              const isAdmin = user && user.role === "ADMIN";
              const isPostAuthor = postAuthorId && comment.authorId === postAuthorId;
              
              return (
                <div key={comment.id} className={`flex gap-4 pt-4 ${index === 0 ? "pt-0 border-t-0" : ""}`}>
                  <div className="shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-gray-300">
                      {comment.author.avatarUrl ? (
                        <img src={comment.author.avatarUrl} alt={comment.author.fullName} className="h-full w-full object-cover" />
                      ) : (
                        comment.author.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-sm text-white">{comment.author.fullName}</span>
                        {isPostAuthor && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 font-medium">
                            Chủ bài đăng
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatCommentDate(comment.createdAt)}
                        </span>
                      </div>
                      
                      {(isCommentAuthor || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          className="text-gray-500 hover:text-red-400 transition p-1"
                          title="Xoá bình luận"
                        >
                          {deletingId === comment.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nút Xem thêm */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => fetchComments(page + 1, true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/10"
            >
              Xem thêm bình luận
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
