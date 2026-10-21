"use client";

import { useRouter } from "next/navigation";
import type { AdminProjectListItem } from "./types";
import { useDeleteProject } from "./use-admin-projects-data";

export function DeleteProjectModal({
  project,
  onClose,
}: {
  project: AdminProjectListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const deleteProject = useDeleteProject();

  async function handleConfirm() {
    await deleteProject.mutateAsync(project.project_id);
    onClose();
    router.push("/admin/projects");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative w-[392px] max-w-full rounded-[12px] bg-white p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">Delete {project.name}?</h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          This permanently deletes the project and all its data. This cannot be undone.
        </p>
        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteProject.isPending}
            className="rounded-[8px] bg-error-border px-[16px] py-[10px] text-[14px] font-medium text-white disabled:opacity-40"
          >
            Delete project
          </button>
        </div>
      </div>
    </div>
  );
}
