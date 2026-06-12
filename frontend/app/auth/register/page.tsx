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
import { normalizeUser } from "@/components/auth/AuthSessionProvider";

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

const otpVerifySchema = z.object({
  code: z.string().length(6, "Mã xác thực phải gồm 6 chữ số"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;
type OtpVerifyFormValues = z.infer<typeof otpVerifySchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, user, hasHydrated } = useAuthStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  
  // Custom split OTP input state
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
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    setValue: setValueStep2,
    formState: { errors: errorsStep2, isSubmitting: isSubmittingStep2 },
  } = useForm<OtpVerifyFormValues>({
    resolver: zodResolver(otpVerifySchema),
  });

  // Sync OTP inputs to Step 2 form value
  useEffect(() => {
    if (step === 2) {
      setValueStep2("code", otp.join(""));
    }
  }, [otp, step, setValueStep2]);

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);
      setDevOtp(null);
      const { confirmPassword: _confirmPassword, phone, ...payload } = data;

      const response = await api.post("/auth/register", {
        ...payload,
        ...(phone ? { phone } : {}),
      });

      // OTP verification bypassed, backend now directly returns user & tokens
      const user = response.data.data.user;
      const accessToken = response.data.data.tokens.accessToken;
      const refreshToken = response.data.data.tokens.refreshToken;
      
      setSuccessMsg("Đăng ký thành công! Đang đăng nhập...");
      setAuth(normalizeUser(user), accessToken, refreshToken);
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
    }
  };

  const onVerifyOtpSubmit = async (data: OtpVerifyFormValues) => {
    try {
      setError(null);
      setSuccessMsg(null);
      
      const response = await api.post("/auth/confirm-register", {
        email,
        code: data.code,
      });

      const user = response.data.data.user;
      const accessToken = response.data.data.tokens.accessToken;
      const refreshToken = response.data.data.tokens.refreshToken;
      
      setSuccessMsg("Xác thực thành công! Đang đăng nhập...");
      setAuth(normalizeUser(user), accessToken, refreshToken);
      
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn.");
    }
  };

  // OTP split inputs logic
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
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">Đăng ký</h1>
        <p className="theme-text-muted mb-8 text-center">
          {step === 1 ? "Tham gia TrustEstate ngay hôm nay" : `Nhập mã xác thực đã gửi đến ${email}`}
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

        {step === 1 ? (
          <form onSubmit={handleSubmitStep1(onRegisterSubmit)} className="space-y-4">
            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Họ tên
              </label>
              <input
                type="text"
                {...registerStep1("fullName")}
                className="input-dark"
                placeholder="Nguyễn Văn A"
              />
              {errorsStep1.fullName && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errorsStep1.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                type="email"
                {...registerStep1("email")}
                className="input-dark"
                placeholder="nhap@email.com"
              />
              {errorsStep1.email && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errorsStep1.email.message}</p>
              )}
            </div>

            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Số điện thoại
              </label>
              <input
                type="tel"
                {...registerStep1("phone")}
                className="input-dark"
                placeholder="0901234567"
              />
              {errorsStep1.phone && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errorsStep1.phone.message}</p>
              )}
            </div>

            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Mật khẩu
              </label>
              <input
                type="password"
                {...registerStep1("password")}
                className="input-dark"
                placeholder="••••••••"
              />
              {errorsStep1.password && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errorsStep1.password.message}</p>
              )}
            </div>

            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium">
                Xác nhận mật khẩu
              </label>
              <input
                type="password"
                {...registerStep1("confirmPassword")}
                className="input-dark"
                placeholder="••••••••"
              />
              {errorsStep1.confirmPassword && (
                <p className="mt-1 text-sm text-[var(--danger-foreground)]">{errorsStep1.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmittingStep1}
              className="w-full btn-primary py-3 mt-4 flex justify-center items-center"
            >
              {isSubmittingStep1 ? "Đang gửi yêu cầu..." : "Đăng ký"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitStep2(onVerifyOtpSubmit)} className="space-y-4">
            <div>
              <label className="theme-input-label mb-1 block text-sm font-medium text-center">
                Mã xác thực (OTP) đăng ký
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
                {isSubmittingStep2 ? "Đang xác thực..." : "Xác thực tài khoản"}
              </button>
            </div>
          </form>
        )}

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
