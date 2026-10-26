"use client";

import { useEffect, useState } from "react";
import { Ban, X } from "lucide-react";
import { subscribeToasts, dismissToast, type ToastItem } from "@/lib/toast";

export function ErrorToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-[24px] top-[76px] z-50 flex w-[calc(100%-48px)] max-w-[460px] flex-col gap-[10px]">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center justify-between gap-[12px] rounded-[8px] bg-error-bg px-[18px] py-[16px] shadow-[0px_10px_28px_0px_rgba(23,48,31,0.08)]"
        >
          <Ban className="size-[22px] shrink-0 text-gca-dark" />
          <div className="flex flex-1 flex-wrap items-center gap-x-[6px] text-[14px]">
            <span className="text-gca-dark">{toast.message}</span>
            {toast.actionLabel && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
                className="font-medium text-gca-green underline cursor-pointer"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-gca-show hover:text-gca-dark cursor-pointer"
          >
            <X className="size-[14px]" />
          </button>
        </div>
      ))}
    </div>
  );
}
