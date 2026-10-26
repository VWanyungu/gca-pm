"use client";

import { useState } from "react";
import {
  useSubmissionPhotos,
  setSubmissionPhotos,
  useWeeklySubmissionInvalidate,
} from "./use-weekly-submission-data";
import { Camera, Shield } from "lucide-react";
import { Pagination } from "@/components/pagination";

const DEFAULT_PER_PAGE = 6;

function formatTakenAt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DprPhotosSection({
  projectId,
  submissionId,
}: {
  projectId: string;
  submissionId: string;
}) {
  const { data: photos = [] } = useSubmissionPhotos(projectId, submissionId);
  const invalidate = useWeeklySubmissionInvalidate(projectId);
  const [pending, setPending] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);

  async function setSelection(photoIds: string[]) {
    setPending("saving");
    await setSubmissionPhotos(projectId, submissionId, photoIds);
    invalidate();
    setPending(null);
  }

  function toggle(photoId: string) {
    const current = photos.filter((p) => p.selected).map((p) => p.photo_id);
    const next = current.includes(photoId)
      ? current.filter((id) => id !== photoId)
      : [...current, photoId];
    setSelection(next);
  }

  const selectedCount = photos.filter((p) => p.selected).length;
  const totalPages = Math.max(1, Math.ceil(photos.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pagePhotos = photos.slice((currentPage - 1) * perPage, currentPage * perPage);

  function changePerPage(next: number) {
    setPerPage(next);
    setPage(1);
  }

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] bg-gca-surface py-[24px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-semibold text-gca-dark">DPR photos</h3>
          {/* <p className="mt-[2px] text-[13px] text-gca-show">
            Pick which of this week&apos;s site photos go out as part of the report.
          </p> */}
        </div>
        {photos.length > 0 && (
          <div className="flex gap-[12px] text-[13px] font-medium text-gca-green">
            <button
              onClick={() => setSelection(photos.map((p) => p.photo_id))}
              className="cursor-pointer"
            >
              Select all
            </button>
            <button onClick={() => setSelection([])} className="cursor-pointer">
              Clear
            </button>
          </div>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-[8px] rounded-[12px] bg-gca-page-bg py-[64px]">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-surface">
            <Camera className="size-[18px] text-gca-green" />
          </span>
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[15px] font-semibold text-gca-dark">
              No photos on this week&apos;s DPRs yet.
            </p>
            <p className="text-[13px] text-gca-muted">DPR photos will appear here</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-[16px]">
            {pagePhotos.map((photo) => (
              <button
                key={photo.photo_id}
                onClick={() => toggle(photo.photo_id)}
                disabled={pending === "saving"}
                className="flex flex-col gap-[8px] text-left disabled:opacity-60"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-[8px] bg-gca-badge-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external, unconfigured image hosts */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? photo.site_location}
                    className="size-full object-cover"
                  />
                  <span
                    className={`absolute left-[8px] top-[8px] flex size-[20px] items-center justify-center rounded-[5px] border ${
                      photo.selected ? "border-gca-green bg-gca-green" : "border-gca-surface bg-gca-surface/80"
                    }`}
                  >
                    {photo.selected && <span className="size-[8px] rounded-[2px] bg-gca-surface" />}
                  </span>
                </div>
                <p className="text-[13px] font-medium text-gca-dark">
                  {photo.caption || photo.site_location}
                </p>
                <p className="text-[12px] text-gca-muted">{formatTakenAt(photo.taken_at)}</p>
              </button>
            ))}
          </div>
          <p className="text-[13px] text-gca-muted">
            {selectedCount} of {photos.length} photos selected
          </p>
          {photos.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              perPage={perPage}
              total={photos.length}
              onPageChange={setPage}
              onPerPageChange={changePerPage}
              label="photos"
            />
          )}
        </>
      )}
    </div>
  );
}
