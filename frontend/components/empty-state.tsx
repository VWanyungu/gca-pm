import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  /** Overrides the default vertical padding — pass when the surrounding card already pads itself. */
  className?: string;
}

/** The one shape every "this list/section is empty" message takes across the app: a bare
 *  (unboxed) icon, a bold title, a helpful description, and an action where one makes sense. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  const actionClassName =
    "mt-[4px] flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover";

  return (
    <div className={`flex flex-col items-center gap-[12px] text-center ${className ?? "py-[56px]"}`}>
      <Icon className="size-[40px] text-gca-muted" strokeWidth={1.5} />
      <div className="flex flex-col gap-[4px]">
        <p className="text-[16px] font-semibold text-gca-dark">{title}</p>
        {description && (
          <p className="max-w-[360px] text-[13px] text-gca-show">{description}</p>
        )}
      </div>
      {action &&
        (action.href ? (
          <Link href={action.href} className={actionClassName}>
            {ActionIcon && <ActionIcon className="size-[14px]" />}
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={actionClassName}>
            {ActionIcon && <ActionIcon className="size-[14px]" />}
            {action.label}
          </button>
        ))}
    </div>
  );
}
