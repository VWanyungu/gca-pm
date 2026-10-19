"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft, CheckCircle, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

export default function ResetPasswordPage({ token }: { token: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = {
      password: password.length >= 6 ? undefined : "Password must be at least 6 characters",
      confirmPassword: password === confirmPassword ? undefined : "Passwords do not match",
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSubmitting(true);
    const res = await api.post(`/reset-password/${token}`, { password });
    setSubmitting(false);

    if (res.status === "success") {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-[24px]">
          <div className="flex size-[48px] items-center justify-center rounded-full bg-[#e8f1ea]">
            <CheckCircle className="size-[24px] text-gca-green" />
          </div>
          <h1 className="text-[32px] font-semibold tracking-[-0.8px] text-gca-dark">
            Password reset
          </h1>
          <p className="text-[15px] text-gca-muted">Your password has been reset successfully.</p>
          <Link
            href="/login"
            className="w-full rounded-[8px] bg-gca-green px-[16px] py-[14px] text-center text-[15px] font-semibold text-white hover:bg-gca-green-hover"
          >
            Sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-[24px]">
        <Link
          href="/login"
          className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green hover:underline"
        >
          <ArrowLeft className="size-[14px]" />
          Back to sign in
        </Link>

        <div>
          <h1 className="text-[32px] font-semibold leading-normal tracking-[-0.8px] text-gca-dark">
            Reset password
          </h1>
          <p className="mt-[8px] text-[15px] text-gca-muted">Enter your new password.</p>
        </div>

        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="password" className="text-[13px] font-medium text-gca-dark">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                aria-invalid={!!fieldErrors.password}
                className={`w-full rounded-[8px] border bg-white px-[14px] py-[13px] pr-[70px] text-[15px] text-gca-dark placeholder:text-gca-muted outline-none focus:border-gca-green focus:ring-1 focus:ring-gca-green ${
                  fieldErrors.password ? "border-error-border" : "border-gca-border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[14px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[13px] font-medium text-gca-show hover:text-gca-dark"
              >
                {showPassword ? (
                  <EyeOff className="size-[14px]" />
                ) : (
                  <Eye className="size-[14px]" />
                )}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-[12px] text-error-text">{fieldErrors.password}</span>
            )}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label htmlFor="confirm" className="text-[13px] font-medium text-gca-dark">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                aria-invalid={!!fieldErrors.confirmPassword}
                className={`w-full rounded-[8px] border bg-white px-[14px] py-[13px] pr-[70px] text-[15px] text-gca-dark placeholder:text-gca-muted outline-none focus:border-gca-green focus:ring-1 focus:ring-gca-green ${
                  fieldErrors.confirmPassword ? "border-error-border" : "border-gca-border"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-[14px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[13px] font-medium text-gca-show hover:text-gca-dark"
              >
                {showConfirm ? <EyeOff className="size-[14px]" /> : <Eye className="size-[14px]" />}
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="text-[12px] text-error-text">{fieldErrors.confirmPassword}</span>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full flex items-center justify-center rounded-[8px] bg-gca-green px-[16px] py-[14px] text-[15px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
          ) : (
            "Reset password"
          )}
        </button>
      </div>
    </AuthLayout>
  );
}
