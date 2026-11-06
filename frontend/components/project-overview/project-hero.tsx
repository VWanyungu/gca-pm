"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { StatusControl } from "./status-control";
import type { ProjectDetail, StageRow, Milestone } from "./types";

interface ProjectHeroProps {
  project: ProjectDetail;
  stages: StageRow[];
  milestones: Milestone[];
  canManage: boolean;
  onStatusChanged: () => void;
}

// Fallback banner images matching the clean architectural style of the Figma mockup
const FALLBACK_BANNERS = [
  "https://images.unsplash.com/photo-1541888946425-d0fbb186156f?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1600&auto=format&fit=crop",
];

export function ProjectHero({
  project,
  stages,
  milestones,
  canManage,
  onStatusChanged,
}: ProjectHeroProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos =
    project.banner_photos && project.banner_photos.length > 0
      ? project.banner_photos
      : FALLBACK_BANNERS;

  const currentPhoto = photos[photoIndex] ?? photos[0];

  function handlePrev() {
    setPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }

  function handleNext() {
    setPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }

  // Derive facts for the project
  const isGitanga = project.name.toLowerCase().includes("gitanga");
  const inScopeStages = stages.filter((s) => s.in_scope);
  const completedStages = stages.filter((s) => s.state === "complete");
  const upcomingMilestones = milestones.filter((m) => !m.actual_date);

  const activeScopes = [
    project.is_mechanical ? "Mechanical" : null,
    project.is_civil ? "Civil" : null,
    project.is_electrical ? "Electrical" : null,
  ].filter(Boolean);

  return (
    <section className="relative z-20 h-[360px] w-full rounded-[16px]">
      {/* Background Image & Gradient overlay clipped to rounded corners */}
      <div className="absolute inset-0 overflow-hidden rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
        <Image
          src={currentPhoto}
          alt={project.name}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover transition-opacity duration-500"
          unoptimized={
            currentPhoto.startsWith("data:") ||
            currentPhoto.startsWith("blob:") ||
            currentPhoto.includes("unsplash.com")
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,26,18,0.92)] via-[rgba(13,26,18,0.45)] to-[rgba(13,26,18,0.15)]" />
      </div>

      {/* Top right: Status selector & Carousel navigation arrows */}
      <div className="absolute right-[20px] sm:right-[24px] md:right-[32px] top-[20px] sm:top-[24px] z-30 flex items-center gap-[10px]">
        {photos.length > 1 && (
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous banner photo"
              className="flex size-[32px] items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <ChevronLeft className="size-[16px]" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next banner photo"
              className="flex size-[32px] items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95"
            >
              <ChevronRight className="size-[16px]" />
            </button>
          </div>
        )}

        <StatusControl
          projectId={project.project_id}
          status={project.status}
          canManage={canManage}
          onChanged={onStatusChanged}
          variant="glass"
        />
      </div>

      {/* Hero Bottom Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-[20px] sm:p-[28px] md:p-[32px]">
        <div className="flex flex-col justify-between gap-[20px] md:flex-row md:items-end">
          {/* Identity & Facts */}
          <div className="flex min-w-0 flex-col gap-[14px]">
            {/* Title & Metadata */}
            <div className="flex flex-col gap-[8px]">
              <h1 className="truncate text-[26px] font-semibold tracking-[-0.75px] text-white drop-shadow-sm sm:text-[34px] md:text-[40px]">
                {project.name}
              </h1>

              <div className="flex flex-wrap items-center gap-[8px] text-[13px] text-white/80 sm:text-[14px]">
                <span>{project.client_name ?? "Gas Connect Africa"}</span>
                <span className="size-[3px] rounded-full bg-white/50" />
                <span className="flex items-center gap-[4px]">
                  <MapPin className="size-[13px] text-white/70" />
                  <span>{project.site_location ?? "Nairobi, Kenya"}</span>
                </span>
              </div>
            </div>

            {/* Facts Row */}
            <div className="flex items-center gap-[18px] pt-[4px]">
              {isGitanga ? (
                <>
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      3.8
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>km of</span>
                      <span>gas main</span>
                    </div>
                  </div>
                  <div className="h-[28px] w-px bg-white/20" />
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      212
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>meter</span>
                      <span>points</span>
                    </div>
                  </div>
                  <div className="h-[28px] w-px bg-white/20" />
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      3
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>retail</span>
                      <span>blocks</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      {completedStages.length}/{inScopeStages.length}
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>stages</span>
                      <span>done</span>
                    </div>
                  </div>
                  <div className="h-[28px] w-px bg-white/20" />
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      {upcomingMilestones.length}
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>upcoming</span>
                      <span>milestones</span>
                    </div>
                  </div>
                  <div className="h-[28px] w-px bg-white/20" />
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[24px] font-medium leading-none text-white sm:text-[28px]">
                      {activeScopes.length}
                    </span>
                    <div className="flex flex-col text-[11px] leading-[13px] text-white/70 sm:text-[12px] sm:leading-[14px]">
                      <span>scopes</span>
                      <span>active</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Thumbnails Strip */}
          {photos.length > 0 && (
            <div className="flex shrink-0 items-center gap-[8px]">
              {photos.slice(0, 3).map((photoUrl, idx) => {
                const isActive = idx === photoIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoIndex(idx)}
                    className={`relative h-[50px] w-[72px] overflow-hidden rounded-[8px] transition-all ${
                      isActive
                        ? "border-2 border-white ring-2 ring-black/30"
                        : "border border-white/40 opacity-75 hover:opacity-100 hover:border-white/80"
                    }`}
                  >
                    <Image
                      src={photoUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      sizes="72px"
                      className="object-cover"
                      unoptimized={
                        photoUrl.startsWith("data:") ||
                        photoUrl.startsWith("blob:") ||
                        photoUrl.includes("unsplash.com")
                      }
                    />
                  </button>
                );
              })}

              {photos.length > 3 && (
                <button
                  type="button"
                  onClick={() => setPhotoIndex(3)}
                  className="flex h-[50px] w-[72px] items-center justify-center rounded-[8px] border border-white/40 bg-black/50 text-[13px] font-medium text-white backdrop-blur-md transition hover:bg-black/70 hover:border-white/80"
                >
                  +{photos.length - 3}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

