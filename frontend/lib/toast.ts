export interface ToastItem {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 1;

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function reportError(message: string, options?: { actionLabel?: string; onAction?: () => void }) {
  const id = nextId++;
  toasts = [...toasts, { id, message, actionLabel: options?.actionLabel, onAction: options?.onAction }];
  emit();
  setTimeout(() => dismissToast(id), 6000);
}
