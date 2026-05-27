"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Mail, Phone, ShieldCheck, User as UserIcon, Lock, Bell, CheckCircle2 } from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";

export default function ProfileSettingsPage() {
  const { user, accessToken, hasHydrated, isLoadingUser } = useAuthStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("personal");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, user, router]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: "",
      });
    }
  }, [user]);

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar Settings Nav */}
        <aside className="space-y-1 lg:sticky lg:top-24">
          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "personal" 
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "security" 
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Lock className="w-5 h-5" />
            Bảo mật & Mật khẩu
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "notifications" 
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Bell className="w-5 h-5" />
            Cài đặt thông báo
          </button>
        </aside>

        {/* Main Content Form */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 min-h-[600px]">
          {activeTab === "personal" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Thông tin cá nhân</h2>
                  <p className="text-sm text-gray-400 mt-1">Cập nhật ảnh đại diện và thông tin cơ bản.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  Đã xác thực
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-full border-2 border-white/10 bg-slate-800 overflow-hidden flex items-center justify-center text-3xl font-bold text-gray-400">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (user.fullName || user.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <button className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                <div>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors border border-white/5">
                      Thay đổi ảnh
                    </button>
                    <button className="px-4 py-2 text-gray-400 hover:text-red-400 text-sm font-medium rounded-lg transition-colors">
                      Xoá
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Định dạng JPG, GIF hoặc PNG. Tối đa 5MB.</p>
                </div>
              </div>

              {/* Form Fields */}
              <form className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Họ và tên</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <input 
                        type="text" 
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="input-dark w-full pl-10" 
                        placeholder="Nhập họ và tên"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Vai trò</label>
                    <input 
                      type="text" 
                      value={user.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'} 
                      disabled
                      className="input-dark w-full bg-white/5 text-gray-400 cursor-not-allowed border-transparent" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Email liên hệ</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-500" />
                      </div>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="input-dark w-full pl-10" 
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Số điện thoại</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-500" />
                      </div>
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="input-dark w-full pl-10" 
                        placeholder="+84 987 654 321"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-dark w-full" 
                    placeholder="Số nhà, tên đường, phường/xã..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Giới thiệu bản thân (Bio)</label>
                  <textarea 
                    rows={4}
                    className="input-dark w-full" 
                    placeholder="Viết một chút về bản thân để khách hàng hiểu rõ hơn về bạn..."
                    defaultValue="Chuyên viên môi giới và đầu tư bất động sản khu vực TP.HCM và các tỉnh lân cận. Uy tín - Tận tâm - Chuyên nghiệp."
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-6">
                  <button type="button" className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white transition-colors font-medium mt-4">
                    Huỷ
                  </button>
                  <button type="button" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 mt-4">
                    <CheckCircle2 className="w-5 h-5" />
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-white/10 pb-6">
                <h2 className="text-xl font-semibold text-white">Đổi mật khẩu</h2>
                <p className="text-sm text-gray-400 mt-1">Đảm bảo tài khoản của bạn đang sử dụng mật khẩu dài, ngẫu nhiên để an toàn hơn.</p>
              </div>

              <form className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Mật khẩu hiện tại</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Mật khẩu mới</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Xác nhận mật khẩu mới</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="pt-2">
                  <button type="button" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-white/10 pb-6">
                <h2 className="text-xl font-semibold text-white">Cài đặt thông báo</h2>
                <p className="text-sm text-gray-400 mt-1">Quản lý cách chúng tôi liên hệ với bạn.</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                  <div>
                    <h3 className="font-medium text-white">Email thông báo</h3>
                    <p className="text-sm text-gray-400 mt-1">Nhận email khi có tin nhắn mới hoặc thông báo quan trọng.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/5">
                  <div>
                    <h3 className="font-medium text-white">Khuyến mãi & Cập nhật</h3>
                    <p className="text-sm text-gray-400 mt-1">Nhận thông tin về tính năng mới và các gói dịch vụ.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
