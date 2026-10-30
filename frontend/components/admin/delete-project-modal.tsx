"use client";

import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
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
      <div className="m-6 md:m-0 relative w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">Delete {project.name}?</h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          This removes the project from view for everyone. Its data is kept, but this cannot be undone.
        </p>
        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteProject.isPending}
            className="relative flex items-center justify-center gap-[8px] rounded-[8px] bg-error-border px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-40"
          >
            <span className={deleteProject.isPending ? "invisible" : undefined}>Delete project</span>
            {deleteProject.isPending && (
              <LoaderCircle
                className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                aria-label="Deleting project"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
