"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Dropdown from "@/components/Dropdown";
import { ROLE_NAMES, type AdminUserDetail, type RoleName } from "./types";
import { useCreateUser, useUpdateUser } from "./use-admin-users-data";
import { AccessPanelContent } from "./access-panel";

const userFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().max(30).optional(),
  globalRole: z.string().optional(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const GLOBAL_ROLE_OPTIONS = [{ id: "none", name: "None" }, ...ROLE_NAMES.map((r) => ({ id: r, name: r }))];

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

interface UserFormProps {
  editing?: AdminUserDetail;
}

export function UserForm({ editing }: UserFormProps) {
  const router = useRouter();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(editing?.id ?? "");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: editing ? `${editing.first_name} ${editing.last_name}`.trim() : "",
      email: editing?.email ?? "",
      phone: editing?.phone_number ?? "",
      globalRole: editing?.global_role ?? "none",
    },
  });

  const saving = createUser.isPending || updateUser.isPending;

  async function onSubmit(values: UserFormValues) {
    const globalRole = values.globalRole && values.globalRole !== "none" ? (values.globalRole as RoleName) : null;
    const { firstName, lastName } = splitName(values.fullName);
    if (editing) {
      await updateUser.mutateAsync({ firstName, lastName, phone: values.phone || null, globalRole });
      router.push("/admin/users");
    } else {
      await createUser.mutateAsync({ firstName, lastName, email: values.email, phone: values.phone || null, globalRole });
      router.push("/admin/users");
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/admin/users")}
        className="mb-[16px] text-[13px] font-medium text-gca-green"
      >
        ← Users
      </button>

      <h1 className="mb-[24px] text-[24px] font-semibold text-gca-dark">
        {editing ? `${editing.first_name} ${editing.last_name}` : "Add user"}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-[24px]">
        <div className="flex flex-1 flex-col gap-[16px]">
          <Field label="Full name" required error={errors.fullName?.message}>
            <input
              {...register("fullName")}
              placeholder="e.g. Jane Wanjiru"
              className="h-[42px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
            />
          </Field>

          <Field label="Work email" required error={errors.email?.message}>
            <input
              type="email"
              {...register("email")}
              disabled={!!editing}
              placeholder="name@gca.co.ke"
              className="h-[42px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted"
            />
          </Field>

          <Field label="Phone">
            <input
              {...register("phone")}
              placeholder="Optional"
              className="h-[42px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
            />
          </Field>

          <Field label="Global role">
            <Controller
              control={control}
              name="globalRole"
              render={({ field }) => (
                <Dropdown
                  id="globalRole"
                  title="None"
                  data={GLOBAL_ROLE_OPTIONS}
                  selectedId={field.value || "none"}
                  style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
                  onSelect={(id) => field.onChange(id)}
                />
              )}
            />
          </Field>

          <div className="mt-[8px] flex justify-end gap-[12px]">
            <button
              type="button"
              onClick={() => router.push("/admin/users")}
              className="rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-white disabled:opacity-60"
            >
              {editing ? "Save" : "Create user"}
            </button>
          </div>
        </div>

        <div className="w-[320px] shrink-0 rounded-[12px] bg-gca-page-bg p-[20px]">
          <h2 className="text-[14px] font-semibold text-gca-dark">Project access</h2>
          {editing ? (
            <div className="mt-[16px] h-[440px]">
              <AccessPanelContent user={editing} />
            </div>
          ) : (
            <>
              <p className="mt-[4px] text-[13px] text-gca-muted">
                Grant roles on projects or programs once the user exists.
              </p>
              <button
                type="button"
                disabled
                // shortcut: project access can only be granted once the user has an id, so the
                // affordance stays disabled on the create route per the Figma spec.
                className="mt-[16px] w-full rounded-[8px] border border-gca-border bg-white px-[14px] py-[10px] text-[14px] font-medium text-gca-dark disabled:opacity-60"
              >
                Add project access
              </button>
            </>
          )}
        </div>
      </form>
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
