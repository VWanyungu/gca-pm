"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";

export const detailsSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(500),
  client_name: z.string().trim().min(1, "Client is required").max(500),
  program_id: z.string().min(1, "Program is required"),
  expected_start_date: z.string().min(1, "Start date is required"),
  expected_end_date: z.string().optional(),
  site_location: z.string().optional(),
});

export type DetailsFormValues = z.infer<typeof detailsSchema>;

interface ProgramsResponse {
  programs: Array<{ program_id: number; name: string }>;
}

interface DetailsStepProps {
  defaultValues: DetailsFormValues;
  onCancel: () => void;
  onNext: (values: DetailsFormValues) => void;
  /** Edit mode shows a secondary "Save changes" action next to "Next". */
  onSave?: (values: DetailsFormValues) => void;
  saving?: boolean;
  nextLabel: string;
}

export function DetailsStep({ defaultValues, onCancel, onNext, onSave, saving, nextLabel }: DetailsStepProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DetailsFormValues>({ resolver: zodResolver(detailsSchema), defaultValues });

  useEffect(() => {
    // shortcut: re-syncs only when the prefilled name changes (edit mode's async load), not on every keystroke
    Object.entries(defaultValues).forEach(([key, value]) => setValue(key as keyof DetailsFormValues, value ?? ""));
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

  const programId = watch("program_id");

  return (
    <form
      onSubmit={handleSubmit(onNext)}
      className="flex w-[640px] flex-col gap-[32px]"
    >
      <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-gca-dark">Project details</h2>

      <Field label="Project name" required error={errors.name?.message}>
        <input
          {...register("name")}
          placeholder="e.g. Gitanga Mall Reticulation"
          className="h-[42px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
      </Field>

      <div className="flex gap-[16px]">
        <Field label="Client" required error={errors.client_name?.message} className="w-1/2">
          <input
            {...register("client_name")}
            placeholder="Client name"
            className="h-[42px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
          />
        </Field>
        <Field label="Program" required error={errors.program_id?.message} className="w-1/2">
          <Dropdown
            id="program_id"
            title="Choose program"
            data={programs.map((p) => ({ id: String(p.program_id), name: p.name }))}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark"
            selectedId={programId}
            onSelect={(id) => setValue("program_id", id, { shouldValidate: true })}
          />
        </Field>
      </div>

      <div className="flex gap-[16px]">
        <Field label="Start date" required error={errors.expected_start_date?.message} className="w-1/2">
          <input
            type="date"
            {...register("expected_start_date")}
            className="h-[42px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
          />
        </Field>
        <Field label="Planned finish" className="w-1/2">
          <input
            type="date"
            {...register("expected_end_date")}
            className="h-[42px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
          />
        </Field>
      </div>

      <Field label="Location">
        <input
          {...register("site_location")}
          placeholder="Site address or area"
          className="h-[42px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
      </Field>

      <div className="flex items-center justify-between pt-[10px]">
        <button type="button" onClick={onCancel} className="text-[14px] font-medium text-gca-show">
          Cancel
        </button>
        <div className="flex items-center gap-[12px]">
          {onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit(onSave)}
              className="rounded-[8px] border border-gca-border px-[18px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg disabled:opacity-50"
            >
              Save changes
            </button>
          )}
          <button
            type="submit"
            className="rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

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
    <div className={`flex flex-col gap-[8px] ${className ?? ""}`}>
      <label className="text-[13px] font-medium text-gca-show">
        {label} {required && <span className="text-error-text">*</span>}
      </label>
      {children}
      {error && <span className="text-[12px] text-error-text">{error}</span>}
    </div>
  );
}
