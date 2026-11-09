"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { saveRedirectPath } from "@/lib/session";

/** Gates every screen behind a valid session: renders nothing until `useAuth` confirms
 *  one, and otherwise sends the visitor to /login, remembering where they were so
 *  login can return them there (see consumeRedirectPath in app/login/page.tsx). Wrap
 *  this around a route group's layout rather than checking auth in each page. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      saveRedirectPath();
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  return <>{children}</>;
}
