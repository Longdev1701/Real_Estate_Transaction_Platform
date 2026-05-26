"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);

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
      const { confirmPassword: _confirmPassword, phone, ...payload } = data;

      await api.post("/auth/register", {
        ...payload,
        ...(phone ? { phone } : {}),
      });
      router.push("/auth/login");
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Đăng ký</h1>
        <p className="text-gray-400 text-center mb-8">Tham gia TrustEstate ngay hôm nay</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Họ tên
            </label>
            <input
              type="text"
              {...register("fullName")}
              className="input-dark"
              placeholder="Nguyễn Văn A"
            />
            {errors.fullName && (
              <p className="text-red-400 text-sm mt-1">{errors.fullName.message}</p>
            )}
          </div>

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
              Số điện thoại
            </label>
            <input
              type="tel"
              {...register("phone")}
              className="input-dark"
              placeholder="0901234567"
            />
            {errors.phone && (
              <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              {...register("confirmPassword")}
              className="input-dark"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3 mt-4 flex justify-center items-center"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Đã có tài khoản?{" "}
          <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
