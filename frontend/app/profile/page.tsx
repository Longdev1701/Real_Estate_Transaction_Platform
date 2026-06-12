"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  List,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
  X,
  Image as ImageIcon,
} from "lucide-react";

import { normalizeUser } from "@/components/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { useToastStore } from "@/stores/toast.store";

export default function ProfileSettingsPage() {
  const { user, accessToken, hasHydrated, isLoadingUser, setUser } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState("personal");

  const handleTabClick = (tab: string, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(tab);
    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
  });

  useEffect(() => {
    if (hasHydrated && !accessToken && !user) {
      router.push("/auth/login");
    }
  }, [accessToken, hasHydrated, router, user]);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        address: (user as any).address || "",
        bio: (user as any).bio || "",
      });
    }
  }, [user]);

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setIsAvatarMenuOpen(false);
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const acceptedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/pjpeg",
    ]);
    const maxFileSizeInBytes = 5 * 1024 * 1024;

    if (!acceptedMimeTypes.has(file.type)) {
      addToast("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.", "error");
      return;
    }

    if (file.size > maxFileSizeInBytes) {
      addToast("Kích thước ảnh phải nhỏ hơn hoặc bằng 5MB.", "error");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const payload = new FormData();
      payload.append("avatar", file);

      const response = await api.put("/auth/avatar", payload);
      setUser(normalizeUser(response.data.data));
      addToast("Đã cập nhật ảnh đại diện.", "success");
    } catch (error: any) {
      addToast(
        error?.response?.data?.message || "Không thể cập nhật ảnh đại diện.", "error"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSavingProfile(true);
      const response = await api.patch("/auth/me", {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        bio: formData.bio,
      });
      setUser(normalizeUser(response.data.data));
      addToast("Đã lưu thông tin cá nhân.", "success");
    } catch (error: any) {
      addToast(
        error?.response?.data?.message || "Không thể cập nhật thông tin cá nhân.", "error"
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsChangingPassword(true);
      await api.patch("/auth/change-password", passwordForm);
      addToast("Đã cập nhật mật khẩu.", "success");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      addToast(
        error?.response?.data?.message || "Không thể cập nhật mật khẩu.", "error"
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!hasHydrated || isLoadingUser || (accessToken && !user)) return null;
  if (!user) return null;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="flex items-center gap-2 pb-2 lg:block lg:space-y-1 lg:sticky lg:top-24 lg:pb-0 shrink-0 -mx-4 px-4 lg:mx-0 lg:px-0">
          <Link
            href="/profile/posts"
            className="flex-shrink-0 flex items-center justify-center rounded-xl bg-[var(--accent)] p-2.5 text-[var(--primary-foreground)] shadow-[var(--shadow-glow)] transition-all hover:brightness-110 lg:mb-4 lg:w-full lg:justify-start lg:gap-3 lg:px-4 lg:py-3"
            title="Quay lại"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden text-sm font-medium lg:inline">Quay lại</span>
          </Link>
          <div className="flex flex-1 overflow-x-auto gap-2 no-scrollbar lg:block lg:space-y-1 lg:overflow-visible">
            <button
              onClick={(e) => handleTabClick("personal", e)}
            className={`flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 lg:w-full lg:gap-3 lg:px-4 lg:py-3 text-sm font-medium transition-all ${
              activeTab === "personal"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <UserIcon className="h-4 w-4 lg:h-5 lg:w-5" />
            Thông tin cá nhân
          </button>
          <button
            onClick={(e) => handleTabClick("security", e)}
            className={`flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 lg:w-full lg:gap-3 lg:px-4 lg:py-3 text-sm font-medium transition-all ${
              activeTab === "security"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Lock className="h-4 w-4 lg:h-5 lg:w-5" />
            Đổi mật khẩu
          </button>
          <button
            onClick={(e) => handleTabClick("notifications", e)}
            className={`flex-shrink-0 flex items-center gap-2 rounded-xl px-3 py-2.5 lg:w-full lg:gap-3 lg:px-4 lg:py-3 text-sm font-medium transition-all ${
              activeTab === "notifications"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
              <Bell className="h-4 w-4 lg:h-5 lg:w-5" />
              Cài đặt thông báo
            </button>
          </div>
        </aside>

        <div className="glass-panel min-h-[600px] rounded-2xl p-4 sm:p-6 lg:p-8">
          {activeTab === "personal" && (
            <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    Thông tin cá nhân
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Cập nhật ảnh đại diện và thông tin cơ bản.
                  </p>
                </div>

              </div>

              <form className="space-y-6" onSubmit={handleProfileSubmit}>
                {/* Khối Header: Avatar + Form Cơ bản */}
                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-8 sm:gap-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
                  {/* Left: Avatar */}
                  <div className="relative shrink-0" ref={avatarMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
                      className="group relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface-muted)] text-3xl sm:text-4xl font-bold text-[var(--muted-foreground)] focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)] shadow-md transition-all hover:border-[var(--accent-soft)] hover:scale-[1.02]"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (user.fullName || user.name || "U").charAt(0).toUpperCase()
                      )}
                      <div className="theme-overlay-dim absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 bg-black/40 backdrop-blur-[2px]">
                        <Camera className="h-8 w-8 text-white drop-shadow-md" />
                      </div>
                    </button>
                    
                    {isAvatarMenuOpen && (
                      <div className="absolute left-1/2 mt-3 w-48 -translate-x-1/2 sm:left-0 sm:translate-x-0 rounded-xl border border-[var(--border)] bg-[var(--popover)] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            setShowAvatarModal(true);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                        >
                          <ImageIcon className="h-4.5 w-4.5 text-[var(--muted-foreground)]" />
                          Xem ảnh
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
                        >
                          <Camera className="h-4.5 w-4.5 text-[var(--muted-foreground)]" />
                          Thay đổi ảnh
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />
                    {isUploadingAvatar && (
                      <p className="absolute -bottom-8 left-1/2 w-max -translate-x-1/2 text-xs font-medium text-[var(--accent)] animate-pulse">
                        Đang tải lên...
                      </p>
                    )}
                  </div>

                  {/* Right: Core Fields */}
                  <div className="flex-1 w-full space-y-5">
                    <div className="space-y-2">
                      <label className="theme-input-label text-sm font-medium text-[var(--foreground)]">
                        Họ và tên
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <UserIcon className="h-5 w-5 text-[var(--muted-foreground)]" />
                        </div>
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              fullName: event.target.value,
                            })
                          }
                          className="input-dark w-full pl-10"
                          placeholder="Nhập họ và tên"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="theme-input-label text-sm font-medium text-[var(--foreground)]">
                          Email liên hệ
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-5 w-5 text-[var(--muted-foreground)]" />
                          </div>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                email: event.target.value,
                              })
                            }
                            className="input-dark w-full pl-10"
                            placeholder="example@email.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="theme-input-label text-sm font-medium text-[var(--foreground)]">
                          Số điện thoại
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Phone className="h-5 w-5 text-[var(--muted-foreground)]" />
                          </div>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(event) =>
                              setFormData({
                                ...formData,
                                phone: event.target.value,
                              })
                            }
                            className="input-dark w-full pl-10"
                            placeholder="+84 987 654 321"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Khối Additional Information */}
                <div className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm mt-6">
                  <h3 className="text-lg font-semibold text-[var(--foreground)] border-b border-[var(--border)] pb-4 mb-2">
                    Thông tin bổ sung
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          address: event.target.value,
                        })
                      }
                      className="input-dark w-full"
                      placeholder="Nhập địa chỉ của bạn"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">
                      Giới thiệu bản thân (Bio)
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          bio: event.target.value,
                        })
                      }
                      className="input-dark w-full resize-none"
                      placeholder="Viết một chút về bản thân bạn..."
                    />
                  </div>
                </div>




                <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        fullName: user.fullName || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        address: (user as any).address || "",
                        bio: (user as any).bio || "",
                      })
                    }
                    className="theme-button-secondary mt-4 rounded-xl px-5 py-2.5 font-medium transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="theme-button-primary mt-4 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {isSavingProfile ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "security" && (
            <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-[var(--border)] pb-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  Đổi mật khẩu
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Đảm bảo tài khoản của bạn đang sử dụng mật khẩu dài, ngẫu nhiên
                  để an toàn hơn.
                </p>
              </div>

              <form className="max-w-md space-y-5" onSubmit={handlePasswordSubmit}>
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    className="input-dark w-full"
                    placeholder="********"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        currentPassword: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    className="input-dark w-full"
                    placeholder="********"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: event.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    className="input-dark w-full"
                    placeholder="********"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: event.target.value,
                      })
                    }
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="theme-button-primary rounded-xl px-5 py-2.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isChangingPassword ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="animate-in space-y-8 fade-in slide-in-from-bottom-4 duration-500">
              <div className="border-b border-[var(--border)] pb-6">
                <h2 className="text-xl font-semibold text-[var(--foreground)]">
                  Cài đặt thông báo
                </h2>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Quản lý cách chúng tôi liên hệ với bạn.
                </p>
              </div>

              <div className="space-y-6">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Mục này hiện chưa được kết nối backend, nên mới chỉ là giao diện.
                </p>
                <div className="theme-surface-soft flex items-center justify-between rounded-xl p-4">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">
                      Email thông báo
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Nhận email khi có tin nhắn mới hoặc thông báo quan trọng.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      defaultChecked
                    />
                    <div className="peer h-6 w-11 rounded-full bg-[var(--surface-muted)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--border)] after:bg-[var(--surface)] after:transition-all after:content-[''] peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-full peer-checked:after:border-[var(--primary-foreground)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-border)]" />
                  </label>
                </div>

                <div className="theme-surface-soft flex items-center justify-between rounded-xl p-4">
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">
                      Khuyến mãi và cập nhật
                    </h3>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      Nhận thông tin về tính năng mới và các gói dịch vụ.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" />
                    <div className="peer h-6 w-11 rounded-full bg-[var(--surface-muted)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-[var(--border)] after:bg-[var(--surface)] after:transition-all after:content-[''] peer-checked:bg-[var(--accent)] peer-checked:after:translate-x-full peer-checked:after:border-[var(--primary-foreground)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-border)]" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAvatarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowAvatarModal(false)}>
          <button
            className="absolute top-4 right-4 text-white hover:opacity-70 transition-opacity"
            onClick={() => setShowAvatarModal(false)}
          >
            <X className="h-8 w-8" />
          </button>
          <div className="relative max-w-2xl max-h-[80vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
             {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-auto max-h-[80vh] object-contain rounded-lg shadow-2xl" />
             ) : (
                <div className="flex h-64 w-64 items-center justify-center rounded-full bg-[var(--surface-muted)] text-7xl font-bold text-[var(--muted-foreground)] shadow-2xl">
                   {(user?.fullName || user?.name || "U").charAt(0).toUpperCase()}
                </div>
             )}
          </div>
        </div>
      )}


    </div>
  );
}
