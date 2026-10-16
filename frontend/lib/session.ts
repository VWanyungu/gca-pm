const REDIRECT_KEY = "postLoginRedirect";

export function saveRedirectPath() {
  const path = window.location.pathname + window.location.search;
  if (path !== "/login") sessionStorage.setItem(REDIRECT_KEY, path);
}

export function consumeRedirectPath(): string {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  return path || "/";
}
