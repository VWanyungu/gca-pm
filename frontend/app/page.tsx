"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p className="text-gray-500 mb-6">Welcome to Gas Connect Africa</p>
        <button
          onClick={logout}
          className="rounded-lg bg-gca-green px-6 py-2 text-sm font-medium text-white hover:bg-gca-green-hover"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
