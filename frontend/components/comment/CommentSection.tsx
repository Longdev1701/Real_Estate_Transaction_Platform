"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, LoaderCircle, MessageSquare, Send, Trash2, X } from "lucide-react";

import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useSocketStore } from "@/stores/socket.store";

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
  updatedAt: string;
  parentId?: string | null;
  author: CommentAuthor;
  replyToUser?: CommentAuthor | null;
  replies?: Comment[];
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

type DeletePayload = {
  success: boolean;
  commentId: string;
  postId: string;
  parentId?: string | null;
  deletedCount: number;
};

interface CommentSectionProps {
  postId: string;
  postAuthorId?: string;
}

const COMMENT_PAGE_SIZE = 10;

const getAuthorName = (author?: CommentAuthor | null) => author?.fullName || "Người dùng";

const upsertRootComment = (items: Comment[], comment: Comment) => {
  const exists = items.some((item) => item.id === comment.id);
  if (exists) {
    return items.map((item) => (item.id === comment.id ? { ...comment, replies: comment.replies ?? item.replies ?? [] } : item));
  }

  return [{ ...comment, replies: comment.replies ?? [] }, ...items];
};

const upsertReply = (items: Comment[], reply: Comment) =>
  items.map((item) => {
    if (item.id !== reply.parentId) {
      return item;
    }

    const replies = item.replies ?? [];
    const exists = replies.some((currentReply) => currentReply.id === reply.id);

    return {
      ...item,
      replies: exists
        ? replies.map((currentReply) => (currentReply.id === reply.id ? reply : currentReply))
        : [...replies, reply],
    };
  });

const updateCommentInTree = (items: Comment[], comment: Comment) => {
  if (!comment.parentId) {
    return items.map((item) => (item.id === comment.id ? { ...item, ...comment, replies: item.replies ?? [] } : item));
  }

  return items.map((item) => ({
    ...item,
    replies: (item.replies ?? []).map((reply) => (reply.id === comment.id ? comment : reply)),
  }));
};

const removeCommentFromTree = (items: Comment[], payload: DeletePayload) => {
  if (!payload.parentId) {
    return items.filter((item) => item.id !== payload.commentId);
  }

  return items.map((item) => ({
    ...item,
    replies: (item.replies ?? []).filter((reply) => reply.id !== payload.commentId),
  }));
};

export default function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const { user } = useAuthStore();
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore((state) => state.isConnected);

  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const isAdmin = user?.role === "ADMIN";

  const fetchComments = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setIsLoading(true);
      setError(null);

      const response = await api.get<CommentResponse>("/comments", {
        params: { postId, page: pageNum, limit: COMMENT_PAGE_SIZE },
      });
      const { items, meta } = response.data.data;

      setComments((current) => (append ? mergeCommentPages(current, items) : items));
      setHasMore(meta.hasMore);
      setTotalCount(meta.total);
      setPage(meta.page);
    } catch (err: any) {
      console.error("Failed to load comments:", err);
      setError("Không thể tải danh sách bình luận.");
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments(1, false);
  }, [fetchComments]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit("join_post_comments", postId);

    const handleCreated = (comment: Comment) => {
      if (comment.postId !== postId) return;
      setComments((current) => {
        const exists = commentsContain(current, comment.id);
        if (!exists) {
          setTotalCount((count) => count + 1);
        }
        return comment.parentId ? upsertReply(current, comment) : upsertRootComment(current, comment);
      });
    };

    const handleUpdated = (comment: Comment) => {
      if (comment.postId !== postId) return;
      setComments((current) => updateCommentInTree(current, comment));
    };

    const handleDeleted = (payload: DeletePayload) => {
      if (payload.postId !== postId) return;
      setComments((current) => {
        const exists = commentsContain(current, payload.commentId);
        if (exists) {
          setTotalCount((count) => Math.max(0, count - payload.deletedCount));
        }
        return removeCommentFromTree(current, payload);
      });
    };

    socket.on("comment_created", handleCreated);
    socket.on("comment_updated", handleUpdated);
    socket.on("comment_deleted", handleDeleted);

    return () => {
      socket.emit("leave_post_comments", postId);
      socket.off("comment_created", handleCreated);
      socket.off("comment_updated", handleUpdated);
      socket.off("comment_deleted", handleDeleted);
    };
  }, [isConnected, postId, socket]);

  const formatCommentDate = useCallback((dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !content.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.post<{ data: Comment }>("/comments", {
        postId,
        content: content.trim(),
      });

      const newComment = response.data.data;
      setComments((current) => {
        const exists = commentsContain(current, newComment.id);
        if (!exists) {
          setTotalCount((count) => count + 1);
        }
        return upsertRootComment(current, newComment);
      });
      setContent("");
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setError(err.response?.data?.message || "Không thể gửi bình luận lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (event: React.FormEvent, parentId: string) => {
    event.preventDefault();
    if (!user || !replyContent.trim() || !replyTarget) return;

    try {
      setIsSubmittingReply(parentId);
      setError(null);
      const response = await api.post<{ data: Comment }>("/comments", {
        postId,
        content: replyContent.trim(),
        parentId,
        replyToUserId: replyTarget.authorId,
      });

      const newReply = response.data.data;
      setComments((current) => {
        const exists = commentsContain(current, newReply.id);
        if (!exists) {
          setTotalCount((count) => count + 1);
        }
        return upsertReply(current, newReply);
      });
      setReplyContent("");
      setActiveReplyCommentId(null);
      setReplyTarget(null);
    } catch (err: any) {
      console.error("Failed to post reply:", err);
      setError(err.response?.data?.message || "Không thể gửi câu trả lời lúc này.");
    } finally {
      setIsSubmittingReply(null);
    }
  };

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingComment || !editingContent.trim()) return;

    try {
      setIsUpdating(true);
      setError(null);
      const response = await api.patch<{ data: Comment }>(`/comments/${editingComment.id}`, {
        content: editingContent.trim(),
      });

      setComments((current) => updateCommentInTree(current, response.data.data));
      setEditingComment(null);
      setEditingContent("");
    } catch (err: any) {
      console.error("Failed to update comment:", err);
      setError(err.response?.data?.message || "Không thể cập nhật bình luận.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xoá bình luận này?")) return;

    try {
      setDeletingId(commentId);
      setError(null);
      const response = await api.delete<{ data: DeletePayload }>(`/comments/${commentId}`);
      const payload = response.data.data;
      setComments((current) => {
        const exists = commentsContain(current, payload.commentId);
        if (exists) {
          setTotalCount((count) => Math.max(0, count - payload.deletedCount));
        }
        return removeCommentFromTree(current, payload);
      });
    } catch (err: any) {
      console.error("Failed to delete comment:", err);
      setError(err.response?.data?.message || "Không thể xoá bình luận. Vui lòng thử lại.");
    } finally {
      setDeletingId(null);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingComment(comment);
    setEditingContent(comment.content);
  };

  const totalLabel = useMemo(() => new Intl.NumberFormat("vi-VN").format(totalCount), [totalCount]);

  return (
    <section className="glass-card space-y-6 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
          <h2 className="text-2xl font-semibold text-[var(--foreground)]">Bình luận ({totalLabel})</h2>
        </div>
      </div>

      {error && (
        <div className="theme-badge-danger rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Avatar name={user.fullName || user.name} imageUrl={user.avatarUrl} size="md" />
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Chia sẻ ý kiến của bạn về bất động sản này..."
              rows={3}
              maxLength={1000}
              className="input-dark theme-post-input w-full px-3 py-2 text-sm"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Gửi bình luận
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="theme-subtle-card rounded-2xl border border-dashed p-6 text-center">
          <p className="mb-3 text-sm text-[var(--muted-foreground)]">Vui lòng đăng nhập để để lại bình luận và thảo luận cùng mọi người.</p>
          <Link
            href={`/auth/login?redirectTo=${encodeURIComponent(
              typeof window !== "undefined"
                ? (() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("commentPostId", postId);
                    return url.pathname + url.search;
                  })()
                : ""
            )}`}
            className="btn-primary inline-flex px-5 py-2 text-sm font-medium"
          >
            Đăng nhập ngay
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex min-h-28 items-center justify-center text-sm text-[var(--secondary-foreground)]">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin text-[var(--accent)]" />
            Đang tải bình luận...
          </div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
            Chưa có bình luận nào cho bài viết này. Hãy là người đầu tiên để lại ý kiến.
          </p>
        ) : (
          <div className="space-y-4 divide-y divide-[var(--border)]">
            {comments.map((comment, index) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                index={index}
                postAuthorId={postAuthorId}
                currentUserId={user?.id}
                isAdmin={Boolean(isAdmin)}
                deletingId={deletingId}
                activeReplyCommentId={activeReplyCommentId}
                replyContent={replyContent}
                isSubmittingReply={isSubmittingReply}
                replyTarget={replyTarget}
                editingCommentId={editingComment?.id ?? null}
                editingContent={editingContent}
                isUpdating={isUpdating}
                onReply={(targetComment) => {
                  setActiveReplyCommentId(targetComment.parentId || targetComment.id);
                  setReplyTarget(targetComment);
                  setReplyContent("");
                }}
                onReplyContentChange={setReplyContent}
                onReplySubmit={handleReplySubmit}
                onCancelReply={() => {
                  setActiveReplyCommentId(null);
                  setReplyTarget(null);
                  setReplyContent("");
                }}
                onEdit={startEditing}
                onEditingContentChange={setEditingContent}
                onUpdateSubmit={handleUpdate}
                onCancelEdit={() => {
                  setEditingComment(null);
                  setEditingContent("");
                }}
                onDelete={handleDelete}
                formatCommentDate={formatCommentDate}
              />
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => fetchComments(page + 1, true)}
              className="theme-button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition"
            >
              Xem thêm bình luận
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  index,
  postAuthorId,
  currentUserId,
  isAdmin,
  deletingId,
  activeReplyCommentId,
  replyContent,
  isSubmittingReply,
  replyTarget,
  editingCommentId,
  editingContent,
  isUpdating,
  onReply,
  onReplyContentChange,
  onReplySubmit,
  onCancelReply,
  onEdit,
  onEditingContentChange,
  onUpdateSubmit,
  onCancelEdit,
  onDelete,
  formatCommentDate,
}: {
  comment: Comment;
  index: number;
  postAuthorId?: string;
  currentUserId?: string;
  isAdmin: boolean;
  deletingId: string | null;
  activeReplyCommentId: string | null;
  replyContent: string;
  isSubmittingReply: string | null;
  replyTarget: Comment | null;
  editingCommentId: string | null;
  editingContent: string;
  isUpdating: boolean;
  onReply: (comment: Comment) => void;
  onReplyContentChange: (content: string) => void;
  onReplySubmit: (event: React.FormEvent, parentId: string) => void;
  onCancelReply: () => void;
  onEdit: (comment: Comment) => void;
  onEditingContentChange: (content: string) => void;
  onUpdateSubmit: (event: React.FormEvent) => void;
  onCancelEdit: () => void;
  onDelete: (commentId: string) => void;
  formatCommentDate: (dateStr: string) => string;
}) {
  const isAuthor = currentUserId === comment.authorId;
  const canManage = isAuthor || isAdmin;
  const isPostAuthor = postAuthorId === comment.authorId;
  const hasReplies = Boolean(comment.replies?.length);

  return (
    <div className={`flex gap-4 pt-4 ${index === 0 ? "border-t-0 pt-0" : ""}`}>
      <Avatar name={getAuthorName(comment.author)} imageUrl={comment.author?.avatarUrl} size="md" />
      <div className="min-w-0 flex-1 space-y-2">
        <CommentHeader
          comment={comment}
          isPostAuthor={isPostAuthor}
          canManage={canManage}
          deletingId={deletingId}
          onEdit={onEdit}
          onDelete={onDelete}
          formatCommentDate={formatCommentDate}
        />

        {editingCommentId === comment.id ? (
          <EditForm
            value={editingContent}
            isSubmitting={isUpdating}
            onChange={onEditingContentChange}
            onSubmit={onUpdateSubmit}
            onCancel={onCancelEdit}
          />
        ) : (
          <>
            <ReplyTargetLabel comment={comment} />
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--secondary-foreground)]">{comment.content}</p>
          </>
        )}

        {currentUserId && editingCommentId !== comment.id && (
          <button type="button" onClick={() => onReply(comment)} className="text-xs text-[var(--muted-foreground)] transition hover:text-[var(--accent)]">
            Trả lời
          </button>
        )}

        {activeReplyCommentId === comment.id && (
          <ReplyForm
            value={replyContent}
            placeholder={`Trả lời ${getAuthorName(comment.author)}...`}
            targetName={getAuthorName(replyTarget?.author)}
            isSubmitting={isSubmittingReply === comment.id}
            onChange={onReplyContentChange}
            onSubmit={(event) => onReplySubmit(event, comment.id)}
            onCancel={onCancelReply}
          />
        )}

        {hasReplies && (
          <div className="mt-4 space-y-4 border-l-2 border-[var(--border)] pl-6">
            {comment.replies!.map((reply) => {
              const canManageReply = currentUserId === reply.authorId || isAdmin;
              const isReplyPostAuthor = postAuthorId === reply.authorId;

              return (
                <div key={reply.id} className="flex gap-3 pt-2">
                  <Avatar name={getAuthorName(reply.author)} imageUrl={reply.author?.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <CommentHeader
                      comment={reply}
                      isPostAuthor={isReplyPostAuthor}
                      canManage={canManageReply}
                      deletingId={deletingId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      formatCommentDate={formatCommentDate}
                      compact
                    />
                    {editingCommentId === reply.id ? (
                      <EditForm
                        value={editingContent}
                        isSubmitting={isUpdating}
                        onChange={onEditingContentChange}
                        onSubmit={onUpdateSubmit}
                        onCancel={onCancelEdit}
                        compact
                      />
                    ) : (
                      <>
                        <ReplyTargetLabel comment={reply} compact />
                        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-[var(--secondary-foreground)]">{reply.content}</p>
                      </>
                    )}
                    {currentUserId && editingCommentId !== reply.id && (
                      <button type="button" onClick={() => onReply(reply)} className="text-[10px] text-[var(--muted-foreground)] transition hover:text-[var(--accent)]">
                        Trả lời
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CommentHeader({
  comment,
  isPostAuthor,
  canManage,
  deletingId,
  onEdit,
  onDelete,
  formatCommentDate,
  compact = false,
}: {
  comment: Comment;
  isPostAuthor: boolean;
  canManage: boolean;
  deletingId: string | null;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  formatCommentDate: (dateStr: string) => string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`${compact ? "text-xs" : "text-sm"} font-semibold text-[var(--foreground)]`}>{getAuthorName(comment.author)}</span>
        {isPostAuthor && (
          <span className={`theme-badge-info ${compact ? "text-[9px]" : "text-[10px]"} rounded-md px-1.5 py-0.5 font-medium`}>
            Chủ bài đăng
          </span>
        )}
        <span className={`${compact ? "text-[10px]" : "text-xs"} text-[var(--muted-foreground)]`}>{formatCommentDate(comment.createdAt)}</span>
      </div>

      {canManage && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(comment)}
            className="p-1 text-[var(--muted-foreground)] transition hover:text-[var(--accent)]"
            title="Sửa bình luận"
          >
            <Edit3 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            disabled={deletingId === comment.id}
            className="p-1 text-[var(--muted-foreground)] transition hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
            title="Xóa bình luận"
          >
            {deletingId === comment.id ? (
              <LoaderCircle className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"} animate-spin text-[var(--danger)]`} />
            ) : (
              <Trash2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function ReplyTargetLabel({ comment, compact = false }: { comment: Comment; compact?: boolean }) {
  if (!comment.replyToUser || !comment.parentId) {
    return null;
  }

  return (
    <p className={`${compact ? "text-[10px]" : "text-xs"} text-[var(--muted-foreground)]`}>
      Đang trả lời <span className="font-medium text-[var(--accent)]">{getAuthorName(comment.replyToUser)}</span>
    </p>
  );
}

function ReplyForm({
  value,
  placeholder,
  targetName,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  placeholder: string;
  targetName: string;
  isSubmitting: boolean;
  onChange: (content: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-3 flex gap-3 border-l-2 border-[var(--accent-border)] pl-4">
      <div className="flex-1 space-y-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          Đang trả lời <span className="font-semibold text-[var(--accent)]">{targetName}</span>
        </p>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={2}
          maxLength={1000}
          className="input-dark theme-post-input w-full px-3 py-1.5 text-xs"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
            Hủy
          </button>
          <button type="submit" disabled={isSubmitting || !value.trim()} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
            {isSubmitting ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Trả lời
          </button>
        </div>
      </div>
    </form>
  );
}

function EditForm({
  value,
  isSubmitting,
  onChange,
  onSubmit,
  onCancel,
  compact = false,
}: {
  value: string;
  isSubmitting: boolean;
  onChange: (content: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  compact?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={compact ? 2 : 3}
        maxLength={1000}
        className={`input-dark theme-post-input w-full px-3 py-2 ${compact ? "text-xs" : "text-sm"}`}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
          <X className="h-3 w-3" />
          Hủy
        </button>
        <button type="submit" disabled={isSubmitting || !value.trim()} className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium disabled:opacity-50">
          {isSubmitting ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Lưu
        </button>
      </div>
    </form>
  );
}

function Avatar({ name, imageUrl, size }: { name?: string | null; imageUrl?: string | null; size: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const displayName = name || "Người dùng";

  return (
    <div className={`theme-icon-button flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${sizeClass}`}>
      {imageUrl ? (
        <img src={imageUrl} alt={displayName} className="h-full w-full object-cover" />
      ) : (
        displayName.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function commentsContain(items: Comment[], commentId: string) {
  return items.some((item) => item.id === commentId || (item.replies ?? []).some((reply) => reply.id === commentId));
}

function mergeCommentPages(current: Comment[], nextItems: Comment[]) {
  return nextItems.reduce((items, comment) => {
    if (commentsContain(items, comment.id)) {
      return items;
    }

    return [...items, comment];
  }, current);
}
