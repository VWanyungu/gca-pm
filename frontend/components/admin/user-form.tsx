"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LoaderCircle } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { type AdminUserDetail, type RoleName } from "./types";
import { useCreateUser, useUpdateUser } from "./use-admin-users-data";
import { useAccessRoles } from "./use-access-roles-data";
import { AccessPanelContent } from "./access-panel";

const baseUserFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().max(30).optional(),
  globalRole: z.string().optional(),
});

const createUserFormSchema = baseUserFormSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100)
    .refine(
      (value) => value.split(/\s+/).length >= 2,
      "Enter first and last name separated by a space",
    ),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || /^\d{12}$/.test(value),
      "Enter a 12-digit phone number including country code (e.g. 254706518167)",
    )
    .optional(),
});

const editUserFormSchema = baseUserFormSchema;

type UserFormValues = z.infer<typeof createUserFormSchema>;

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);
  return { firstName: firstName ?? "", lastName: rest.join(" ") };
}

interface UserFormProps {
  editing?: AdminUserDetail;
}

export function UserForm({ editing }: UserFormProps) {
  const router = useRouter();
  const { data: accessRoles = [] } = useAccessRoles();
  const globalRoleOptions = [
    { id: "none", name: "None" },
    ...accessRoles.map((r) => ({ id: r.name, name: r.name })),
  ];
  const [createdUser, setCreatedUser] = useState<AdminUserDetail>();
  const currentUser = editing ?? createdUser;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(currentUser?.id ?? "");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields, isSubmitted },
  } = useForm<UserFormValues>({
    resolver: zodResolver(currentUser ? editUserFormSchema : createUserFormSchema),
    mode: "onChange",
    defaultValues: {
      fullName: currentUser ? `${currentUser.first_name} ${currentUser.last_name}`.trim() : "",
      email: currentUser?.email ?? "",
      phone: currentUser?.phone_number ?? "",
      globalRole: currentUser?.global_role ?? "none",
    },
  });

  const saving = createUser.isPending || updateUser.isPending;

  async function onSubmit(values: UserFormValues) {
    const globalRole =
      values.globalRole && values.globalRole !== "none" ? (values.globalRole as RoleName) : null;
    const { firstName, lastName } = splitName(values.fullName);
    if (currentUser) {
      await updateUser.mutateAsync({
        firstName,
        lastName,
        phone: values.phone || null,
        globalRole,
      });
      router.push("/admin/users");
    } else {
      const createdUser = await createUser.mutateAsync({
        firstName,
        lastName,
        email: values.email,
        phone: values.phone || null,
        globalRole,
      });
      reset({
        fullName: `${createdUser.first_name} ${createdUser.last_name}`.trim(),
        email: createdUser.email,
        phone: createdUser.phone_number ?? "",
        globalRole: createdUser.global_role ?? "none",
      });
      setCreatedUser(createdUser);
    }
  }

  return (
    <div>
      <h1 className="mb-[24px] text-[24px] font-semibold text-gca-dark">
        {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Add user"}
      </h1>

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className={`flex ${editing && "flex-wrap"}  gap-[24px]`}
      >
        <div className="flex flex-1 flex-col gap-[16px]">
          <Field
            label="Full name"
            required
            error={dirtyFields.fullName || isSubmitted ? errors.fullName?.message : undefined}
          >
            <input
              {...register("fullName")}
              aria-invalid={(dirtyFields.fullName || isSubmitted) && !!errors.fullName}
              placeholder="e.g. Jane Wanjiru"
              className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
                (dirtyFields.fullName || isSubmitted) && errors.fullName
                  ? "border-error-border"
                  : "border-gca-border"
              }`}
            />
          </Field>

          <Field
            label="Work email"
            required
            error={dirtyFields.email || isSubmitted ? errors.email?.message : undefined}
          >
            <input
              type="email"
              {...register("email")}
              aria-invalid={(dirtyFields.email || isSubmitted) && !!errors.email}
              disabled={!!currentUser}
              placeholder="name@gca.co.ke"
              className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green disabled:bg-gca-page-bg disabled:text-gca-muted ${
                (dirtyFields.email || isSubmitted) && errors.email
                  ? "border-error-border"
                  : "border-gca-border"
              }`}
            />
          </Field>

          <Field
            label="Phone"
            error={
              !currentUser && (dirtyFields.phone || isSubmitted) ? errors.phone?.message : undefined
            }
          >
            <input
              {...register("phone")}
              aria-invalid={!currentUser && (dirtyFields.phone || isSubmitted) && !!errors.phone}
              placeholder="Optional"
              className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
                !currentUser && (dirtyFields.phone || isSubmitted) && errors.phone
                  ? "border-error-border"
                  : "border-gca-border"
              }`}
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
                  data={globalRoleOptions}
                  selectedId={field.value || "none"}
                  style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
                  onSelect={(id) => field.onChange(id)}
                />
              )}
            />
          </Field>

          <div className="mt-[8px] flex justify-between gap-[12px]">
            <button
              type="button"
              onClick={() => {
                router.push("/admin/users");
                setCreatedUser(undefined);
              }}
              className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="relative flex items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-60"
            >
              <span className={saving ? "invisible" : undefined}>
                {currentUser ? "Save" : "Create user"}
              </span>
              {saving && (
                <LoaderCircle
                  className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                  aria-label={currentUser ? "Saving" : "Creating user"}
                />
              )}
            </button>
          </div>
        </div>

        <div
          className={`${!editing && "hidden md:block"} w-full md:w-[320px] shrink-0 rounded-[12px] bg-gca-page-bg p-[20px]`}
        >
          <h2 className="text-[14px] font-semibold text-gca-dark">Project access</h2>
          {currentUser ? (
            <div className="mt-[16px] h-[440px]">
              <AccessPanelContent user={currentUser} />
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
                className="mt-[16px] w-full rounded-[8px] border border-gca-border bg-gca-surface px-[14px] py-[10px] text-[14px] font-medium text-gca-dark disabled:opacity-60"
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
