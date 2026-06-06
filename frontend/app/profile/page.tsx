"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Mail, Phone, ShieldCheck, User as UserIcon, Lock, Bell, CheckCircle2, List } from "lucide-react";
import Link from "next/link";

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
          <Link
            href="/profile/posts"
            className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-soft)] px-4 py-3 text-sm font-medium text-[var(--accent)] transition-colors hover:brightness-95"
          >
            <List className="w-5 h-5" />
            Bài đăng của tôi
          </Link>
          <button
            onClick={() => setActiveTab("personal")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "personal" 
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]" 
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <UserIcon className="w-5 h-5" />
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "security" 
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]" 
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Lock className="w-5 h-5" />
            Bảo mật & Mật khẩu
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === "notifications" 
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]" 
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
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
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">Thông tin cá nhân</h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Cập nhật ảnh đại diện và thông tin cơ bản.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--success-foreground)]">
                  <ShieldCheck className="w-4 h-4" />
                  Đã xác thực
                </div>
              </div>

              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative group shrink-0">
                  <div className="theme-avatar-ring flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 text-3xl font-bold text-[var(--muted-foreground)]">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      (user.fullName || user.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <button className="theme-overlay-dim absolute inset-0 flex cursor-pointer items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="w-6 h-6 text-[var(--foreground)]" />
                  </button>
                </div>
                <div>
                  <div className="flex gap-3">
                    <button className="theme-surface-soft rounded-lg border px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]">
                      Thay đổi ảnh
                    </button>
                    <button className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--danger)]">
                      Xoá
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">Định dạng JPG, GIF hoặc PNG. Tối đa 5MB.</p>
                </div>
              </div>

              {/* Form Fields */}
              <form className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">Họ và tên</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
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
                    <label className="theme-input-label text-sm font-medium">Vai trò</label>
                    <input 
                      type="text" 
                      value={user.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'} 
                      disabled
                      className="input-dark w-full cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--muted-foreground)]" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">Email liên hệ</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-[var(--muted-foreground)]" />
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
                    <label className="theme-input-label text-sm font-medium">Số điện thoại</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-[var(--muted-foreground)]" />
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
                  <label className="theme-input-label text-sm font-medium">Địa chỉ</label>
                  <input 
                    type="text" 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-dark w-full" 
                    placeholder="Số nhà, tên đường, phường/xã..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">Giới thiệu bản thân (Bio)</label>
                  <textarea 
                    rows={4}
                    className="input-dark w-full" 
                    placeholder="Viết một chút về bản thân để khách hàng hiểu rõ hơn về bạn..."
                    defaultValue="Chuyên viên môi giới và đầu tư bất động sản khu vực TP.HCM và các tỉnh lân cận. Uy tín - Tận tâm - Chuyên nghiệp."
                  ></textarea>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
                  <button type="button" className="theme-button-secondary mt-4 rounded-xl px-5 py-2.5 font-medium transition-colors">
                    Huỷ
                  </button>
                  <button type="button" className="theme-button-primary mt-4 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors">
                    <CheckCircle2 className="w-5 h-5" />
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-[var(--border)] pb-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Đổi mật khẩu</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Đảm bảo tài khoản của bạn đang sử dụng mật khẩu dài, ngẫu nhiên để an toàn hơn.</p>
              </div>

              <form className="space-y-5 max-w-md">
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">Mật khẩu hiện tại</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">Mật khẩu mới</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">Xác nhận mật khẩu mới</label>
                  <input type="password" className="input-dark w-full" placeholder="••••••••" />
                </div>
                <div className="pt-2">
                  <button type="button" className="theme-button-primary rounded-xl px-5 py-2.5 font-medium transition-colors">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-[var(--border)] pb-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Cài đặt thông báo</h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Quản lý cách chúng tôi liên hệ với bạn.</p>
              </div>

              <div className="space-y-6">
                <div className="theme-surface-soft flex items-center justify-between rounded-xl p-4">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Email thông báo</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Nhận email khi có tin nhắn mới hoặc thông báo quan trọng.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="peer h-6 w-11 rounded-full bg-[var(--surface-muted)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-border)] peer-checked:bg-[var(--accent)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--border)] after:bg-[var(--surface)] after:content-[''] after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-[var(--primary-foreground)]"></div>
                  </label>
                </div>
                
                <div className="theme-surface-soft flex items-center justify-between rounded-xl p-4">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">Khuyến mãi & Cập nhật</h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Nhận thông tin về tính năng mới và các gói dịch vụ.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="peer h-6 w-11 rounded-full bg-[var(--surface-muted)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-border)] peer-checked:bg-[var(--accent)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--border)] after:bg-[var(--surface)] after:content-[''] after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-[var(--primary-foreground)]"></div>
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
