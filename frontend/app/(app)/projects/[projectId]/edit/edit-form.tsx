"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ProjectStepper, type WizardStep } from "@/components/project-wizard/stepper";
import { DetailsStep, type DetailsFormValues } from "@/components/project-wizard/details-step";
import { ArrowLeft } from "lucide-react";

const STEPS: WizardStep[] = [
  { key: "details", label: "Details", description: "Name, client, program and dates." },
  { key: "people", label: "People", description: "Main PM, Planner, engineers and client team." },
];

interface ProjectResponse {
  project: {
    project_id: string;
    name: string;
    client_name: string | null;
    program_id: number;
    expected_start_date: string | null;
    expected_end_date: string | null;
    site_location: string | null;
  };
}

export default function EditProjectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [step, setStep] = useState("details");
  const [details, setDetails] = useState<DetailsFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ProjectResponse>(`/projects/${projectId}`).then((res) => {
      if (res.status === "success" && res.data) {
        const p = res.data.project;
        setDetails({
          name: p.name,
          client_name: p.client_name ?? "",
          program_id: String(p.program_id),
          expected_start_date: p.expected_start_date?.slice(0, 10) ?? "",
          expected_end_date: p.expected_end_date?.slice(0, 10) ?? "",
          site_location: p.site_location ?? "",
        });
      } else {
        setError(res.message);
      }
    });
  }, [projectId]);

  async function save(values: DetailsFormValues) {
    setSaving(true);
    setError(null);
    const res = await api.patch(`/projects/${projectId}`, {
      name: values.name,
      client_name: values.client_name,
      program_id: Number(values.program_id),
      expected_start_date: values.expected_start_date,
      expected_end_date: values.expected_end_date || null,
      site_location: values.site_location || null,
    });
    setSaving(false);
    if (res.status !== "success") {
      setError(res.message);
      return;
    }
    setDetails(values);
  }

  if (!details) return null;

  return (
    <main className="flex flex-col gap-[40px] px-[120px] pb-[48px] pt-[40px]">
      <div className="flex flex-col gap-[8px]">
        <Link
          // href={`/projects/${projectId}`}
          href={`/`}
          className="flex gap-[6px] items-center text-[14px] font-medium text-gca-show"
        >
          <ArrowLeft className="size-[14px]" /> {details.name}
        </Link>
        <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">Edit project</h1>
      </div>

      {error && (
        <div className="rounded-[8px] bg-error-bg px-[14px] py-[12px] text-[14px] font-medium text-error-text">
          {error}
        </div>
      )}

      <div className="flex gap-[64px]">
        <ProjectStepper
          steps={STEPS}
          currentKey={step}
          mode="edit"
          completedKeys={["details"]}
          onStepClick={setStep}
        />

        {step === "details" && (
          <DetailsStep
            defaultValues={details}
            onCancel={() => router.push(`/projects/${projectId}`)}
            nextLabel="Next: People"
            onNext={() => setStep("people")}
            onSave={save}
            saving={saving}
          />
        )}

        {step === "people" && (
          <div className="flex w-[640px] flex-col gap-[16px]">
            <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-gca-dark">
              Assign people
            </h2>
            <p className="text-[14px] text-gca-show">Contact Admin to manage project team</p>
            <button
              type="button"
              onClick={() => setStep("details")}
              className="flex gap-[6px] items-center cursor-pointer self-start text-[14px] font-medium text-gca-show"
            >
              <ArrowLeft className="size-[14px]" /> Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
