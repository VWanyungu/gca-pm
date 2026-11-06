"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, X, ExternalLink } from "lucide-react";
import type { DprPhoto } from "./types";

interface ProgressPhotosSectionProps {
  projectId: string;
  photos: DprPhoto[];
  totalCount: number;
}

function formatPhotoDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export function ProgressPhotosSection({
  projectId,
  photos,
  totalCount,
}: ProgressPhotosSectionProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<DprPhoto | null>(null);

  if (photos.length === 0) {
    return (
      <section className="flex w-full flex-col gap-[16px] pb-[20px]">
        <div className="flex w-full flex-wrap items-center justify-between gap-[8px]">
          <div className="flex items-center gap-[10px]">
            <h3 className="text-[16px] font-semibold text-gca-dark">Progress photos</h3>
            <span className="text-[13px] text-gca-muted">from daily progress reports</span>
          </div>
          <Link
            href={`/projects/${projectId}/dpr`}
            className="flex items-center gap-[4px] text-[13px] font-medium text-gca-green hover:underline"
          >
            DPRs
            <ChevronRight className="size-[16px]" />
          </Link>
        </div>
        <div className="flex h-[180px] w-full flex-col items-center justify-center rounded-[12px] border border-dashed border-gca-border bg-gca-surface p-[24px] text-center">
          <p className="text-[14px] text-gca-muted">
            No progress photos have been attached to daily reports yet.
          </p>
          <Link
            href={`/projects/${projectId}/dpr`}
            className="mt-[10px] text-[13px] font-medium text-gca-green hover:underline"
          >
            Go to Daily Progress Reports &rarr;
          </Link>
        </div>
      </section>
    );
  }

  const primaryPhoto = photos[0];
  const secondaryPhotos = photos.slice(1, 5);

  return (
    <section className="flex w-full flex-col gap-[16px] pb-[20px]">
      {/* Header */}
      <div className="flex w-full flex-wrap items-center justify-between gap-[8px]">
        <div className="flex items-center gap-[10px]">
          <h3 className="text-[16px] font-semibold text-gca-dark">Progress photos</h3>
          <span className="text-[13px] text-gca-muted">
            {totalCount} from daily progress reports
          </span>
        </div>
        <Link
          href={`/projects/${projectId}/dpr`}
          className="flex items-center gap-[4px] text-[13px] font-medium text-gca-green hover:underline"
        >
          All photos
          <ChevronRight className="size-[16px]" />
        </Link>
      </div>

      {/* Grid matching Figma frame 473:278 */}
      <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2">
        {/* Left Column: Primary large photo */}
        {primaryPhoto && (
          <div
            onClick={() => setSelectedPhoto(primaryPhoto)}
            className="group flex cursor-pointer flex-col gap-[8px]"
          >
            <div className="relative h-[240px] sm:h-[300px] lg:h-[318px] w-full overflow-hidden rounded-[10px] bg-gca-page-bg">
              <Image
                src={primaryPhoto.url}
                alt={primaryPhoto.caption ?? "Progress photo"}
                fill
                sizes="(max-width: 1024px) 100vw, 552px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                unoptimized={
                  primaryPhoto.url.startsWith("data:") ||
                  primaryPhoto.url.startsWith("blob:")
                }
              />
            </div>
            <div className="flex flex-col gap-[2px]">
              <p className="line-clamp-1 text-[13px] font-medium text-gca-dark group-hover:text-gca-green">
                {primaryPhoto.caption || "Daily progress record"}
              </p>
              <p className="font-mono text-[11.5px] text-gca-muted">
                {formatPhotoDate(primaryPhoto.report_date)}
                {primaryPhoto.uploader_name && ` · ${primaryPhoto.uploader_name}`}
              </p>
            </div>
          </div>
        )}

        {/* Right Column: 2x2 grid for up to 4 recent photos */}
        {secondaryPhotos.length > 0 ? (
          <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
            {secondaryPhotos.map((photo) => (
              <div
                key={photo.photo_id}
                onClick={() => setSelectedPhoto(photo)}
                className="group flex cursor-pointer flex-col gap-[8px]"
              >
                <div className="relative h-[140px] sm:h-[128px] w-full overflow-hidden rounded-[10px] bg-gca-page-bg">
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? "Progress photo"}
                    fill
                    sizes="(max-width: 640px) 100vw, 268px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized={
                      photo.url.startsWith("data:") ||
                      photo.url.startsWith("blob:")
                    }
                  />
                </div>
                <div className="flex flex-col gap-[2px]">
                  <p className="line-clamp-1 text-[13px] font-medium text-gca-dark group-hover:text-gca-green">
                    {photo.caption || "Daily progress record"}
                  </p>
                  <p className="font-mono text-[11.5px] text-gca-muted">
                    {formatPhotoDate(photo.report_date)}
                    {photo.uploader_name && ` · ${photo.uploader_name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder slots if only 1 photo exists */
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-[10px] border border-dashed border-gca-border bg-gca-surface p-[20px] text-center">
            <p className="text-[13px] text-gca-muted">
              Additional progress photos will appear here as daily reports are submitted.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-[20px] backdrop-blur-sm"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative flex max-h-[90vh] max-w-[900px] w-full flex-col overflow-hidden rounded-[14px] bg-gca-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-[55vh] w-full bg-black">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.caption ?? "Progress photo full view"}
                fill
                sizes="900px"
                className="object-contain"
                unoptimized={
                  selectedPhoto.url.startsWith("data:") ||
                  selectedPhoto.url.startsWith("blob:")
                }
              />
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Close"
                className="absolute right-[16px] top-[16px] flex size-[32px] items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/90"
              >
                <X className="size-[18px]" />
              </button>
            </div>
            <div className="flex items-center justify-between p-[20px]">
              <div className="flex flex-col gap-[4px]">
                <h4 className="text-[16px] font-semibold text-gca-dark">
                  {selectedPhoto.caption || "Daily progress photo"}
                </h4>
                <p className="font-mono text-[13px] text-gca-muted">
                  {formatPhotoDate(selectedPhoto.report_date)}
                  {selectedPhoto.uploader_name && ` · ${selectedPhoto.uploader_name}`}
                </p>
              </div>
              <Link
                href={`/projects/${projectId}/dpr/${selectedPhoto.dpr_id}`}
                className="flex items-center gap-[6px] rounded-[8px] bg-gca-badge-bg px-[12px] py-[8px] text-[13px] font-medium text-gca-badge-text hover:bg-gca-green hover:text-white transition"
              >
                View DPR
                <ExternalLink className="size-[14px]" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

