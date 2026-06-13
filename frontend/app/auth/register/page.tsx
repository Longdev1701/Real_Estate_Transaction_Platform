"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { normalizeUser } from "@/components/auth/AuthSessionProvider";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

const registerSchema = z
  .object({
    fullName: z.string().min(2, "Họ tên ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),
    phone: z.string().optional(),
    password: z.string().min(8, "Mật khẩu ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, user, hasHydrated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && user) {
      router.push("/");
    }
  }, [hasHydrated, user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);

      const { confirmPassword: _confirmPassword, phone, ...payload } = data;
      const response = await api.post("/auth/register", {
        ...payload,
        ...(phone?.trim() ? { phone: phone.trim() } : {}),
      });

      const nextUser = response.data.data.user;
      const accessToken = response.data.data.tokens.accessToken;

      setAuth(normalizeUser(nextUser), accessToken);
      setSuccessMsg("Đăng ký thành công! Đang chuyển hướng...");
      router.push("/");
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(
        axiosError.response?.data?.message ||
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <div className="glass-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Đăng ký</h1>
        <p className="theme-text-muted mb-8 text-center">Tham gia TrustEstate ngay hôm nay</p>

        {error ? (
          <div className="theme-button-danger-solid mb-6 rounded-xl p-3 text-sm">
            {error}
          </div>
        ) : null}

        {successMsg ? (
          <div className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 mb-6 rounded-xl p-3 text-sm">
            {successMsg}
          </div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">Họ tên</label>
            <input
              type="text"
              {...register("fullName")}
              className="input-dark"
              placeholder="Nguyễn Văn A"
            />
            {errors.fullName ? (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.fullName.message}</p>
            ) : null}
          </div>

          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              {...register("email")}
              className="input-dark"
              placeholder="nhap@email.com"
            />
            {errors.email ? (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.email.message}</p>
            ) : null}
          </div>

          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">Số điện thoại</label>
            <input
              type="tel"
              {...register("phone")}
              className="input-dark"
              placeholder="0901234567"
            />
            {errors.phone ? (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.phone.message}</p>
            ) : null}
          </div>

          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              type="password"
              {...register("password")}
              className="input-dark"
              placeholder="••••••••"
            />
            {errors.password ? (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.password.message}</p>
            ) : null}
          </div>

          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">Xác nhận mật khẩu</label>
            <input
              type="password"
              {...register("confirmPassword")}
              className="input-dark"
              placeholder="••••••••"
            />
            {errors.confirmPassword ? (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 mt-4 flex justify-center items-center"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <p className="theme-text-muted mt-6 text-center text-sm">
          Đã có tài khoản?{" "}
          <Link href="/auth/login" className="theme-link transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
