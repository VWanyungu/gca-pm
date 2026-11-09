import { LoaderCircle } from "lucide-react";

/** A centered spinner for whole-screen/section loading states that don't yet have
 *  (or don't warrant) a skeleton shaped to their content. */
export function PageSpinner({ className = "min-h-[200px]" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`flex w-full items-center justify-center ${className}`}
    >
      <LoaderCircle className="size-[24px] animate-spin text-gca-green" />
    </div>
  );
}
