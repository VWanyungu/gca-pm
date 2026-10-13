"use client";

import { createContext, useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/api-client";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post<{ token: string; refreshToken: string }>(
        "/login",
        { email, password },
      );
      if (res.status === "success" && res.data) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        setIsAuthenticated(true);
        return null;
      }
      return res.message;
    }catch (error) {
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
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext>
  );
}
