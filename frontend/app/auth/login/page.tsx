"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { normalizeUser } from "@/components/auth/AuthSessionProvider";
import { api } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";
  const { setAuth, user, hasHydrated } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasHydrated && user) {
      router.push(redirectTo);
    }
  }, [hasHydrated, user, router, redirectTo]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setError(null);
      const loginResponse = await api.post("/auth/login", data);
      const user = loginResponse.data.data.user;
      const accessToken = loginResponse.data.data.tokens.accessToken;
      setAuth(normalizeUser(user), accessToken);
      router.push(redirectTo);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <div className="glass-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Đăng nhập</h1>
        <p className="theme-text-muted mb-8 text-center">Chào mừng trở lại TrustEstate</p>

        {error && (
          <div className="theme-button-danger-solid mb-6 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="theme-input-label mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="input-dark"
              placeholder="nhap@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="theme-input-label block text-sm font-medium">
                Mật khẩu
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm theme-link transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              {...register("password")}
              className="input-dark"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 mt-4 flex justify-center items-center"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
          </button>
        </form>

        <p className="theme-text-muted mt-6 text-center text-sm">
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="theme-link transition-colors">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
