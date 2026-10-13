"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import Dropdown from "@/components/Dropdown";

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
}

export function PeopleStep({ value, onChange, onBack, onSubmit, submitLabel, submitting }: PeopleStepProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ClientContact>({ name: "", role: "", email: "" });

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
    name: u.id === user?.userId ? `${u.first_name} ${u.last_name} (you)` : `${u.first_name} ${u.last_name}`,
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
    if (!draft.name.trim() || !draft.email.trim()) return;
    onChange({ ...value, clientTeam: [...value.clientTeam, draft] });
    setDraft({ name: "", role: "", email: "" });
  }

  function removeContact(index: number) {
    onChange({ ...value, clientTeam: value.clientTeam.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex w-[640px] flex-col gap-[28px]">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-gca-dark">Assign people</h2>
        <p className="pt-[8px] text-[14px] text-gca-show">The main Planner gets Planner access to this project.</p>
      </div>

      <div className="flex gap-[16px]">
        <div className="flex w-1/2 flex-col gap-[8px]">
          <label className="text-[13px] font-medium text-gca-show">
            Main PM <span className="text-error-text">*</span>
          </label>
          <Dropdown
            id="pm_user_id"
            title="Choose PM"
            data={userOptions}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark"
            selectedId={value.pmUserId}
            onSelect={(id) => onChange({ ...value, pmUserId: id })}
          />
        </div>
        <div className="flex w-1/2 flex-col gap-[8px]">
          <label className="text-[13px] font-medium text-gca-show">
            Main Planner <span className="text-error-text">*</span>
          </label>
          <Dropdown
            id="planner_user_id"
            title="Choose Planner"
            data={userOptions}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark"
            selectedId={value.plannerUserId}
            onSelect={(id) => onChange({ ...value, plannerUserId: id })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-[8px]">
        <label className="text-[13px] font-medium text-gca-show">Site engineers</label>
        <div className="flex flex-wrap gap-[8px] rounded-[8px] border border-gca-border p-[10px]">
          {userOptions.map((u) => {
            const selected = value.siteEngineerIds.includes(u.id);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggleEngineer(u.id)}
                className={`flex items-center gap-[8px] rounded-[6px] px-[11px] py-[6px] text-[13px] font-medium ${
                  selected ? "bg-gca-badge-bg text-gca-badge-text" : "border border-gca-border text-gca-dark"
                }`}
              >
                {u.name}
                {selected ? <X className="size-[8px]" /> : <Plus className="size-[8px]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[15px] font-semibold text-gca-dark">Client team</p>
        <p className="pt-[4px] text-[13px] text-gca-show">Client contacts receive project reports.</p>
      </div>

      <div className="flex gap-[8px]">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Full name"
          className="h-[42px] w-[180px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
        <input
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value })}
          placeholder="Role"
          className="h-[42px] w-[140px] rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
        <input
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder="Email"
          className="h-[42px] flex-1 rounded-[8px] border border-gca-border px-[13px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
        <button
          type="button"
          onClick={addContact}
          className="flex items-center gap-[6px] rounded-[8px] border border-gca-border px-[16px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
        >
          <Plus className="size-[10px]" />
          Add
        </button>
      </div>

      {value.clientTeam.length > 0 && (
        <div className="flex flex-col divide-y divide-gca-border rounded-[8px] border border-gca-border">
          {value.clientTeam.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-[14px] py-[13px]">
              <div className="flex items-center gap-[11px]">
                <span className="flex size-[32px] items-center justify-center rounded-full bg-gca-badge-bg text-[12px] font-semibold text-gca-badge-text">
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
                <X className="size-[14px] text-gca-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-[10px]">
        <button type="button" onClick={onBack} className="text-[14px] font-medium text-gca-show">
          ← Back
        </button>
        <button
          type="button"
          disabled={!value.pmUserId || !value.plannerUserId || submitting}
          onClick={onSubmit}
          className="rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
