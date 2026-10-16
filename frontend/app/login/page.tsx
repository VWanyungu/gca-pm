"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/hooks/use-auth";
import { consumeRedirectPath } from "@/lib/session";

export default function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(consumeRedirectPath());
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await login(email, password);
    setSubmitting(false);
    // On success the `isAuthenticated` effect above handles the redirect.
    if (err) setError(err);
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-[24px]">
        <h1 className="text-[32px] font-semibold leading-normal tracking-[-0.8px] text-gca-dark">
          Sign in
        </h1>

        {error && (
          <div className="rounded-[8px] bg-error-bg px-[14px] py-[12px] text-[14px] font-medium text-error-text">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label htmlFor="email" className="font-medium text-[13px] text-gca-dark">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="name@gca.co.ke"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[8px] border border-gca-border bg-white px-[14px] py-[13px] text-[15px] text-gca-dark placeholder:text-gca-muted outline-none focus:border-gca-green focus:ring-1 focus:ring-gca-green"
            />
          </div>

          <div className="flex flex-col gap-[6px]">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="font-medium text-[13px] text-gca-dark">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[13px] font-medium text-gca-green hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-[8px] border bg-white px-[14px] py-[13px] pr-[70px] text-[15px] text-gca-dark placeholder:text-gca-muted outline-none focus:ring-1 ${
                  error
                    ? "border-[1.5px] border-error-border focus:border-error-border focus:ring-error-border"
                    : "border-gca-border focus:border-gca-green focus:ring-gca-green"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-[14px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[13px] font-medium text-gca-show hover:text-gca-dark"
              >
                {showPassword ? (
                  <EyeOff className="size-[14px]" />
                ) : (
                  <Eye className="size-[14px]" />
                )}
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[14px]">
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSubmit}
            className="cursor-pointer flex w-full items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[14px] text-[15px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-60"
          >
            {submitting ? (
              <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
            ) : (
              "Sign in"
            )}
          </button>

          <div className="flex items-center gap-[12px]">
            <div className="h-px flex-1 bg-gca-border" />
            <span className="text-[12px] text-gca-muted">or</span>
            <div className="h-px flex-1 bg-gca-border" />
          </div>

          <button
            type="button"
            className="cursor-pointer flex w-full items-center justify-center gap-[10px] rounded-[8px] border border-gca-border bg-white px-[16px] py-[14px] text-[15px] font-semibold text-gca-dark hover:bg-gray-50"
          >
            <MicrosoftIcon />
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="0" y="0" width="8" height="8" fill="#F25022" />
      <rect x="10" y="0" width="8" height="8" fill="#7FBA00" />
      <rect x="0" y="10" width="8" height="8" fill="#00A4EF" />
      <rect x="10" y="10" width="8" height="8" fill="#FFB900" />
    </svg>
  );
}
