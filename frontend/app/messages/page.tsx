"use client";

import { MessageSquare, Search, Sparkles } from "lucide-react";

export default function MessagesEmptyPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_34%),linear-gradient(180deg,#071326_0%,#06101f_100%)]">
      <div className="flex min-w-0 flex-1 items-center justify-center border-r border-white/10 px-6 py-10">
        <div className="max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-blue-400/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(129,140,248,0.14))] shadow-[0_16px_48px_rgba(37,99,235,0.18)]">
            <MessageSquare className="h-10 w-10 text-blue-300" />
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white">Chọn một cuộc trò chuyện</h2>
          <p className="mt-3 text-base leading-7 text-slate-400">
            Danh sách bên trái vẫn giữ toàn bộ luồng chat hiện có. Khi người dùng bắt đầu chat từ trang chi tiết, bài
            đăng tương ứng sẽ tiếp tục xuất hiện trong đoạn chat của hội thoại đó.
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-blue-300">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-white">Tìm nhanh hội thoại</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">Lọc theo người dùng hoặc tiêu đề bất động sản.</p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-violet-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-white">Giữ nguyên dữ liệu cũ</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Socket, đã đọc, typing, ảnh và thẻ bài đăng vẫn dùng cùng API hiện tại.
              </p>
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden w-[340px] shrink-0 flex-col gap-5 bg-[linear-gradient(180deg,rgba(11,22,42,0.94),rgba(7,16,31,0.98))] p-5 xl:flex">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-sm font-medium text-white">Khung thông tin</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Khi chọn một hội thoại, panel này sẽ hiển thị người đang trao đổi, bất động sản liên quan và các ảnh đã
            được gửi trong đoạn chat.
          </p>
        </div>

        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.02] p-5">
          <p className="text-sm font-medium text-slate-300">Luồng cũ vẫn giữ</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Nhấn chat từ trang chi tiết vẫn mở đúng conversation gắn với `postId` và `sellerId`.
          </p>
        </div>
      </aside>
    </div>
  );
}
