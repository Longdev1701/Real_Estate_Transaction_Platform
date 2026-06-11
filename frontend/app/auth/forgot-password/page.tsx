"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { api } from "@/lib/api";

const requestOtpSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const verifyOtpSchema = z.object({
  code: z.string().length(6, "Mã xác thực phải gồm 6 chữ số"),
});

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Mật khẩu mới ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type RequestOtpFormValues = z.infer<typeof requestOtpSchema>;
type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { user, hasHydrated } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  
  // Custom state for split OTP inputs
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));

  useEffect(() => {
    if (hasHydrated && user) {
      router.push("/");
    }
  }, [hasHydrated, user, router]);

  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1, isSubmitting: isSubmittingStep1 },
  } = useForm<RequestOtpFormValues>({
    resolver: zodResolver(requestOtpSchema),
  });

  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    setValue: setValueStep2,
    formState: { errors: errorsStep2, isSubmitting: isSubmittingStep2 },
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
  });

  const {
    register: registerStep3,
    handleSubmit: handleSubmitStep3,
    formState: { errors: errorsStep3, isSubmitting: isSubmittingStep3 },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Sync custom OTP array to the React Hook Form "code" field in step 2
  useEffect(() => {
    if (step === 2) {
      setValueStep2("code", otp.join(""));
    }
  }, [otp, step, setValueStep2]);

  const onRequestOtp = async (data: RequestOtpFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);
      setDevOtp(null);
      const response = await api.post("/auth/forgot-password", { email: data.email });
      setEmail(data.email);
      setSuccessMsg("Mã xác thực OTP đã được gửi thành công tới hòm thư của bạn.");
      
      if (response.data?.data?.devOtpCode) {
        setDevOtp(response.data.data.devOtpCode);
      }
      
      setOtp(Array(6).fill(""));
      setStep(2);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Yêu cầu gửi mã xác thực thất bại. Vui lòng kiểm tra lại email.");
    }
  };

  const onVerifyOtp = async (data: VerifyOtpFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);
      await api.post("/auth/verify-reset-code", {
        email,
        code: data.code,
      });
      setCode(data.code);
      setSuccessMsg("Xác thực thành công! Vui lòng thiết lập mật khẩu mới của bạn.");
      setStep(3);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn.");
    }
  };

  const onResetPassword = async (data: ResetPasswordFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);
      await api.post("/auth/reset-password", {
        email,
        code,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setSuccessMsg("Mật khẩu của bạn đã được đặt lại thành công. Đang chuyển hướng về trang đăng nhập...");
      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đặt lại mật khẩu thất bại. Vui lòng thực hiện lại từ đầu.");
    }
  };

  // OTP split input logic
  const handleOtpChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, ""); // Allow only digits
    const newOtp = [...otp];

    if (!value) {
      newOtp[index] = "";
      setOtp(newOtp);
      return;
    }

    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next input automatically
    if (element.nextSibling && index < 5) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        newOtp[index - 1] = "";
        setOtp(newOtp);
        const target = e.currentTarget.previousSibling as HTMLInputElement;
        if (target) {
          target.focus();
        }
      } else {
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      
      const container = e.currentTarget;
      const inputs = container.getElementsByTagName("input");
      if (inputs && inputs.length >= 6) {
        inputs[5].focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-160px)] p-4">
      <div className="glass-card w-full max-w-md p-6 sm:p-8">
        {/* Step Indicator */}
        <div className="flex justify-between items-center mb-6">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-colors duration-300 ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>1</div>
          <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-colors duration-300 ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>2</div>
          <div className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-800'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-colors duration-300 ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}>3</div>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">Quên mật khẩu</h1>
        <p className="theme-text-muted mb-8 text-center">
          {step === 1 && "Nhập email của bạn để nhận mã xác thực đặt lại mật khẩu"}
          {step === 2 && `Nhập mã xác thực đã gửi đến ${email}`}
          {step === 3 && "Thiết lập mật khẩu mới cho tài khoản của bạn"}
        </p>

        {error && (
          <div className="theme-button-danger-solid mb-6 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 mb-6 rounded-xl p-3 text-sm">
            {successMsg}
          </div>
        )}

        {devOtp && step === 2 && (
          <div className="bg-amber-900/40 border border-amber-500/30 text-amber-200 mb-6 rounded-xl p-3 text-sm font-mono text-center">
            Mã OTP (Development): <span className="font-bold text-lg text-amber-300">{devOtp}</span>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSubmitStep1(onRequestOtp)} className="space-y-4">
            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Email tài khoản
              </label>
              <input
                type="email"
                {...registerStep1("email")}
                className="input-dark"
                placeholder="nhap@email.com"
              />
              {errorsStep1.email && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">
                  {errorsStep1.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingStep1}
              className="w-full btn-primary py-3 mt-4 flex justify-center items-center font-medium"
            >
              {isSubmittingStep1 ? "Đang gửi..." : "Gửi mã xác thực"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmitStep2(onVerifyOtp)} className="space-y-4">
            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium text-center">
                Mã xác thực (OTP)
              </label>
              
              {/* Premium 6-digit input row */}
              <div className="flex justify-between gap-1.5 sm:gap-2 my-4" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold rounded-xl border border-gray-700 bg-gray-900/50 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <input type="hidden" {...registerStep2("code")} />
              
              {errorsStep2.code && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)] text-center">
                  {errorsStep2.code.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 btn-secondary py-3 flex justify-center items-center font-medium"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isSubmittingStep2}
                className="w-2/3 btn-primary py-3 flex justify-center items-center font-medium"
              >
                {isSubmittingStep2 ? "Đang xác thực..." : "Xác nhận mã"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmitStep3(onResetPassword)} className="space-y-4">
            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Mật khẩu mới
              </label>
              <input
                type="password"
                {...registerStep3("newPassword")}
                className="input-dark"
                placeholder="••••••••"
                autoFocus
              />
              {errorsStep3.newPassword && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">
                  {errorsStep3.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                {...registerStep3("confirmPassword")}
                className="input-dark"
                placeholder="••••••••"
              />
              {errorsStep3.confirmPassword && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">
                  {errorsStep3.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-1/3 btn-secondary py-3 flex justify-center items-center font-medium"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isSubmittingStep3}
                className="w-2/3 btn-primary py-3 flex justify-center items-center font-medium"
              >
                {isSubmittingStep3 ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
              </button>
            </div>
          </form>
        )}

        <p className="theme-text-muted mt-6 text-center text-sm">
          Nhớ mật khẩu?{" "}
          <Link href="/auth/login" className="theme-link transition-colors">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
