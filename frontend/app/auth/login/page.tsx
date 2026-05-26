"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const { setAccessToken, setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

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
      const accessToken = loginResponse.data.data.tokens.accessToken;

      setAccessToken(accessToken);

      const meResponse = await api.get("/auth/me");
      setAuth(normalizeUser(meResponse.data.data), accessToken);
      router.push("/");
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đăng nhập thất bại");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Đăng nhập</h1>
        <p className="text-gray-400 text-center mb-8">Chào mừng trở lại TrustEstate</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="input-dark"
              placeholder="nhap@email.com"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              {...register("password")}
              className="input-dark"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
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

        <p className="text-center text-gray-400 mt-6 text-sm">
          Chưa có tài khoản?{" "}
          <Link href="/auth/register" className="text-blue-400 hover:text-blue-300">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
