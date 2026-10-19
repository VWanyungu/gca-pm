"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    is_mechanical: boolean;
    is_civil: boolean;
    is_electrical: boolean;
  };
}

export default function EditProjectForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState("details");
  const [draftDetails, setDraftDetails] = useState<DetailsFormValues | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: details, isLoading } = useQuery({
    queryKey: ["project", projectId, "edit"],
    queryFn: async () => {
      const res = await api.get<ProjectResponse>(`/projects/${projectId}`);
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      const project = res.data.project;
      return {
        name: project.name,
        client_name: project.client_name ?? "",
        program_id: String(project.program_id),
        expected_start_date: project.expected_start_date?.slice(0, 10) ?? "",
        expected_end_date: project.expected_end_date?.slice(0, 10) ?? "",
        site_location: project.site_location ?? "",
        is_mechanical: project.is_mechanical ?? true,
        is_civil: project.is_civil ?? false,
        is_electrical: project.is_electrical ?? false,
      } satisfies DetailsFormValues;
    },
  });

  async function save(values: DetailsFormValues) {
    setSaving(true);
    const res = await api.patch(`/projects/${projectId}`, {
      name: values.name,
      client_name: values.client_name,
      program_id: Number(values.program_id),
      expected_start_date: values.expected_start_date,
      expected_end_date: values.expected_end_date || null,
      site_location: values.site_location || null,
      is_mechanical: values.is_mechanical,
      is_civil: values.is_civil,
      is_electrical: values.is_electrical,
    });
    setSaving(false);
    if (res.status !== "success") return;
    setDraftDetails(values);
    queryClient.setQueryData(["project", projectId, "edit"], values);
  }

  if (isLoading) return <p className="p-[40px] text-[14px] text-gca-muted">Loading project…</p>;
  if (!details) return null;

  return (
    <main className="flex w-full justify-center">
      <div className="flex flex-col gap-[40px] px-[120px] pb-[48px] pt-[40px]">
        <div className="flex flex-col gap-[8px]">
          <Link
            // href={`/projects/${projectId}`}
            href={`/`}
            className="flex gap-[6px] items-center text-[14px] font-medium text-gca-show"
          >
            <ArrowLeft className="size-[14px]" /> {details.name}
          </Link>
          <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">
            Edit project
          </h1>
        </div>

        <div className="flex gap-[64px]">
          <ProjectStepper
            steps={STEPS}
            currentKey={step}
            mode="edit"
            completedKeys={["details"]}
            onStepClick={setStep}
          />

          {step === "details" && (
            <div className="w-[640px]">
              <DetailsStep
                defaultValues={draftDetails ?? details}
                onCancel={() => router.push(`/projects/${projectId}`)}
                nextLabel="Next: People"
                onNext={(values) => {
                  setDraftDetails(values);
                  setStep("people");
                }}
                onSave={save}
                saving={saving}
              />
            </div>
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
      </div>
    </main>
  );
}
