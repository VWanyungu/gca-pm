"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  Layers,
} from "lucide-react";
import { ProgressBar } from "./progress-bar";
import type { Project } from "@/app/(app)/page";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  complete: "Complete",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

const STATUS_GLASS_STYLES: Record<string, string> = {
  complete: "bg-emerald-600/35 border-emerald-400/50 text-white",
  active: "bg-emerald-600/35 border-emerald-400/50 text-white",
  on_hold: "bg-amber-600/35 border-amber-400/50 text-white",
  cancelled: "bg-red-600/35 border-red-400/50 text-white",
};

function toSentenceCase(str: string): string {
  if (!str) return "";
  if (str === "PMC" || str === "DPR") return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const DEFAULT_PROJECT_PHOTOS = [
  "/projects/project-1.jpg",
  "/projects/project-2.jpg",
  "/projects/project-3.jpg",
  "/projects/project-4.jpg",
  "/projects/project-5.jpg",
  "/projects/project-6.jpg",
];

function getProjectPhotos(project: Project, index: number = 0): string[] {
  // If the project has uploaded banner photos, use them
  if (project.bannerPhotos && project.bannerPhotos.length > 0) {
    return project.bannerPhotos;
  }

  // Deterministic fallback based on project ID characters or index so each project gets 4 distinct slides
  const seed = project.id
    ? project.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    : index;
  const start = Math.abs(seed) % DEFAULT_PROJECT_PHOTOS.length;
  const photos: string[] = [];
  for (let i = 0; i < 4; i++) {
    photos.push(DEFAULT_PROJECT_PHOTOS[(start + i) % DEFAULT_PROJECT_PHOTOS.length]);
  }
  return photos;
}

export function ProjectCard({
  project,
  canEdit,
  index = 0,
}: {
  project: Project;
  canEdit: boolean;
  index?: number;
}) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const photos = getProjectPhotos(project, index);

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const spiTextColor =
    project.spi === null
      ? "text-gca-muted"
      : project.spi < 0.95
        ? "text-gca-warning"
        : "text-gca-green";

  const spiLabel =
    project.spi !== null ? `SPI ${project.spi.toFixed(2)}` : "SPI n/a";

  const nextMilestoneLabel =
    project.status === "on_hold"
      ? "Paused"
      : project.nextMilestone
        ? `Next: ${project.nextMilestone}`
        : "Next: —";

  function copyProjectLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/projects/${project.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setMenuOpen(false);
    }, 1200);
  }

  return (
    <div
      data-node-id="460:267"
      className="group relative flex flex-col rounded-[16px] border border-gca-border bg-gca-page-bg p-[6px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gca-border/80"
    >
      <div className="flex flex-col rounded-[12px] border border-gca-border bg-gca-surface overflow-hidden shadow-xs">
        {/* Photo + Carousel */}
        <div className="relative h-[168px] w-full overflow-hidden bg-gca-page-bg select-none">
          {/* Slides Track */}
          <div
            className="flex h-full w-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentPhoto * 100}%)` }}
          >
            {photos.map((src, i) => (
              <div key={i} className="relative h-full w-full shrink-0">
                <Image
                  src={src}
                  alt={`${project.name} photo ${i + 1}`}
                  fill
                  priority={i === 0 && index < 3}
                  unoptimized={src.startsWith("data:") || src.startsWith("http")}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover select-none transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
            ))}
          </div>

          {/* Status Badge (Overlay on Photo) */}
          {project.status !== "active" && (
            <div
              className={`absolute top-[12px] left-[12px] z-10 flex items-center rounded-full border px-[9px] py-[3.5px] backdrop-blur-md shadow-xs ${
                STATUS_GLASS_STYLES[project.status] ??
                "bg-white/20 border-white/30 text-white"
              }`}
            >
              <span className="text-[11.5px] font-medium leading-none">
                {STATUS_LABELS[project.status] ?? project.status}
              </span>
            </div>
          )}

          {/* Carousel Controls */}
          <div className="absolute bottom-[10px] left-[10px] right-[10px] z-10 flex items-center justify-between pointer-events-none">
            {/* Slide indicator: Glass pill with white dots */}
            <div className="pointer-events-auto flex items-center gap-[4px] rounded-full bg-white/20 px-[8px] py-[5px] backdrop-blur-md border border-white/30 shadow-xs">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentPhoto(i);
                  }}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-[4px] rounded-full transition-all duration-300 ease-out ${
                    i === currentPhoto
                      ? "w-[12px] bg-white"
                      : "w-[4px] bg-white/60 hover:bg-white"
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons: rounded-full glass, white border, small as possible */}
            <div className="pointer-events-auto flex items-center gap-[5px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPhoto(
                    (prev) => (prev - 1 + photos.length) % photos.length
                  );
                }}
                aria-label="Previous photo"
                className="flex size-[20px] items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md shadow-xs transition-all duration-150 hover:bg-white/35 hover:border-white/50 active:scale-90"
              >
                <ChevronLeft className="size-[11px] stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPhoto((prev) => (prev + 1) % photos.length);
                }}
                aria-label="Next photo"
                className="flex size-[20px] items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md shadow-xs transition-all duration-150 hover:bg-white/35 hover:border-white/50 active:scale-90"
              >
                <ChevronRight className="size-[11px] stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="flex flex-col gap-[12px] pt-[16px] px-[20px] pb-[16px]">
          {/* Title row */}
          <div className="flex items-center justify-between gap-[10px]">
            <Link
              href={`/projects/${project.id}`}
              className="truncate text-[15.5px] font-semibold tracking-[-0.15px] text-gca-dark transition-colors hover:text-gca-green"
              title={project.name}
            >
              {project.name}
            </Link>

            {/* More options menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                aria-label="More options"
                className="flex size-[28px] items-center justify-center rounded-[6px] text-gca-show transition-colors hover:bg-gca-page-bg hover:text-gca-dark"
              >
                <MoreHorizontal className="size-[16px]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-[32px] z-30 w-[180px] rounded-[10px] border border-gca-border bg-gca-surface p-[4px] shadow-lg animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    href={`/projects/${project.id}`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-[12.5px] text-gca-dark transition-colors hover:bg-gca-page-bg"
                  >
                    <ExternalLink className="size-[14px] text-gca-show" />
                    <span>View project</span>
                  </Link>

                  <Link
                    href={`/projects/${project.id}/milestones`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-[12.5px] text-gca-dark transition-colors hover:bg-gca-page-bg"
                  >
                    <Calendar className="size-[14px] text-gca-show" />
                    <span>Milestones</span>
                  </Link>

                  <Link
                    href={`/projects/${project.id}/stages`}
                    onClick={() => setMenuOpen(false)}
                    className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-[12.5px] text-gca-dark transition-colors hover:bg-gca-page-bg"
                  >
                    <Layers className="size-[14px] text-gca-show" />
                    <span>Stages pipeline</span>
                  </Link>

                  {canEdit && (
                    <Link
                      href={`/projects/${project.id}/settings`}
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-[12.5px] text-gca-dark transition-colors hover:bg-gca-page-bg"
                    >
                      <Pencil className="size-[14px] text-gca-show" />
                      <span>Project settings</span>
                    </Link>
                  )}

                  <div className="my-[3px] border-t border-gca-border" />

                  <button
                    type="button"
                    onClick={copyProjectLink}
                    className="flex w-full items-center gap-[8px] rounded-[6px] px-[10px] py-[7px] text-[12.5px] text-gca-dark transition-colors hover:bg-gca-page-bg"
                  >
                    {copied ? (
                      <>
                        <Check className="size-[14px] text-gca-green" />
                        <span className="text-gca-green font-medium">Link copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-[14px] text-gca-show" />
                        <span>Copy link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Meta row: Client + Phase tag + SPI pill */}
          <div className="flex min-w-0 items-center justify-between gap-[8px]">
            <span
              className="min-w-0 truncate text-[12.5px] text-gca-show"
              title={project.client}
            >
              {project.client}
            </span>

            <div className="flex shrink-0 items-center gap-[8px]">
              <span className="shrink-0 rounded-[4px] bg-gca-badge-bg px-[8px] py-[2px] text-[11px] font-medium text-gca-badge-text">
                {toSentenceCase(project.stage)}
              </span>

              <span
                className={`shrink-0 text-[12px] font-medium tracking-tight ${spiTextColor}`}
              >
                {spiLabel}
              </span>
            </div>
          </div>

          {/* Progress Indicator - Maintained as in current implementation */}
          <div className="flex flex-col gap-[8px]">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-gca-dark">
                Completed {Math.round(project.completed)}%
              </span>
              <span className="text-gca-muted">
                Planned {Math.round(project.planned)}%
              </span>
            </div>
            <ProgressBar completed={project.completed} planned={project.planned} />
          </div>

          {/* Next milestone */}
          <div className="flex items-center gap-[6px] text-gca-muted">
            <Flag className="size-[13px] shrink-0 stroke-[2] text-gca-muted" />
            <span
              title={project.nextMilestone ?? undefined}
              className="truncate text-[12.5px] text-gca-muted"
            >
              {nextMilestoneLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
