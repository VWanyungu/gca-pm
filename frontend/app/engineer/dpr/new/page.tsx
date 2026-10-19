"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEngineerProjects } from "@/components/engineer-dpr/use-dpr-wizard-data";
import { DprWizard } from "@/components/engineer-dpr/dpr-wizard";

export default function NewDprPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { data: projects, isLoading } = useEngineerProjects();

  if (projectId) {
    return <DprWizard projectId={projectId} />;
  }

  if (isLoading) return null;

  if (projects && projects.length === 1) {
    router.replace(`/engineer/dpr/new?projectId=${projects[0].project_id}`);
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
      <p className="text-[17px] font-semibold text-gca-dark">Choose a site</p>
      <div className="flex flex-col rounded-[12px] bg-white px-[16px]">
        {(projects ?? []).map((p, i) => (
          <Link
            key={p.project_id}
            href={`/engineer/dpr/new?projectId=${p.project_id}`}
            className={`flex items-center justify-between py-[14px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            <p className="text-[15px] text-gca-dark">{p.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
