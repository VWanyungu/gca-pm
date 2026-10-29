"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT, CAN_DELETE_PROJECT } from "@/lib/access-control";
import {
  useProjectDetail,
  useProjectDetailInvalidate,
} from "@/components/project-overview/use-project-data";
import { StatusControl } from "@/components/project-overview/status-control";
import {
  useProgramsList,
  useProjectRoles,
  type ProjectRoleGrant,
} from "@/components/admin/use-admin-users-data";
import { useUpdateProject } from "@/components/admin/use-admin-projects-data";
import { DeleteProjectModal } from "@/components/admin/delete-project-modal";
import { ReassignMainRoleModal } from "@/components/admin/reassign-main-role-modal";

const settingsFormSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(500),
  client_name: z.string().trim().max(500).optional(),
  program_id: z.string().min(1, "Program is required"),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  site_location: z.string().trim().max(500).optional(),
  is_mechanical: z.boolean(),
  is_civil: z.boolean(),
  is_electrical: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const WORK_TYPES = [
  { field: "is_mechanical", label: "Mechanical" },
  { field: "is_civil", label: "Civil" },
  { field: "is_electrical", label: "Electrical" },
] as const;

function mainHolder(roles: ProjectRoleGrant[], role: "PM" | "Planner") {
  const holders = roles.filter((r) => r.role === role);
  const main = [...holders].sort(
    (a, b) => new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime(),
  )[0];
  return main ? { id: main.user_id, name: `${main.first_name} ${main.last_name}` } : null;
}

export default function SettingsView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data, isLoading } = useProjectDetail(projectId);
  const invalidate = useProjectDetailInvalidate(projectId);
  const { data: programs = [] } = useProgramsList();
  const { data: projectRoles = [] } = useProjectRoles(projectId);
  const updateProject = useUpdateProject(projectId);
  const [deleting, setDeleting] = useState(false);
  const [reassigning, setReassigning] = useState<"PM" | "Planner" | null>(null);

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const canDelete = canAccess(user?.role, CAN_DELETE_PROJECT);

  const project = data?.project;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    values: project
      ? {
          name: project.name,
          client_name: project.client_name ?? "",
          program_id: String(project.program_id),
          expected_start_date: project.expected_start_date?.slice(0, 10) ?? "",
          expected_end_date: project.expected_end_date?.slice(0, 10) ?? "",
          site_location: project.site_location ?? "",
          is_mechanical: project.is_mechanical ?? true,
          is_civil: project.is_civil ?? false,
          is_electrical: project.is_electrical ?? false,
        }
      : undefined,
  });

  if (isLoading) return <p className="p-[40px] text-[14px] text-gca-muted">Loading project…</p>;
  if (!data || !project)
    return <p className="p-[40px] text-[14px] text-gca-muted">Project not found</p>;

  async function onSubmit(values: SettingsFormValues) {
    await updateProject.mutateAsync({
      name: values.name,
      client_name: values.client_name || null,
      program_id: Number(values.program_id),
      expected_start_date: values.expected_start_date || null,
      expected_end_date: values.expected_end_date || null,
      site_location: values.site_location || null,
      is_mechanical: values.is_mechanical,
      is_civil: values.is_civil,
      is_electrical: values.is_electrical,
    });
    invalidate();
  }

  const programOptions = programs.map((p) => ({ id: String(p.program_id), name: p.name }));
  const programName =
    programs.find((p) => String(p.program_id) === String(project.program_id))?.name ?? "—";
  const mainPm = mainHolder(projectRoles, "PM");
  const mainPlanner = mainHolder(projectRoles, "Planner");
  const currentStage =
    data.stages.find((s) => s.state === "active") ??
    [...data.stages].reverse().find((s) => s.state === "complete");
  const teamCount = new Set(projectRoles.map((r) => r.user_id)).size;

  return (
    <>
      <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
        <Link
          href={`/projects/${projectId}`}
          className="flex items-center gap-[6px] text-[14px] font-medium text-gca-show"
        >
          <ArrowLeft className="size-[18px]" /> Overview
        </Link>

        <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
          Project settings
        </h1>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-[24px] md:flex-row"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
            <Field label="Project name" required error={errors.name?.message}>
              <input
                {...register("name")}
                disabled={!canManage}
                aria-invalid={!!errors.name}
                className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted ${
                  errors.name ? "border-error-border" : "border-gca-border"
                }`}
              />
            </Field>

            <div className="flex flex-col gap-[16px] md:flex-row">
              <div className="flex-1">
                <Field label="Client">
                  <input
                    {...register("client_name")}
                    disabled={!canManage}
                    className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted"
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Program" required error={errors.program_id?.message}>
                  {canManage ? (
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
                  ) : (
                    <input
                      value={programName}
                      disabled
                      className="h-[42px] w-full rounded-[8px] border border-gca-border bg-gca-page-bg px-[12px] text-[14px] text-gca-muted outline-none"
                    />
                  )}
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-[16px] md:flex-row">
              <div className="flex-1">
                <Field label="Start date">
                  <input
                    type="date"
                    {...register("expected_start_date")}
                    disabled={!canManage}
                    className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted"
                  />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Planned finish">
                  <input
                    type="date"
                    {...register("expected_end_date")}
                    disabled={!canManage}
                    className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted"
                  />
                </Field>
              </div>
            </div>

            <Field label="Location">
              <input
                {...register("site_location")}
                disabled={!canManage}
                className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted"
              />
            </Field>

            <fieldset className="flex flex-col gap-[10px]">
              <legend className="pb-[6px] text-[13px] font-medium text-gca-dark">Works</legend>
              <div className="flex flex-wrap items-center gap-[12px]">
                {WORK_TYPES.map(({ field, label }) => (
                  <Controller
                    key={field}
                    control={control}
                    name={field}
                    render={({ field: f }) => (
                      <button
                        type="button"
                        disabled={!canManage}
                        aria-pressed={f.value}
                        onClick={() => f.onChange(!f.value)}
                        className={`flex w-[180px] flex-1 items-center gap-[12px] rounded-[8px] border px-[14px] py-[12px] disabled:cursor-default ${
                          f.value ? "border-gca-green bg-gca-badge-bg" : "border-gca-border"
                        } ${canManage ? "cursor-pointer" : ""}`}
                      >
                        <span
                          className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                            f.value ? "border-gca-green" : "border-gca-border"
                          }`}
                        >
                          {f.value && <span className="size-[10px] rounded-full bg-gca-green" />}
                        </span>
                        <span className="text-[14px] font-medium text-gca-dark">{label}</span>
                      </button>
                    )}
                  />
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-[16px] md:flex-row">
              <div className="flex-1">
                <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Status</p>
                <StatusControl
                  projectId={projectId}
                  status={project.status}
                  canManage={canManage}
                  onChanged={invalidate}
                  classNames="w-full!"
                />
              </div>
              <div className="flex-1">
                <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Main PM</p>
                <RoleRow
                  name={mainPm?.name ?? "—"}
                  canManage={canManage}
                  onReassign={() => setReassigning("PM")}
                />
              </div>
            </div>

            <div className="w-full md:w-[calc(50%-8px)]">
              <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Main Planner</p>
              <RoleRow
                name={mainPlanner?.name ?? "—"}
                canManage={canManage}
                onReassign={() => setReassigning("Planner")}
              />
            </div>

            {canManage && (
              <div className="mt-[8px] flex items-center justify-end gap-[12px]">
                <button
                  type="submit"
                  disabled={updateProject.isPending}
                  className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-60"
                >
                  {updateProject.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>

          <div className="flex w-full shrink-0 flex-col gap-[16px] md:w-[320px]">
            <div className="rounded-[12px] bg-gca-page-bg p-[20px]">
              <h2 className="text-[14px] font-semibold text-gca-dark">Project summary</h2>
              <dl className="mt-[16px] flex flex-col gap-[12px] text-[13px]">
                <Row label="Code" value={project.project_code} />
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
              <Link
                href={`/projects/${projectId}/team`}
                className="mt-[16px] block w-full rounded-[8px] border border-gca-border bg-gca-surface px-[14px] py-[10px] text-center text-[14px] font-medium text-gca-dark"
              >
                Manage team
              </Link>
            </div>

            {canDelete && (
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
            )}
          </div>
        </form>
      </main>

      {deleting && (
        <DeleteProjectModal
          project={{ ...project, program_name: null, main_pm_name: null }}
          onClose={() => setDeleting(false)}
        />
      )}
      {reassigning &&
        (() => {
          const holder = reassigning === "PM" ? mainPm : mainPlanner;
          return (
            <ReassignMainRoleModal
              projectId={projectId}
              projectName={project.name}
              role={reassigning}
              currentHolderId={holder?.id ?? ""}
              currentHolderName={holder?.name ?? "—"}
              onClose={() => setReassigning(null)}
            />
          );
        })()}
    </>
  );
}

function RoleRow({
  name,
  canManage,
  onReassign,
}: {
  name: string;
  canManage: boolean;
  onReassign: () => void;
}) {
  return (
    <div className="flex h-[42px] items-center justify-between rounded-[8px] border border-gca-border px-[12px]">
      <span className="truncate text-[14px] text-gca-dark">{name}</span>
      {canManage && (
        <button
          type="button"
          onClick={onReassign}
          className="shrink-0 text-[13px] font-medium text-gca-green"
        >
          Reassign
        </button>
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
