"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { deleteFeedbackRequest, useFeedbackRequestsInvalidate } from "./use-client-feedback";
import type { FeedbackRequest } from "./types";

export function DeleteFeedbackRequestModal({
  projectId,
  request,
  onClose,
}: {
  projectId: string;
  request: FeedbackRequest;
  onClose: () => void;
}) {
  const invalidate = useFeedbackRequestsInvalidate(projectId);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await deleteFeedbackRequest(projectId, request.request_id);
      invalidate();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative m-[24px] w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)] md:m-0">
        <h2 className="text-[18px] font-semibold text-gca-dark">Delete this request?</h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          The link sent to {request.contact_name} hasn&apos;t been opened yet, so it&apos;s safe to
          withdraw. This cannot be undone.
        </p>
        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[6px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="relative flex cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-error-border px-[16px] py-[6px] text-[14px] font-medium text-gca-on-accent disabled:opacity-40"
          >
            <span className={deleting ? "invisible" : undefined}>Delete request</span>
            {deleting && (
              <LoaderCircle
                className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                aria-label="Deleting"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
