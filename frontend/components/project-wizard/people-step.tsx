"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import Dropdown from "@/components/Dropdown";
import useOutsideClick from "@/hooks/use-outside-click";

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UsersResponse {
  response: { users: UserOption[] };
}

export interface ClientContact {
  name: string;
  role: string;
  email: string;
}

export interface PeopleValues {
  pmUserId: string;
  plannerUserId: string;
  siteEngineerIds: string[];
  clientTeam: ClientContact[];
}

interface PeopleStepProps {
  value: PeopleValues;
  onChange: (value: PeopleValues) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting?: boolean;
  singlePage?: boolean;
}

export function PeopleStep({
  value,
  onChange,
  onBack,
  onSubmit,
  submitLabel,
  submitting,
  singlePage = false,
}: PeopleStepProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ClientContact>({ name: "", role: "", email: "" });
  const [contactErrors, setContactErrors] = useState<{ name?: string; email?: string }>({});

  const { data: users = [] } = useQuery({
    queryKey: ["users", "assignable"],
    queryFn: async () => {
      const res = await api.get<UsersResponse>("/users?type=multiple&limit=100");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.response.users;
    },
  });

  const userOptions = users.map((u) => ({
    id: u.id,
    name:
      u.id === user?.userId
        ? `${u.first_name} ${u.last_name} (you)`
        : `${u.first_name} ${u.last_name}`,
  }));

  function toggleEngineer(id: string) {
    onChange({
      ...value,
      siteEngineerIds: value.siteEngineerIds.includes(id)
        ? value.siteEngineerIds.filter((e) => e !== id)
        : [...value.siteEngineerIds, id],
    });
  }

  function addContact() {
    const nextErrors = {
      name: draft.name.trim() ? undefined : "Name is required",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)
        ? undefined
        : "Enter a valid email address",
    };
    setContactErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    onChange({ ...value, clientTeam: [...value.clientTeam, draft] });
    setDraft({ name: "", role: "", email: "" });
  }

  function removeContact(index: number) {
    onChange({ ...value, clientTeam: value.clientTeam.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex w-full flex-col gap-[28px]">
      <div className="hidden md:block">
        <h2 className="text-[26px] font-semibold tracking-[-0.39px] text-gca-dark">
          Assign people
        </h2>
        <p className="pt-[8px] text-[15px] text-gca-show">
          The main Planner gets Planner access to this project.
        </p>
      </div>

      <div className="flex flex-col gap-[16px] sm:flex-row">
        <div className="flex w-full flex-col gap-[6px] sm:w-1/2">
          <label className="flex items-center gap-[2px] text-[13px] font-medium text-gca-dark">
            Main PM <span className="text-error-text">*</span>
          </label>
          <Dropdown
            id="pm_user_id"
            title="Choose PM"
            data={userOptions}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            selectedId={value.pmUserId}
            onSelect={(id) => onChange({ ...value, pmUserId: id })}
          />
        </div>
        <div className="flex w-full flex-col gap-[6px] sm:w-1/2">
          <label className="flex items-center gap-[2px] text-[13px] font-medium text-gca-dark">
            Main Planner <span className="text-error-text">*</span>
          </label>
          <Dropdown
            id="planner_user_id"
            title="Choose Planner"
            data={userOptions}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            selectedId={value.plannerUserId}
            onSelect={(id) => onChange({ ...value, plannerUserId: id })}
          />
        </div>
      </div>

      <SiteEngineersField
        options={userOptions}
        selectedIds={value.siteEngineerIds}
        onToggle={toggleEngineer}
      />

      <div className="flex flex-col gap-[4px]">
        <p className="text-[16px] font-semibold text-gca-dark">Client team</p>
        <p className="text-[13px] text-gca-show">Client contacts receive project reports.</p>
      </div>

      <div className="flex flex-col items-stretch gap-[12px] md:flex-row md:items-start">
        <div className="flex w-full flex-col gap-[4px] md:w-[180px]">
          <input
            value={draft.name}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value });
              setContactErrors((current) => ({ ...current, name: undefined }));
            }}
            aria-invalid={!!contactErrors.name}
            placeholder="Full name"
            className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
              contactErrors.name ? "border-error-border" : "border-gca-border"
            }`}
          />
          {contactErrors.name && (
            <span className="text-[12px] text-error-text">{contactErrors.name}</span>
          )}
        </div>
        <input
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          placeholder="Role"
          className="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green md:w-[140px]"
        />
        <div className="flex w-full flex-col gap-[4px] md:w-[196px]">
          <input
            value={draft.email}
            onChange={(e) => {
              setDraft({ ...draft, email: e.target.value });
              setContactErrors((current) => ({ ...current, email: undefined }));
            }}
            aria-invalid={!!contactErrors.email}
            placeholder="Email"
            className={`h-[42px] rounded-[8px] border px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green ${
              contactErrors.email ? "border-error-border" : "border-gca-border"
            }`}
          />
          {contactErrors.email && (
            <span className="text-[12px] text-error-text">{contactErrors.email}</span>
          )}
        </div>
        <button
          type="button"
          onClick={addContact}
          className="flex w-full items-center justify-center gap-[8px] rounded-[8px] border border-gca-border px-[18px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg md:w-[88px]"
        >
          <Plus className="size-[10px]" />
          Add
        </button>
      </div>

      {value.clientTeam.length > 0 && (
        <div className="flex flex-col">
          {value.clientTeam.map((c, i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <div className="flex items-center gap-[12px]">
                <span className="flex size-[32px] items-center justify-center rounded-[10px] bg-gca-badge-bg text-[12px] font-semibold text-gca-badge-text">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-gca-dark">{c.name}</p>
                  <p className="text-[12px] text-gca-muted">
                    {c.role} · {c.email}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => removeContact(i)}>
                <X className="size-[8px] text-gca-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-[24px]">
        <button
          type="button"
          onClick={onBack}
          className={`cursor-pointer flex items-center gap-[8px] px-[4px] py-[11px] text-[14px] font-semibold text-gca-dark ${
            singlePage ? "hidden xl:flex" : ""
          }`}
        >
          {/* <ArrowLeft className="size-[13px]" /> */}
          Back
        </button>
        <button
          type="button"
          disabled={!value.pmUserId || !value.plannerUserId || submitting}
          onClick={onSubmit}
          aria-label={submitting ? "Saving" : undefined}
          className="cursor-pointer w-full md:w-auto flex items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
          ) : (
            submitLabel
          )}
          {/* <ArrowRight className="size-[13px]" /> */}
        </button>
      </div>
    </div>
  );
}

interface SiteEngineersFieldProps {
  options: { id: string; name: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

function SiteEngineersField({ options, selectedIds, onToggle }: SiteEngineersFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick({
    ref,
    handler: () => {
      setIsOpen(false);
      setQuery("");
    },
  });

  const selected = options.filter((o) => selectedIds.includes(o.id));
  const available = options
    .filter((o) => !selectedIds.includes(o.id))
    .filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col gap-[6px]">
      <label className="text-[13px] font-medium text-gca-dark">Site engineers</label>
      <div ref={ref} className="relative">
        <div className="flex flex-wrap items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[10px] py-[8px]">
          {selected.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-[8px] rounded-[6px] border border-gca-border bg-gca-page-bg px-[10px] py-[5px] text-[13px] font-medium text-gca-dark"
            >
              {u.name}
              <button type="button" onClick={() => onToggle(u.id)} aria-label={`Remove ${u.name}`}>
                <X className="size-[8px]" />
              </button>
            </span>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Add an engineer"
            className="flex-1 text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
        </div>

        {isOpen && (
          <ul className="dropdown-scrollbar absolute top-full left-0 z-10 mt-[4px] max-h-52 w-full overflow-y-auto rounded-[8px] border border-gca-border bg-gca-surface py-[6px] shadow-[0px_1px_10px_4px_rgba(23,48,31,0.08)]">
            {available.map((u) => (
              <li
                key={u.id}
                onClick={() => {
                  onToggle(u.id);
                  setQuery("");
                }}
                className="cursor-pointer px-[14px] py-[8px] text-[14px] text-gca-dark hover:bg-gca-page-bg"
              >
                {u.name}
              </li>
            ))}
            {available.length === 0 && (
              <li className="px-[14px] py-[8px] text-[14px] text-gca-muted">No results</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
