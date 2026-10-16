"use client";

import { useState } from "react";
import { useSubmissionPhotos, setSubmissionPhotos, useWeeklySubmissionInvalidate } from "./use-weekly-submission-data";

function formatTakenAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function DprPhotosSection({ projectId, submissionId }: { projectId: string; submissionId: string }) {
  const { data: photos = [] } = useSubmissionPhotos(projectId, submissionId);
  const invalidate = useWeeklySubmissionInvalidate(projectId);
  const [pending, setPending] = useState<string | null>(null);

  async function setSelection(photoIds: string[]) {
    setPending("saving");
    await setSubmissionPhotos(projectId, submissionId, photoIds);
    invalidate();
    setPending(null);
  }

  function toggle(photoId: string) {
    const current = photos.filter((p) => p.selected).map((p) => p.photo_id);
    const next = current.includes(photoId) ? current.filter((id) => id !== photoId) : [...current, photoId];
    setSelection(next);
  }

  const selectedCount = photos.filter((p) => p.selected).length;

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[24px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-gca-dark">DPR photos</h3>
          <p className="mt-[2px] text-[13px] text-gca-show">
            Pick which of this week&apos;s site photos go out as part of the report.
          </p>
        </div>
        {photos.length > 0 && (
          <div className="flex gap-[12px] text-[13px] font-medium text-gca-green">
            <button onClick={() => setSelection(photos.map((p) => p.photo_id))} className="cursor-pointer">
              Select all
            </button>
            <button onClick={() => setSelection([])} className="cursor-pointer">
              Clear
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No photos on this week&apos;s DPRs yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-[16px]">
            {photos.map((photo) => (
              <button
                key={photo.photo_id}
                onClick={() => toggle(photo.photo_id)}
                disabled={pending === "saving"}
                className="flex flex-col gap-[8px] text-left disabled:opacity-60"
              >
                <div className="relative aspect-video w-full rounded-[8px] bg-gca-badge-bg">
                  <span
                    className={`absolute left-[8px] top-[8px] flex size-[20px] items-center justify-center rounded-[5px] border ${
                      photo.selected ? "border-gca-green bg-gca-green" : "border-white bg-white/80"
                    }`}
                  >
                    {photo.selected && <span className="size-[8px] rounded-[2px] bg-white" />}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-gca-dark">{photo.caption || photo.site_location}</p>
                <p className="text-[12px] text-gca-muted">{formatTakenAt(photo.taken_at)}</p>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-gca-muted">{selectedCount} of {photos.length} photos selected</p>
        </>
      )}
    </div>
  );
}
