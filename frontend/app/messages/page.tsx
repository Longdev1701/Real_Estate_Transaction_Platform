"use client";

import { MessageSquare } from "lucide-react";

export default function MessagesEmptyPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0b1120]">
      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
        <MessageSquare className="w-10 h-10 text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Trải nghiệm chat nhanh hơn</h2>
      <p className="text-gray-400 max-w-md mx-auto mb-8">
        Bật thông báo để không bỏ lỡ bất kỳ tin nhắn quan trọng nào từ khách hàng hoặc người bán.
      </p>
      <button className="px-6 py-2.5 bg-transparent border border-blue-500 text-blue-400 font-medium rounded-xl hover:bg-blue-500/10 transition">
        Bật thông báo
      </button>
    </div>
  );
}
