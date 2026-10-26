"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError(null);
    setSubmitting(true);

    const res = await api.post<{ resetLink: string }>("/forgot-password", {
      email,
    });

    setSubmitting(false);
    if (res.status === "success") {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-[24px]">
          <div className="flex size-[48px] items-center justify-center rounded-full bg-gca-badge-bg">
            <Mail className="size-[24px] text-gca-green" />
          </div>
          <h1 className="text-[32px] font-semibold tracking-[-0.8px] text-gca-dark">
            Check your email
          </h1>
          <p className="text-[15px] text-gca-muted">
            We sent a password reset link to{" "}
            <span className="font-medium text-gca-dark">{email}</span>
          </p>
          <Link
            href="/login"
            className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green hover:underline"
          >
            <ArrowLeft className="size-[14px]" />
            Back to sign in
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
            Forgot password?
          </h1>
          <p className="mt-[8px] text-[15px] text-gca-muted">
            Enter your email and we&rsquo;ll send you a reset link.
          </p>
        </div>

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="email" className="text-[13px] font-semibold text-gca-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@gca.co.ke"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            aria-invalid={!!emailError}
            className={`w-full rounded-[8px] border bg-gca-surface px-[14px] py-[13px] text-[15px] text-gca-dark placeholder:text-gca-muted outline-none focus:border-gca-green focus:ring-1 focus:ring-gca-green ${
              emailError ? "border-error-border" : "border-gca-border"
            }`}
          />
          {emailError && <span className="text-[12px] text-error-text">{emailError}</span>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          onClick={handleSubmit}
          className="cursor-pointer w-full flex items-center justify-center rounded-[8px] bg-gca-green px-[16px] py-[14px] text-[15px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
          ) : (
            "Send reset link"
          )}
        </button>
      </div>
    </AuthLayout>
  );
}
