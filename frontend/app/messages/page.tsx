"use client";

import { MessageSquare } from "lucide-react";

export default function MessagesEmptyPage() {
  return (
    <div className="theme-message-surface flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 items-center justify-center px-6 py-10">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-[var(--accent-border)] bg-[var(--accent-soft)] shadow-[var(--shadow-glow)]">
            <MessageSquare className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">Chọn một cuộc trò chuyện</h2>
          <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
            Danh sách bên trái vẫn giữ toàn bộ luồng chat hiện có. Khi người dùng bắt đầu chat từ trang chi tiết, bài đăng
            tương ứng sẽ tiếp tục xuất hiện trong đoạn chat của hội thoại đó.
          </p>
        </div>
      </div>
    </div>
  );
}
