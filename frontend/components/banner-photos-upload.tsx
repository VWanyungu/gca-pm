"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import { Upload, X, Plus, Sparkles } from "lucide-react";

const TEMPLATE_PHOTOS = [
  { url: "/projects/project-1.jpg", label: "Gas Reticulation" },
  { url: "/projects/project-2.jpg", label: "Trench Line" },
  { url: "/projects/project-3.jpg", label: "Storage Depot" },
  { url: "/projects/project-4.jpg", label: "Commercial Towers" },
  { url: "/projects/project-5.jpg", label: "Bulk Terminal" },
  { url: "/projects/project-6.jpg", label: "Facility Site" },
];

interface BannerPhotosUploadProps {
  value: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export function BannerPhotosUpload({
  value = [],
  onChange,
  maxPhotos = 6,
}: BannerPhotosUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - value.length;
    if (remainingSlots <= 0) return;

    const filesToRead = Array.from(files).slice(0, remainingSlots);

    filesToRead.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          onChange([...value, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removePhoto(indexToRemove: number) {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  }

  function addTemplatePhoto(url: string) {
    if (value.length >= maxPhotos) return;
    if (value.includes(url)) return;
    onChange([...value, url]);
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-gca-dark">
          Project Banner Photos
        </label>
        <span className="text-[12px] text-gca-muted">
          {value.length} of {maxPhotos} photos
        </span>
      </div>

      {/* Grid of uploaded/selected photos */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-[12px]">
          {value.map((photo, index) => (
            <div
              key={index}
              className="group relative aspect-[16/10] overflow-hidden rounded-[10px] border border-gca-border bg-gca-page-bg shadow-xs"
            >
              <Image
                src={photo}
                alt={`Project photo ${index + 1}`}
                fill
                unoptimized={photo.startsWith("data:") || photo.startsWith("http")}
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Cover badge on first image */}
              {index === 0 && (
                <span className="absolute left-[6px] top-[6px] rounded-[4px] bg-[#142218]/70 px-[6px] py-[2px] text-[10px] font-medium text-white backdrop-blur-[2px]">
                  Cover
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-[6px] top-[6px] flex size-[22px] items-center justify-center rounded-full bg-black/60 text-white opacity-80 backdrop-blur-[2px] transition-all hover:bg-black hover:opacity-100"
              >
                <X className="size-[12px]" />
              </button>
            </div>
          ))}

          {/* Add more photo tile */}
          {value.length < maxPhotos && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-[16/10] flex-col items-center justify-center gap-[6px] rounded-[10px] border border-dashed border-gca-border bg-gca-page-bg/50 text-gca-show transition-all hover:border-gca-green hover:bg-gca-page-bg hover:text-gca-green"
            >
              <Plus className="size-[18px]" />
              <span className="text-[11px] font-medium">Add photo</span>
            </button>
          )}
        </div>
      )}

      {/* Upload Dropzone */}
      {value.length < maxPhotos && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-[8px] rounded-[12px] border-2 border-dashed p-[20px] text-center transition-all ${
            dragOver
              ? "border-gca-green bg-gca-page-bg"
              : "border-gca-border hover:border-gca-green hover:bg-gca-page-bg/40"
          }`}
        >
          <div className="flex size-[38px] items-center justify-center rounded-full bg-gca-page-bg text-gca-show">
            <Upload className="size-[18px]" />
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[13px] font-medium text-gca-dark">
              Click to upload or drag & drop banner photos
            </p>
            <p className="text-[11.5px] text-gca-muted">
              PNG, JPG or WEBP up to 10MB each (max {maxPhotos} photos)
            </p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Quick Pick Sample Photos */}
      <div className="flex flex-col gap-[8px] pt-[2px]">
        <div className="flex items-center gap-[6px] text-[11.5px] text-gca-muted">
          <Sparkles className="size-[12px] text-gca-green" />
          <span>Or pick from standard site project photos:</span>
        </div>
        <div className="flex flex-wrap gap-[8px]">
          {TEMPLATE_PHOTOS.map((tpl, i) => {
            const isAdded = value.includes(tpl.url);
            return (
              <button
                key={i}
                type="button"
                disabled={isAdded || value.length >= maxPhotos}
                onClick={() => addTemplatePhoto(tpl.url)}
                className={`flex items-center gap-[6px] rounded-[6px] border px-[8px] py-[4px] text-[11px] transition-all ${
                  isAdded
                    ? "border-gca-border bg-gca-page-bg text-gca-muted opacity-60 cursor-default"
                    : "border-gca-border bg-gca-surface text-gca-dark hover:border-gca-green hover:text-gca-green"
                }`}
              >
                <div className="relative size-[14px] overflow-hidden rounded-[2px]">
                  <Image
                    src={tpl.url}
                    alt={tpl.label}
                    fill
                    className="object-cover"
                    sizes="14px"
                  />
                </div>
                <span>{tpl.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
