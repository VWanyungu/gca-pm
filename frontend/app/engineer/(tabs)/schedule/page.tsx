"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEngineerProjects } from "@/components/engineer-dpr/use-dpr-wizard-data";
import { PageSpinner } from "@/components/page-spinner";

/** No dedicated mobile schedule design exists for this Figma selection — hand off to the project's existing schedule page. */
export default function EngineerSchedulePage() {
  const router = useRouter();
  const { data: projects } = useEngineerProjects();
  const primaryProject = projects?.[0];

  useEffect(() => {
    if (primaryProject) router.replace(`/projects/${primaryProject.project_id}/schedule`);
  }, [primaryProject, router]);

  return <PageSpinner className="flex-1 p-[40px]" />;
}
