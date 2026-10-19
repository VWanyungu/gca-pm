"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Plus, X } from "lucide-react";
import { uploadDprPhoto } from "../use-dpr-wizard-data";
import type { DprDraftInput } from "../types";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
}

const MAX_PHOTOS = 20;
const MAX_EDGE = 1600;

async function resizeToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotosStep({ draft, update, projectId }: StepProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const atLimit = draft.photos.length >= MAX_PHOTOS;

  function updateCaption(index: number, caption: string) {
    update({
      photos: draft.photos.map((p, i) => (i === index ? { ...p, caption: caption || null } : p)),
    });
  }

  function removePhoto(index: number) {
    update({ photos: draft.photos.filter((_, i) => i !== index) });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const remaining = MAX_PHOTOS - draft.photos.length;
      for (const file of Array.from(files).slice(0, remaining)) {
        const dataUrl = await resizeToJpegDataUrl(file);
        const { file_id, url } = await uploadDprPhoto(projectId, { file: dataUrl, filename: file.name });
        update({ photos: [...draft.photos, { file_id, url, caption: null }] });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-2 gap-[16px]">
        {draft.photos.map((photo, index) => (
          <div key={photo.file_id} className="flex flex-col gap-[6px]">
            <div className="relative h-[128px] w-full overflow-hidden rounded-[8px] bg-gca-badge-bg">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote upload host, not configured in next/image */}
              <img src={photo.url} alt={photo.caption ?? ""} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label="Remove photo"
                className="absolute right-[6px] top-[6px] flex size-[22px] cursor-pointer items-center justify-center rounded-full bg-black/60"
              >
                <X className="size-[12px] text-white" />
              </button>
            </div>
            <input
              value={photo.caption ?? ""}
              onChange={(e) => updateCaption(index, e.target.value)}
              placeholder="Caption"
              className="h-[32px] w-full rounded-[6px] border border-gca-border bg-white px-[8px] text-[12px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
            />
          </div>
        ))}

        {!atLimit && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label={uploading ? "Uploading photo" : "Add photo"}
            className="flex h-[128px] w-full cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[8px] border border-dashed border-gca-border disabled:opacity-50"
          >
            {uploading ? (
              <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Plus className="size-[14px] text-gca-green" />
                <p className="text-[13px] font-medium text-gca-green">Add photo</p>
              </>
            )}
          </button>
        )}
      </div>

      {atLimit && <p className="text-[13px] text-gca-muted">Maximum of {MAX_PHOTOS} photos reached.</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
