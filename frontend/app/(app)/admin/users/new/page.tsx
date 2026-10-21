"use client";

import { Suspense } from "react";
import { UserForm } from "@/components/admin/user-form";
import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NewUserPage() {
  return (
    <Suspense fallback={null}>
      <NewUserPageContent />
    </Suspense>
  );
}

function NewUserPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formKey = searchParams.get("fresh") ?? "new";

  return (
    <main className="w-full max-w-[1200px] p-[40px]">
      <button
        onClick={() => router.push("/admin/users")}
        className="mb-[16px] text-[13px] font-medium text-gca-green flex gap-[6px] items-center hover: cursor-pointer"
      >
        <ArrowLeft size={18} /> Users
      </button>
      <UserForm key={formKey} />
    </main>
  );
}
