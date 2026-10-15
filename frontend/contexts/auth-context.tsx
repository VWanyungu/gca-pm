"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api-client";

export type RoleName = "PM" | "Planner" | "SiteEngineer" | "ExCo" | "Admin" | "ProjectCreator";
export type ScopeType = "global" | "program" | "project";

export interface RoleGrant {
  role: RoleName;
  scope_type: ScopeType;
  program_id: string | null;
  project_id: string | null;
}

export interface User {
  userId: string;
  firstName?: string | null;
  email: string;
  role: RoleGrant[];
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

function decodeJwtPayload(token: string): User | null {
  try {
    const base64 = token.split(".")[1];
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) 
      setUser({
        userId: localStorage.getItem("userId") ? localStorage.getItem("userId")! : "",
        firstName: localStorage.getItem("firstName") ? localStorage.getItem("firstName")! : null,
        email: localStorage.getItem("email") ? localStorage.getItem("email")! : "",
        role: JSON.parse(localStorage.getItem("role") ? localStorage.getItem("role")! : "[]"),
      });
    
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ token: string; refreshToken: string; firstName: string | null; userId: string; role: RoleGrant[]; email: string }>(
        "/login",
        { email, password },
      );
      if (res.status === "success" && res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        localStorage.setItem("userId", res.data.userId);
        localStorage.setItem("email", res.data.email);
        localStorage.setItem("firstName", res.data.firstName || "");
        localStorage.setItem("role", JSON.stringify(res.data.role));
        setUser({
          userId: res.data.userId,
          firstName: res.data.firstName,
          email: res.data.email,
          role: res.data.role,
        });
        return null;
      }

      return res.message;
    } catch (error) {
      console.error("Login error:", error);
      return "An unexpected error occurred. Please try again.";
    }
  }, []);

  const logout = useCallback(async () => {
    const token = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    if (token && refreshToken) {
      await api.post("/logout", { token, refreshToken });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  return (
    <AuthContext value={{ isAuthenticated: !!user, isLoading, user, login, logout }}>
      {children}
    </AuthContext>
  );
}
