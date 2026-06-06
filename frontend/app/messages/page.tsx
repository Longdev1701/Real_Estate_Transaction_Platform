"use client";

import { MessageSquare, Search, Sparkles } from "lucide-react";

export default function MessagesEmptyPage() {
  return (
    <div className="theme-message-surface flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 items-center justify-center border-r border-[var(--border)] px-6 py-10">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-[var(--accent-border)] bg-[var(--accent-soft)] shadow-[var(--shadow-glow)]">
            <MessageSquare className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Chọn một cuộc trò chuyện</h2>
          <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
            Danh sách bên trái vẫn giữ toàn bộ luồng chat hiện có. Khi người dùng bắt đầu chat từ trang chi tiết, bài đăng
            tương ứng sẽ tiếp tục xuất hiện trong đoạn chat của hội thoại đó.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="theme-surface-soft rounded-[24px] p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-[var(--foreground)]">Tìm nhanh hội thoại</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Lọc theo người dùng hoặc tiêu đề bất động sản.</p>
            </div>

            <div className="theme-surface-soft rounded-[24px] p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--accent)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-[var(--foreground)]">Giữ nguyên dữ liệu cũ</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                Socket, đã đọc, typing, ảnh và thẻ bài đăng vẫn dùng cùng API hiện tại.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className="theme-message-sidebar hidden w-[340px] shrink-0 flex-col gap-5 p-5 xl:flex">
        <div className="theme-surface-soft rounded-[28px] p-5">
          <p className="text-sm font-medium text-[var(--foreground)]">Khung thông tin</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Khi chọn một hội thoại, panel này sẽ hiển thị người đang trao đổi, bất động sản liên quan và các ảnh đã được gửi
            trong đoạn chat.
          </p>
        </div>

        <div className="theme-upload-zone rounded-[28px] p-5">
          <p className="text-sm font-medium text-[var(--secondary-foreground)]">Luồng cũ vẫn giữ</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Nhắn chat từ trang chi tiết vẫn mở đúng conversation gắn với `postId` và `sellerId`.
          </p>
        </div>
      </aside>
    </div>
  );
}
