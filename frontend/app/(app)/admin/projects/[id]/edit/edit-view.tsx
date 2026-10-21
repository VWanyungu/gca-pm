"use client";

import { useAdminProject } from "@/components/admin/use-admin-projects-data";
import { ProjectForm } from "@/components/admin/project-form";

export default function EditProjectView({ projectId }: { projectId: string }) {
  const { data, isLoading } = useAdminProject(projectId);

  if (isLoading) return <main className="w-full p-[40px] text-[14px] text-gca-muted">Loading project…</main>;
  if (!data) return <main className="w-full p-[40px] text-[14px] text-gca-muted">Project not found</main>;

  return (
    <main className="w-full max-w-[1200px] p-[40px]">
      <ProjectForm project={data.project} stages={data.stages} />
    </main>
  );
}
