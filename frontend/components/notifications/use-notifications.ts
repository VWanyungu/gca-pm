"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import type { NotificationRow, NotificationPreferenceItem } from "./types";

const notificationKeys = {
  all: ["notifications"] as const,
  list: (filter: "all" | "unread") => ["notifications", "list", filter] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  preferences: ["notifications", "preferences"] as const,
};

export function useUnreadCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const res = await api.get<{ unreadCount: number }>("/notifications");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.unreadCount;
    },
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  });
}

export function useNotifications(filter: "all" | "unread") {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: async () => {
      const res = await api.get<{ notifications: NotificationRow[]; unreadCount: number }>(
        `/notifications${filter === "unread" ? "?filter=unread" : ""}`,
      );
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: isAuthenticated,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useNotificationPreferences() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: async () => {
      const res = await api.get<{ preferences: NotificationPreferenceItem[] }>("/notifications/preferences");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.preferences;
    },
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPreference() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type_code, enabled }: NotificationPreferenceItem) =>
      api.patch("/notifications/preferences", { type_code, enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.preferences }),
  });
}
