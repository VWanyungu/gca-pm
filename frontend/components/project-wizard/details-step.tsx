"use client";

import { forwardRef, useEffect, useImperativeHandle } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import { ArrowRight } from "lucide-react";

export const detailsSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(500),
  client_name: z.string().trim().min(1, "Client is required").max(500),
  program_id: z.string().min(1, "Program is required"),
  expected_start_date: z.string().min(1, "Start date is required"),
  expected_end_date: z.string().optional(),
  site_location: z.string().optional(),
  is_mechanical: z.boolean(),
  is_civil: z.boolean(),
  is_electrical: z.boolean(),
});

export type DetailsFormValues = z.infer<typeof detailsSchema>;

const WORK_TYPES = [
  { field: "is_mechanical", label: "Mechanical" },
  { field: "is_civil", label: "Civil" },
  { field: "is_electrical", label: "Electrical" },
] as const;

interface ProgramsResponse {
  programs: Array<{ program_id: number; name: string }>;
}

interface DetailsStepProps {
  defaultValues: DetailsFormValues;
  onCancel: () => void;
  onNext: (values: DetailsFormValues) => void;
  singlePage?: boolean;
  /** Edit mode shows a secondary "Save changes" action next to "Next". */
  onSave?: (values: DetailsFormValues) => void;
  saving?: boolean;
  nextLabel: string;
}

export interface DetailsStepHandle {
  validate: () => Promise<DetailsFormValues | null>;
}

export const DetailsStep = forwardRef<DetailsStepHandle, DetailsStepProps>(function DetailsStep(
  { defaultValues, onCancel, onNext, onSave, saving, nextLabel, singlePage = false },
  ref,
) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    control,
    formState: { errors },
  } = useForm<DetailsFormValues>({ resolver: zodResolver(detailsSchema), defaultValues });

  useImperativeHandle(
    ref,
    () => ({
      async validate() {
        return (await trigger()) ? getValues() : null;
      },
    }),
    [getValues, trigger],
  );

  useEffect(() => {
    // shortcut: re-syncs only when the prefilled name changes (edit mode's async load), not on every keystroke
    Object.entries(defaultValues).forEach(([key, value]) =>
      setValue(key as keyof DetailsFormValues, value ?? ""),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues.name]);

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const res = await api.get<ProgramsResponse>("/programs?limit=100");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.programs;
    },
  });

  const programId = useWatch({ control, name: "program_id" });
  const workTypes = useWatch({
    control,
    name: ["is_mechanical", "is_civil", "is_electrical"],
  });

  return (
    <form noValidate onSubmit={handleSubmit(onNext)} className="flex w-full flex-col gap-[24px]">
      <h2 className="text-[26px] font-semibold tracking-[-0.39px] text-gca-dark hidden md:hidden">
        Project details
      </h2>

      <Field label="Project name" required error={errors.name?.message}>
        <input
          {...register("name")}
          aria-invalid={!!errors.name}
          placeholder="e.g. Gitanga Mall Reticulation"
          className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
            errors.name ? "border-error-border" : "border-gca-border"
          }`}
        />
      </Field>

      <div className="flex flex-col gap-[16px] sm:flex-row">
        <Field
          label="Client"
          required
          error={errors.client_name?.message}
          className="w-full sm:w-1/2"
        >
          <input
            {...register("client_name")}
            aria-invalid={!!errors.client_name}
            placeholder="Client name"
            className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
              errors.client_name ? "border-error-border" : "border-gca-border"
            }`}
          />
        </Field>
        <Field
          label="Program"
          required
          error={errors.program_id?.message}
          className="w-full sm:w-1/2"
        >
          <Dropdown
            id="program_id"
            title="Choose program"
            data={programs.map((p) => ({ id: String(p.program_id), name: p.name }))}
            style={`h-[42px] w-full rounded-[8px] border px-[12px] text-[14px] text-gca-dark ${
              errors.program_id ? "border-error-border" : "border-gca-border"
            }`}
            selectedId={programId}
            onSelect={(id) => setValue("program_id", id, { shouldValidate: true })}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-[16px] sm:flex-row">
        <Field
          label="Start date"
          required
          error={errors.expected_start_date?.message}
          className="w-full sm:w-1/2"
        >
          <input
            type="date"
            {...register("expected_start_date")}
            aria-invalid={!!errors.expected_start_date}
            className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
              errors.expected_start_date ? "border-error-border" : "border-gca-border"
            }`}
          />
        </Field>
        <Field label="Planned finish" className="w-full sm:w-1/2">
          <input
            type="date"
            {...register("expected_end_date")}
            className="h-[42px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
          />
        </Field>
      </div>

      <Field label="Location">
        <input
          {...register("site_location")}
          placeholder="Site address or area"
          className="h-[42px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
      </Field>

      <fieldset className="flex flex-col gap-[10px]">
        <legend className="pb-[6px] text-[13px] font-medium text-gca-dark">Works</legend>
        <div className="flex flex-wrap items-center gap-[12px]">
          {WORK_TYPES.map(({ field, label }, index) => {
            const selected = workTypes[index];
            return (
              <button
                key={field}
                type="button"
                aria-pressed={selected}
                onClick={() => setValue(field, !selected, { shouldDirty: true })}
                className={`flex w-[180px] flex-1 cursor-pointer items-center gap-[12px] rounded-[8px] border px-[14px] py-[12px] ${
                  selected ? "border-gca-green bg-gca-badge-bg" : "border-gca-border"
                }`}
              >
                <span
                  className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-gca-green" : "border-gca-border"
                  }`}
                >
                  {selected && <span className="size-[10px] rounded-full bg-gca-green" />}
                </span>
                <span className="text-[14px] font-medium text-gca-dark">{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div
        className={`hidden md:flex items-center justify-between pt-[24px] ${singlePage ? "flex-wrap gap-3" : ""}`}
      >
        <button
          type="button"
          onClick={onCancel}
          className={`cursor-pointer px-[4px] py-[11px] text-[14px] font-semibold text-gca-show hover:text-red-500 ${
            singlePage ? "hidden xl:inline-flex" : ""
          }`}
        >
          Cancel
        </button>
        <div className="flex items-center gap-[12px]">
          {onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit(onSave)}
              className="cursor-pointer rounded-[8px] border border-gca-border px-[18px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg disabled:opacity-50"
            >
              Save changes
            </button>
          )}
          <button
            type="submit"
            className={`flex cursor-pointer items-center gap-[10px] rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover ${
              singlePage ? "hidden xl:flex" : ""
            }`}
          >
            {nextLabel}
            <ArrowRight className="size-[13px]" />
          </button>
        </div>
      </div>
    </form>
  );
});

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${className ?? ""}`}>
      <label className="flex items-center gap-[2px] text-[13px] font-medium text-gca-dark">
        {label} {required && <span className="text-error-text">*</span>}
      </label>
      {children}
      {error && <span className="text-[12px] text-error-text">{error}</span>}
    </div>
  );
}
