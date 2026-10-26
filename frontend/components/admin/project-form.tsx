"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Dropdown from "@/components/Dropdown";
import { StatusControl } from "@/components/project-overview/status-control";
import {
  useAssignableUsers,
  useProgramsList,
  useProjectRoles,
  useReassignMainRole,
} from "./use-admin-users-data";
import { useUpdateProject, type AdminProjectStage } from "./use-admin-projects-data";
import { DeleteProjectModal } from "./delete-project-modal";
import type { AdminProjectDetail } from "./types";
import { ArrowLeft } from "lucide-react";

const projectFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(500),
  client_name: z.string().trim().max(500).optional(),
  program_id: z.string().min(1, "Program is required"),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  site_location: z.string().trim().max(500).optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

function mainHolderName(
  roles: {
    role: string;
    user_id: string;
    granted_at: string;
    first_name: string;
    last_name: string;
  }[],
  role: "PM" | "Planner",
) {
  const holders = roles.filter((r) => r.role === role);
  const main = [...holders].sort(
    (a, b) => new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime(),
  )[0];
  return main ? { id: main.user_id, name: `${main.first_name} ${main.last_name}` } : null;
}

export function ProjectForm({
  project,
  stages,
}: {
  project: AdminProjectDetail;
  stages: AdminProjectStage[];
}) {
  const router = useRouter();
  const updateProject = useUpdateProject(project.project_id);
  const { data: programs = [] } = useProgramsList();
  const { data: projectRoles = [] } = useProjectRoles(project.project_id);
  const { data: assignableUsers = [] } = useAssignableUsers();
  const reassignMainRole = useReassignMainRole();
  const [dropdownRevision, setDropdownRevision] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project.name,
      client_name: project.client_name ?? "",
      program_id: String(project.program_id),
      expected_start_date: project.expected_start_date?.slice(0, 10) ?? "",
      expected_end_date: project.expected_end_date?.slice(0, 10) ?? "",
      site_location: project.site_location ?? "",
    },
  });

  async function onSubmit(values: ProjectFormValues) {
    await updateProject.mutateAsync({
      name: values.name,
      client_name: values.client_name || null,
      program_id: Number(values.program_id),
      expected_start_date: values.expected_start_date || null,
      expected_end_date: values.expected_end_date || null,
      site_location: values.site_location || null,
    });
    router.push("/admin/projects");
  }

  const programOptions = programs.map((p) => ({ id: String(p.program_id), name: p.name }));
  const userOptions = useMemo(
    () =>
      assignableUsers.map((user) => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
      })),
    [assignableUsers],
  );
  const mainPm = mainHolderName(projectRoles, "PM");
  const mainPlanner = mainHolderName(projectRoles, "Planner");
  const mainPmId = mainPm?.id;
  const mainPmName = mainPm?.name;
  const mainPlannerId = mainPlanner?.id;
  const mainPlannerName = mainPlanner?.name;
  const mainPmOptions = useMemo(
    () =>
      mainPmId && !userOptions.some((user) => user.id === mainPmId)
        ? [{ id: mainPmId, name: mainPmName ?? "" }, ...userOptions]
        : userOptions,
    [mainPmId, mainPmName, userOptions],
  );
  const mainPlannerOptions = useMemo(
    () =>
      mainPlannerId && !userOptions.some((user) => user.id === mainPlannerId)
        ? [{ id: mainPlannerId, name: mainPlannerName ?? "" }, ...userOptions]
        : userOptions,
    [mainPlannerId, mainPlannerName, userOptions],
  );
  const currentStage =
    stages.find((s) => s.state === "active") ??
    [...stages].reverse().find((s) => s.state === "complete");
  const teamCount = new Set(projectRoles.map((r) => r.user_id)).size;

  function handleMainRoleChange(role: "PM" | "Planner", newUserId: string) {
    const currentHolder = role === "PM" ? mainPm : mainPlanner;
    if (newUserId === currentHolder?.id) return;

    reassignMainRole.mutate(
      { projectId: project.project_id, role, newUserId },
      { onError: () => setDropdownRevision((revision) => revision + 1) },
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push("/admin/projects")}
        className="mb-[16px] text-[13px] font-medium text-gca-green flex gap-[6px] items-center"
      >
        <ArrowLeft size={18} /> Projects
      </button>

      <h1 className="mb-[24px] text-[24px] font-semibold text-gca-dark">Edit project</h1>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[24px] md:flex-row"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
          <Field label="Project name" required error={errors.name?.message}>
            <input
              {...register("name")}
              aria-invalid={!!errors.name}
              className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
                errors.name ? "border-error-border" : "border-gca-border"
              }`}
            />
          </Field>

          <div className="flex flex-col gap-[16px] md:flex-row">
            <div className="flex-1">
              <Field label="Client">
                <input
                  {...register("client_name")}
                  className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Program" required error={errors.program_id?.message}>
                <Controller
                  control={control}
                  name="program_id"
                  render={({ field }) => (
                    <Dropdown
                      id="program_id"
                      title="Select program"
                      data={programOptions}
                      selectedId={field.value}
                      style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
                      onSelect={(id) => field.onChange(id)}
                    />
                  )}
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-[16px] md:flex-row">
            <div className="flex-1">
              <Field label="Start date">
                <input
                  type="date"
                  {...register("expected_start_date")}
                  className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Planned finish">
                <input
                  type="date"
                  {...register("expected_end_date")}
                  className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
                />
              </Field>
            </div>
          </div>

          <Field label="Location">
            <input
              {...register("site_location")}
              className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
            />
          </Field>

          <div className="flex flex-col gap-[16px] md:flex-row">
            <div className="flex-1">
              <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Status</p>
              <StatusControl
                projectId={project.project_id}
                status={project.status}
                canManage
                onChanged={() => router.refresh()}
                classNames="w-full!"
              />
            </div>
            <div className="flex-1">
              <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Main PM</p>
              <div className={reassignMainRole.isPending ? "pointer-events-none opacity-60" : ""}>
                <Dropdown
                  key={`main-pm-${mainPm?.id ?? "none"}-${dropdownRevision}`}
                  id="main-pm"
                  title="Select PM"
                  data={mainPmOptions}
                  selectedId={mainPm?.id}
                  style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
                  onSelect={(id) => handleMainRoleChange("PM", id)}
                />
              </div>
            </div>
          </div>

          <div className="w-full md:w-[calc(50%-8px)]">
            <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Main Planner</p>
            <div className={reassignMainRole.isPending ? "pointer-events-none opacity-60" : ""}>
              <Dropdown
                key={`main-planner-${mainPlanner?.id ?? "none"}-${dropdownRevision}`}
                id="main-planner"
                title="Select Planner"
                data={mainPlannerOptions}
                selectedId={mainPlanner?.id}
                style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
                onSelect={(id) => handleMainRoleChange("Planner", id)}
              />
            </div>
          </div>

          <div className="mt-[8px] flex items-center justify-between gap-[12px]">
            <button
              type="button"
              onClick={() => router.push("/admin/projects")}
              className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProject.isPending}
              className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-60"
            >
              Save changes
            </button>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-[16px] md:w-[320px]">
          <div className="rounded-[12px] bg-gca-page-bg p-[20px]">
            <h2 className="text-[14px] font-semibold text-gca-dark">Project summary</h2>
            <dl className="mt-[16px] flex flex-col gap-[12px] text-[13px]">
              <Row label="Stage" value={currentStage?.stage_name ?? "—"} />
              <Row label="Status" value={project.status} />
              <Row label="Team" value={`${teamCount} ${teamCount === 1 ? "person" : "people"}`} />
              <Row
                label="Created"
                value={new Date(project.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              />
            </dl>
            <button
              type="button"
              onClick={() => router.push(`/projects/${project.project_id}/team`)}
              className="mt-[16px] w-full rounded-[8px] border border-gca-border bg-gca-surface px-[14px] py-[10px] text-[14px] font-medium text-gca-dark"
            >
              Manage team
            </button>
          </div>

          <div className="rounded-[12px] border border-error-border bg-error-bg p-[20px]">
            <h2 className="text-[14px] font-semibold text-gca-dark">Delete project</h2>
            <p className="mt-[8px] text-[13px] text-gca-muted">
              Permanently deletes the project and all its data. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="mt-[16px] w-full rounded-[8px] border border-error-border bg-gca-surface px-[14px] py-[10px] text-[14px] font-medium text-error-text"
            >
              Delete project
            </button>
          </div>
        </div>
      </form>

      {deleting && (
        <DeleteProjectModal
          project={{ ...project, program_name: null, main_pm_name: null }}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gca-muted">{label}</dt>
      <dd className="font-medium text-gca-dark">{value}</dd>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[13px] font-medium text-gca-dark">
        {label} {required && <span className="text-gca-warning">*</span>}
      </span>
      {children}
      {error && <span className="text-[12px] text-error-text">{error}</span>}
    </label>
  );
}
