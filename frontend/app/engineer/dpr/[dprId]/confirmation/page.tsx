"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useDpr } from "@/components/weekly-submission/use-weekly-submission-data";

export default function DprConfirmationPage({ params }: { params: Promise<{ dprId: string }> }) {
  const { dprId } = use(params);
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const { data: dpr } = useDpr(projectId ?? "", dprId);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[16px] p-[24px] text-center">
      <CheckCircle2 className="h-[56px] w-[56px] text-gca-green" />
      <p className="text-[20px] font-semibold text-gca-dark">DPR submitted</p>
      {dpr?.dpr_ref && <p className="text-[14px] text-gca-muted">Reference {dpr.dpr_ref}</p>}
      {dpr?.submitted_at && (
        <p className="text-[13px] text-gca-muted">
          Submitted{" "}
          {new Date(dpr.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          {dpr.is_late ? " · late" : ""}
        </p>
      )}
      <div className="flex w-full max-w-[326px] flex-col gap-[12px] pt-[12px]">
        {projectId && (
          <Link
            href={`/projects/${projectId}/dpr/${dprId}`}
            className="flex items-center justify-center rounded-[8px] bg-gca-green py-[13px]"
          >
            <p className="text-[15px] font-semibold text-white">View DPR</p>
          </Link>
        )}
        <Link
          href="/engineer"
          className="flex items-center justify-center rounded-[8px] border border-gca-border bg-white py-[13px]"
        >
          <p className="text-[15px] font-semibold text-gca-dark">Back to home</p>
        </Link>
      </div>
    </div>
  );
}
