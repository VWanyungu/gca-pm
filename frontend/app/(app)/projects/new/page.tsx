"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ProjectStepper, type WizardStep } from "@/components/project-wizard/stepper";
import { DetailsStep, type DetailsFormValues } from "@/components/project-wizard/details-step";
import { ScopeStep } from "@/components/project-wizard/scope-step";
import { PeopleStep, type PeopleValues } from "@/components/project-wizard/people-step";
import { ArrowLeft } from "lucide-react";

const STEPS: WizardStep[] = [
  { key: "details", label: "Details", description: "Name, client, program and dates." },
  { key: "scope", label: "Scope", description: "The stages this project runs through." },
  { key: "people", label: "People", description: "Main PM, Planner, engineers and client team." },
];

const EMPTY_DETAILS: DetailsFormValues = {
  name: "",
  client_name: "",
  program_id: "",
  expected_start_date: "",
  expected_end_date: "",
  site_location: "",
};

const EMPTY_PEOPLE: PeopleValues = {
  pmUserId: "",
  plannerUserId: "",
  siteEngineerIds: [],
  clientTeam: [],
};

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState("details");
  const [completed, setCompleted] = useState<string[]>([]);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [scopeStages, setScopeStages] = useState<number[]>([4, 5, 6, 7]);
  const [people, setPeople] = useState(EMPTY_PEOPLE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function advance(from: string, to: string) {
    setCompleted((c) => (c.includes(from) ? c : [...c, from]));
    setStep(to);
  }

  async function createProject(): Promise<{ project: { project_id: string } }> {
    const codeRes = await api.get<{ suggested_project_code: string }>(
      `/projects/suggest-code?program_id=${details.program_id}`,
    );
    if (codeRes.status !== "success" || !codeRes.data) throw new Error(codeRes.message);

    const createRes = await api.post<{ project: { project_id: string } }>("/projects", {
      project_code: codeRes.data.suggested_project_code,
      name: details.name,
      client_name: details.client_name,
      program_id: Number(details.program_id),
      expected_start_date: details.expected_start_date,
      expected_end_date: details.expected_end_date || null,
      site_location: details.site_location || null,
      pm_user_id: people.pmUserId,
      planner_user_id: people.plannerUserId,
      scope_stages: scopeStages,
      initial_active_stages: [Math.min(...scopeStages)],
      site_engineer_user_ids: people.siteEngineerIds,
    });
    if (createRes.status !== "success" || !createRes.data) throw new Error(createRes.message);
    return createRes.data;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // suggested codes can collide under concurrent creates; the backend 409s, retry once with a fresh code
      let created;
      try {
        created = await createProject();
      } catch (err) {
        if (err instanceof Error && err.message.includes("was just taken")) {
          created = await createProject();
        } else {
          throw err;
        }
      }

      const projectId = created.project.project_id;
      try {
        await Promise.all(
          people.clientTeam.map((contact) =>
            api.post(`/projects/${projectId}/client-contacts`, {
              name: contact.name,
              email: contact.email,
              title: contact.role || null,
            }),
          ),
        );
      } catch (err) {
        // project already exists at this point; don't block navigation on a contacts failure
        console.error("Failed to add one or more client contacts:", err);
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project");
      setSubmitting(false);
    }
  }

  return (
    <main className="w-[vw] flex justify-center">
      <div className="flex flex-col gap-[40px] px-[120px] pb-[48px] pt-[28px]">
        <div className="flex flex-col gap-[8px]">
          {/* <Link href="/projects" className="text-[14px] font-medium text-gca-show">
            ← Projects
          </Link> */}
          <Link
            href="/projects"
            className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
          >
            <ArrowLeft className="size-[14px]" />
            Projects
          </Link>
          <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">New project</h1>
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
            mode="create"
            completedKeys={completed}
            onStepClick={setStep}
          />

          <div className="w-[640px]">
            {step === "details" && (
              <DetailsStep
                defaultValues={details}
                onCancel={() => router.push("/")}
                nextLabel="Next: Scope"
                onNext={(values) => {
                  setDetails(values);
                  advance("details", "scope");
                }}
              />
            )}

            {step === "scope" && (
              <ScopeStep
                value={scopeStages}
                onChange={setScopeStages}
                onBack={() => setStep("details")}
                onNext={() => advance("scope", "people")}
                nextLabel="Next: People"
              />
            )}

            {step === "people" && (
              <PeopleStep
                value={people}
                onChange={setPeople}
                onBack={() => setStep("scope")}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel="Create project"
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
