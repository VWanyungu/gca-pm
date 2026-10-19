"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEngineerProjects } from "@/components/engineer-dpr/use-dpr-wizard-data";

/** No dedicated mobile schedule design exists for this Figma selection — hand off to the project's existing schedule page. */
export default function EngineerSchedulePage() {
  const router = useRouter();
  const { data: projects } = useEngineerProjects();
  const primaryProject = projects?.[0];

  useEffect(() => {
    if (primaryProject) router.replace(`/projects/${primaryProject.project_id}/schedule`);
  }, [primaryProject, router]);

  return <div className="flex flex-1 items-center justify-center p-[40px] text-[14px] text-gca-muted">Loading schedule…</div>;
}
