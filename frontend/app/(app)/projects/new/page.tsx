"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { ProjectStepper, type WizardStep } from "@/components/project-wizard/stepper";
import {
  DetailsStep,
  type DetailsFormValues,
  type DetailsStepHandle,
} from "@/components/project-wizard/details-step";
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
  is_mechanical: true,
  is_civil: false,
  is_electrical: false,
};

const EMPTY_PEOPLE: PeopleValues = {
  pmUserId: "",
  plannerUserId: "",
  siteEngineerIds: [],
  clientTeam: [],
};

async function getSuggestedProjectCode(programId: string): Promise<string> {
  const res = await api.get<{ suggested_project_code: string }>(
    `/projects/suggest-code?program_id=${programId}`,
  );
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data.suggested_project_code;
}

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const detailsRef = useRef<DetailsStepHandle>(null);
  const [step, setStep] = useState("details");
  const [completed, setCompleted] = useState<string[]>([]);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [scopeStages, setScopeStages] = useState<number[]>([4, 5, 6, 7]);
  const [people, setPeople] = useState(EMPTY_PEOPLE);
  const [submitting, setSubmitting] = useState(false);

  useQuery({
    queryKey: ["projects", "suggested-code", details.program_id],
    queryFn: () => getSuggestedProjectCode(details.program_id),
    enabled: !!details.program_id,
  });

  function advance(from: string, to: string) {
    setCompleted((c) => (c.includes(from) ? c : [...c, from]));
    setStep(to);
  }

  async function createProject(
    projectCode: string,
    projectDetails: DetailsFormValues,
  ): Promise<{ project: { project_id: string } }> {
    const createRes = await api.post<{ project: { project_id: string } }>("/projects", {
      project_code: projectCode,
      name: projectDetails.name,
      client_name: projectDetails.client_name,
      program_id: Number(projectDetails.program_id),
      expected_start_date: projectDetails.expected_start_date,
      expected_end_date: projectDetails.expected_end_date || null,
      site_location: projectDetails.site_location || null,
      is_mechanical: projectDetails.is_mechanical,
      is_civil: projectDetails.is_civil,
      is_electrical: projectDetails.is_electrical,
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
    const validatedDetails = await detailsRef.current?.validate();
    if (!validatedDetails) return;

    setDetails(validatedDetails);
    setSubmitting(true);
    try {
      // suggested codes can collide under concurrent creates; the backend 409s, retry once with a fresh code
      const getSuggestedCode = async () => {
        return queryClient.fetchQuery({
          queryKey: ["projects", "suggested-code", validatedDetails.program_id],
          queryFn: () => getSuggestedProjectCode(validatedDetails.program_id),
        });
      };

      let suggestedCode = await getSuggestedCode();
      let created;
      try {
        created = await createProject(suggestedCode, validatedDetails);
      } catch (err) {
        if (err instanceof Error && err.message.includes("was just taken")) {
          suggestedCode = await getSuggestedCode();
          created = await createProject(suggestedCode, validatedDetails);
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
      console.error("Could not create project:", err);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex w-full justify-center px-4 pb-[48px] pt-[20px] sm:px-8 md:px-10 md:pt-[28px] 2xl:px-[120px]">
      <div className="flex w-full max-w-[1200px] flex-col gap-[20px] md:gap-[40px]">
        <div className="flex flex-col gap-[8px]">
          {/* <Link href="/projects" className="text-[14px] font-medium text-gca-show">
            ← Projects
          </Link> */}
          <Link
            href="/"
            className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
          >
            <ArrowLeft className="size-[14px]" />
            Projects
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.7px] text-gca-dark sm:text-[28px]">
            New project
          </h1>
        </div>

        <div className="flex w-full gap-[64px]">
          <div className="hidden xl:block">
            <ProjectStepper
              steps={STEPS}
              currentKey={step}
              mode="create"
              completedKeys={completed}
              onStepClick={setStep}
            />
          </div>

          <div className="flex w-full flex-col gap-[20px] md:gap-[0px] md:w-[640px]">
            <section className={step === "details" ? "" : "xl:hidden"}>
              <DetailsStep
                ref={detailsRef}
                defaultValues={details}
                onCancel={() => router.push("/")}
                nextLabel="Next: Scope"
                singlePage
                onNext={(values) => {
                  setDetails(values);
                  advance("details", "scope");
                }}
              />
            </section>
            <section className={step === "scope" ? "" : "xl:hidden"}>
              <ScopeStep
                value={scopeStages}
                onChange={setScopeStages}
                onBack={() => setStep("details")}
                onNext={() => advance("scope", "people")}
                singlePage
              />
            </section>
            <section className={step === "people" ? "" : "xl:hidden"}>
              <PeopleStep
                value={people}
                onChange={setPeople}
                onBack={() => setStep("scope")}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel="Create"
                singlePage
              />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
