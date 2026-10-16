"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "./use-notifications";
import { metaFor, dayLabel, timeLabel, PREFERENCE_GROUPS, type NotificationRow } from "./types";

type Tab = "all" | "unread" | "preferences";

function tabFrom(value: string | null): Tab {
  return value === "unread" || value === "preferences" ? value : "all";
}

export function NotificationsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = tabFrom(searchParams.get("tab"));
  const setTab = (next: Tab) => router.replace(next === "all" ? pathname : `${pathname}?tab=${next}`);
  const { data, isLoading } = useNotifications(tab === "unread" ? "unread" : "all");
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const groups = groupByDay(notifications);

  return (
    <div className="flex w-full justify-center bg-white">
      <main className="w-full max-w-[1200px] p-[40px]">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">Notification centre</h1>
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending || unreadCount === 0}
            className="text-[13px] font-medium text-gca-green disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            Mark all as read
          </button>
        </div>

        <div className="mt-[28px] flex items-end gap-[16px] border-b border-gca-border">
          <TabButton label="All" active={tab === "all"} onClick={() => setTab("all")} />
          <TabButton label={`Unread ${unreadCount}`} active={tab === "unread"} onClick={() => setTab("unread")} />
          <TabButton label="Preferences" active={tab === "preferences"} onClick={() => setTab("preferences")} />
        </div>

        <div className="mt-[32px] flex flex-col gap-[32px]">
          {tab === "preferences" ? (
            <PreferencesPanel />
          ) : isLoading ? (
            <p className="text-[14px] text-gca-show">Loading notifications…</p>
          ) : groups.length === 0 ? (
            <p className="text-[14px] text-gca-show">
              {tab === "unread" ? "You're all caught up." : "No notifications yet."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-[18px]">
                <h2 className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">{group.label}</h2>
                <div className="flex flex-col gap-[12px]">
                  {group.items.map((notification) => (
                    <NotificationCard
                      key={notification.notification_id}
                      notification={notification}
                      onMarkRead={() => markRead.mutate(notification.notification_id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-[8px] px-[4px] pb-[1px] cursor-pointer">
      <span className={`text-[14px] ${active ? "font-semibold text-gca-dark" : "text-gca-show"}`}>{label}</span>
      <div className={`h-[2px] w-full ${active ? "bg-gca-green" : "bg-transparent"}`} />
    </button>
  );
}

function groupByDay(notifications: NotificationRow[]): { label: string; items: NotificationRow[] }[] {
  const byLabel = new Map<string, NotificationRow[]>();
  for (const n of notifications) {
    const label = dayLabel(n.created_at);
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label)!.push(n);
  }
  return Array.from(byLabel.entries()).map(([label, items]) => ({ label, items }));
}

function NotificationCard({ notification, onMarkRead }: { notification: NotificationRow; onMarkRead: () => void }) {
  const meta = metaFor(notification.type_code);
  const Icon = meta.icon;
  const unread = !notification.read_at;

  return (
    <div
      onClick={unread ? onMarkRead : undefined}
      className={`flex items-start gap-[12px] rounded-[12px] border p-[16px] ${
        unread ? "border-gca-border bg-white cursor-pointer" : "border-gca-border/60 bg-white"
      }`}
    >
      <div className={`flex size-[36px] shrink-0 items-center justify-center rounded-[8px] ${meta.iconBg}`}>
        <Icon className={`size-[18px] ${meta.iconColor}`} />
      </div>
      <div className="flex flex-1 flex-col gap-[10px]">
        <div className="flex items-center justify-between gap-[12px]">
          <p className="text-[15px] font-semibold text-gca-dark">{notification.title}</p>
          <div className="flex shrink-0 items-center gap-[10px]">
            {meta.pill && (
              <span className={`rounded-[999px] px-[10px] py-[3px] text-[12px] font-medium ${meta.pill.bg} ${meta.pill.text}`}>
                {meta.pill.label}
              </span>
            )}
            <span className="whitespace-nowrap text-[13px] text-gca-show">{timeLabel(notification.created_at)}</span>
          </div>
        </div>
        <p className="text-[14px] text-gca-show">{notification.body}</p>
      </div>
    </div>
  );
}

function PreferencesPanel() {
  const { data: preferences = [], isLoading } = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  const enabledFor = (typeCode: string) => preferences.find((p) => p.type_code === typeCode)?.enabled ?? true;

  if (isLoading) return <p className="text-[14px] text-gca-show">Loading preferences…</p>;

  return (
    <div className="flex flex-col gap-[20px]">
      {PREFERENCE_GROUPS.map((group) => (
        <div key={group.heading} className="rounded-[12px] border border-gca-border px-[20px] pb-[8px] pt-[16px]">
          <p className="text-[15px] font-semibold text-gca-dark">{group.heading}</p>
          {group.items.map((item, i) => (
            <div
              key={item.type_code}
              className={`flex items-center justify-between py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <p className="text-[14px] text-gca-dark">{item.label}</p>
              <Toggle
                checked={enabledFor(item.type_code)}
                onChange={(enabled) => updatePreference.mutate({ type_code: item.type_code, enabled })}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex h-[20px] w-[36px] shrink-0 items-center rounded-full p-[2px] transition-colors cursor-pointer ${
        checked ? "bg-gca-green justify-end" : "bg-gca-border justify-start"
      }`}
    >
      <span className="size-[16px] rounded-full bg-white shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]" />
    </button>
  );
}
