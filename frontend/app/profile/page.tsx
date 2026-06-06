"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  CheckCircle2,
  List,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";

import { normalizeUser } from "@/components/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function ProfileSettingsPage() {
  const { user, accessToken, hasHydrated, isLoadingUser, setUser } = useAuthStore();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState("personal");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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
  }, [accessToken, hasHydrated, router, user]);

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

  const resetAvatarMessages = () => {
    setAvatarError(null);
    setAvatarSuccess(null);
  };

  const handleAvatarFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    resetAvatarMessages();

    const acceptedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/pjpeg",
    ]);
    const maxFileSizeInBytes = 5 * 1024 * 1024;

    if (!acceptedMimeTypes.has(file.type)) {
      setAvatarError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > maxFileSizeInBytes) {
      setAvatarError("Kích thước ảnh phải nhỏ hơn hoặc bằng 5MB.");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const payload = new FormData();
      payload.append("avatar", file);

      const response = await api.put("/auth/avatar", payload);
      setUser(normalizeUser(response.data.data));
      setAvatarSuccess("Đã cập nhật ảnh đại diện.");
    } catch (error: any) {
      setAvatarError(
        error?.response?.data?.message || "Không thể cập nhật ảnh đại diện.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    resetAvatarMessages();

    if (!user?.avatarUrl) {
      setAvatarSuccess("Ảnh đại diện hiện đã được xóa.");
      return;
    }

    try {
      setIsRemovingAvatar(true);
      const response = await api.delete("/auth/avatar");
      setUser(normalizeUser(response.data.data));
      setAvatarSuccess("Đã xóa ảnh đại diện.");
    } catch (error: any) {
      setAvatarError(
        error?.response?.data?.message || "Không thể xóa ảnh đại diện.",
      );
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);

    try {
      setIsSavingProfile(true);
      const response = await api.patch("/auth/me", {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });
      setUser(normalizeUser(response.data.data));
      setProfileSuccess("Đã lưu thông tin cá nhân.");
    } catch (error: any) {
      setProfileError(
        error?.response?.data?.message || "Không thể cập nhật thông tin cá nhân.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      setIsChangingPassword(true);
      await api.patch("/auth/change-password", passwordForm);
      setPasswordSuccess("Đã cập nhật mật khẩu.");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      setPasswordError(
        error?.response?.data?.message || "Không thể cập nhật mật khẩu.",
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
        <aside className="space-y-1 lg:sticky lg:top-24">
          <Link
            href="/profile/posts"
            className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-soft)] px-4 py-3 text-sm font-medium text-[var(--accent)] transition-colors hover:brightness-95"
          >
            <List className="h-5 w-5" />
            Bài đăng của tôi
          </Link>
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "personal"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <UserIcon className="h-5 w-5" />
            Thông tin cá nhân
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "security"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Lock className="h-5 w-5" />
            Bảo mật và mật khẩu
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              activeTab === "notifications"
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-[var(--shadow-glow)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Bell className="h-5 w-5" />
            Cài đặt thông báo
          </button>
        </aside>

        <div className="glass-panel min-h-[600px] rounded-2xl p-6 md:p-8">
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
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-medium text-[var(--success-foreground)]">
                  <ShieldCheck className="h-4 w-4" />
                  Đã xác thực
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="group relative shrink-0">
                  <div className="theme-avatar-ring flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 text-3xl font-bold text-[var(--muted-foreground)]">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (user.fullName || user.name || "U").charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar || isRemovingAvatar}
                    className="theme-overlay-dim absolute inset-0 flex items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                  >
                    <Camera className="h-6 w-6 text-[var(--foreground)]" />
                  </button>
                </div>

                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="theme-surface-soft rounded-lg border px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUploadingAvatar ? "Đang tải lên..." : "Thay đổi ảnh"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isRemovingAvatar ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    Định dạng JPG, PNG hoặc WEBP. Tối đa 5MB.
                  </p>
                  {avatarError ? (
                    <p className="mt-2 text-xs text-[var(--danger-foreground)]">
                      {avatarError}
                    </p>
                  ) : null}
                  {avatarSuccess ? (
                    <p className="mt-2 text-xs text-[var(--success-foreground)]">
                      {avatarSuccess}
                    </p>
                  ) : null}
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleProfileSubmit}>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">
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

                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">
                      Vai trò
                    </label>
                    <input
                      type="text"
                      value={user.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}
                      disabled
                      className="input-dark w-full cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--muted-foreground)]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="theme-input-label text-sm font-medium">
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
                    <label className="theme-input-label text-sm font-medium">
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
                    className="input-dark w-full cursor-not-allowed opacity-70"
                    placeholder="Chưa có trường lưu địa chỉ trong backend"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <label className="theme-input-label text-sm font-medium">
                    Giới thiệu bản thân (Bio)
                  </label>
                  <textarea
                    rows={4}
                    className="input-dark w-full cursor-not-allowed opacity-70"
                    placeholder="Chưa có trường lưu bio trong backend"
                    disabled
                  />
                </div>

                {profileError ? (
                  <p className="text-sm text-[var(--danger-foreground)]">
                    {profileError}
                  </p>
                ) : null}
                {profileSuccess ? (
                  <p className="text-sm text-[var(--success-foreground)]">
                    {profileSuccess}
                  </p>
                ) : null}
                <p className="text-xs text-[var(--muted-foreground)]">
                  Hiện backend chỉ lưu được họ tên, email, số điện thoại và avatar.
                </p>

                <div className="mt-6 flex justify-end gap-3 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        fullName: user.fullName || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        address: "",
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
                {passwordError ? (
                  <p className="text-sm text-[var(--danger-foreground)]">
                    {passwordError}
                  </p>
                ) : null}
                {passwordSuccess ? (
                  <p className="text-sm text-[var(--success-foreground)]">
                    {passwordSuccess}
                  </p>
                ) : null}
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
    </div>
  );
}
