const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T = unknown> {
  status: "success" | "fail" | "error";
  data: T | null;
  message: string;
}

function getTokens() {
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");
  return { token, refreshToken };
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-v": "v1" },
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
): Promise<ApiResponse<T>> {
  const { token } = getTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "api-v": "v1",
  };

  if (token) 
    headers["Authorization"] = `Bearer ${token}`;

  try{
    let res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 403 && token) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
      } else {
        clearTokens();
        window.location.href = "/login";
        return { status: "error", data: null, message: "Session expired" };
      }
    }

    return res.json();
  }catch (error) {
    console.error("Error during API request:", error);
    return { status: "error", data: null, message: "An unexpected error occurred" };
  }

  
}

export const api = {
  get: <T = unknown>(path: string) => request<T>(path, "GET"),
  post: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, "POST", body),
  put: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, "PUT", body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, "PATCH", body),
  delete: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, "DELETE", body),
};
