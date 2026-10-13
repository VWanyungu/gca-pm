"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await api.post<{ resetLink: string }>("/forgot-password", {
      email,
    });

    setSubmitting(false);
    if (res.status === "success") {
      setSent(true);
    } else {
      setError(res.message);
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-[24px]">
          <div className="flex size-[48px] items-center justify-center rounded-full bg-[#e8f1ea]">
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

        {error && (
          <div className="rounded-[8px] bg-error-bg px-[14px] py-[12px] text-[14px] font-medium text-error-text">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-[6px]">
          <label htmlFor="email" className="text-[13px] font-semibold text-gca-dark">
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

        <button
          type="submit"
          disabled={submitting}
          onClick={handleSubmit}
          className="cursor-pointer w-full rounded-[8px] bg-gca-green px-[16px] py-[14px] text-[15px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </div>
    </AuthLayout>
  );
}
