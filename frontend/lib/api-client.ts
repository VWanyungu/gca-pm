import { reportError } from "./toast";
import { saveRedirectPath } from "./session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T = unknown> {
  status: "success" | "fail" | "error";
  data: T | null;
  message: string;
  httpStatus?: number;
}

// Messages the backend uses when the access token itself is the problem (missing, expired,
// blacklisted). Anything else on a 401/403 (e.g. "Not authorized") is a permission issue,
// not a session issue.
const TOKEN_ERROR_MESSAGES = new Set([
  "Token not provided",
  "Expired or invalid token",
  "Token is blacklisted",
  "Authentication token not provided",
]);

function isTokenError(status: number, message: string): boolean {
  return status === 401 || TOKEN_ERROR_MESSAGES.has(message);
}

function getTokens() {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");
  return { token, refreshToken };
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function handleSessionExpired() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  saveRedirectPath();
  window.location.href = "/login";
}

async function refreshAccessToken(): Promise<string | null> {
  const { token, refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "api-v": "v1",
    };
    // /token authenticates the caller from the access token it is replacing. That token has
    // expired by the time we get here — the server forgives the clock on this route alone
    // (authenticateToken({ allowExpired: true })) but still checks signature and blacklist,
    // so it has to be sent rather than omitted.
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/token`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const body: ApiResponse<{ token: string }> = await res.json();
    if (body.status === "success" && body.data?.token) {
      setToken(body.data.token);
      return body.data.token;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T = unknown>(
  path: string,
  method: Method,
  body?: unknown,
  opts?: { silent?: boolean },
): Promise<ApiResponse<T>> {
  const { token } = getTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "api-v": "v1",
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    let res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let result: ApiResponse<T> = await res.json();

    if (token && isTokenError(res.status, result.message)) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        result = await res.json();
      }

      if (isTokenError(res.status, result.message)) {
        handleSessionExpired();
        return {
          status: "error",
          data: null,
          message: "Your session expired",
          httpStatus: res.status,
        };
      }
    }

    result.httpStatus = res.status;

    if ((!res.ok || result.status !== "success") && !opts?.silent) {
      reportError(result.message || "Something went wrong");
    }

    return result;
  } catch (error) {
    console.error("Error during API request:", error);
    if (!opts?.silent) reportError("An unexpected error occurred");
    return { status: "error", data: null, message: "An unexpected error occurred" };
  }
}

export const api = {
  get: <T = unknown>(path: string, opts?: { silent?: boolean }) =>
    request<T>(path, "GET", undefined, opts),
  post: <T = unknown>(path: string, body?: unknown, opts?: { silent?: boolean }) =>
    request<T>(path, "POST", body, opts),
  put: <T = unknown>(path: string, body?: unknown, opts?: { silent?: boolean }) =>
    request<T>(path, "PUT", body, opts),
  patch: <T = unknown>(path: string, body?: unknown, opts?: { silent?: boolean }) =>
    request<T>(path, "PATCH", body, opts),
  delete: <T = unknown>(path: string, body?: unknown, opts?: { silent?: boolean }) =>
    request<T>(path, "DELETE", body, opts),
};
