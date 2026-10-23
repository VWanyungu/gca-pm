"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import {
  createProjectContractor,
  usePersonnelRoles,
  useProjectContractors,
} from "../use-dpr-wizard-data";
import type { DprDraftInput, DprValidationErrors, DraftPersonnelGroup, DraftRoleCount } from "../types";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
  errors?: DprValidationErrors["personnelGroups"];
}

function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="flex items-center gap-[8px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label="Decrease"
        className="flex size-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
      >
        <Minus className="size-[14px] text-gca-dark" />
      </button>
      <p className="w-[28px] text-center font-mono text-[16px] font-semibold text-gca-dark">{value}</p>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
        className="flex size-[44px] cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
      >
        <Plus className="size-[14px] text-gca-dark" />
      </button>
    </div>
  );
}

export function PersonnelStep({ draft, update, projectId, errors = {} }: StepProps) {
  const { data: contractors = [] } = useProjectContractors(projectId);
  const { data: roles = [] } = usePersonnelRoles();
  const queryClient = useQueryClient();
  const [addingContractorFor, setAddingContractorFor] = useState<number | null>(null);
  const [newContractorName, setNewContractorName] = useState("");

  function updateGroup(index: number, patch: Partial<DraftPersonnelGroup>) {
    update({
      personnel_groups: draft.personnel_groups.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    });
  }

  function removeGroup(index: number) {
    update({ personnel_groups: draft.personnel_groups.filter((_, i) => i !== index) });
  }

  function addGroup() {
    update({
      personnel_groups: [
        ...draft.personnel_groups,
        { project_contractor_id: "", contractor_name: "", total_headcount: 0, role_counts: [] },
      ],
    });
  }

  /** total_headcount is never typed in — it's always the sum of the roles below it. */
  function setRoleCounts(groupIndex: number, roleCounts: DraftRoleCount[]) {
    updateGroup(groupIndex, {
      role_counts: roleCounts,
      total_headcount: roleCounts.reduce((sum, r) => sum + r.headcount, 0),
    });
  }

  function updateRoleCount(groupIndex: number, roleIndex: number, patch: Partial<DraftRoleCount>) {
    const group = draft.personnel_groups[groupIndex];
    setRoleCounts(groupIndex, group.role_counts.map((r, i) => (i === roleIndex ? { ...r, ...patch } : r)));
  }

  function removeRoleCount(groupIndex: number, roleIndex: number) {
    const group = draft.personnel_groups[groupIndex];
    setRoleCounts(groupIndex, group.role_counts.filter((_, i) => i !== roleIndex));
  }

  function addRoleCount(groupIndex: number) {
    const group = draft.personnel_groups[groupIndex];
    const firstRole = roles[0];
    if (!firstRole) return;
    setRoleCounts(groupIndex, [...group.role_counts, { personnel_role_id: firstRole.personnel_role_id, headcount: 0 }]);
  }

  async function confirmNewContractor(groupIndex: number) {
    const name = newContractorName.trim();
    if (!name) return;
    const contractor = await createProjectContractor(projectId, { contractor_name: name });
    await queryClient.invalidateQueries({ queryKey: ["project", projectId, "contractors"] });
    updateGroup(groupIndex, {
      project_contractor_id: contractor.project_contractor_id,
      contractor_name: contractor.contractor_name,
    });
    setNewContractorName("");
    setAddingContractorFor(null);
  }

  return (
    <div className="flex flex-col gap-[16px]">
      {draft.personnel_groups.map((group, groupIndex) => {
        const groupErrors = errors[groupIndex];
        return (
          <div key={groupIndex} className="flex flex-col gap-[12px] rounded-[12px] bg-white p-[16px]">
            <div className="flex items-center justify-between gap-[8px]">
              <div className="w-full flex-1">
                <Dropdown
                  id={`contractor-${groupIndex}`}
                  title="Select contractor"
                  data={contractors.map((c) => ({ id: c.project_contractor_id, name: c.contractor_name }))}
                  selectedId={group.project_contractor_id || undefined}
                  style={`h-[44px] w-full rounded-[8px] border bg-white px-[12px] text-[15px] text-gca-dark ${
                    groupErrors?.project_contractor_id ? "border-error-border" : "border-gca-border"
                  }`}
                  onSelect={(id, name) => updateGroup(groupIndex, { project_contractor_id: id, contractor_name: name })}
                />
                {groupErrors?.project_contractor_id && (
                  <span className="text-[12px] text-error-text">Contractor is required</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeGroup(groupIndex)}
                aria-label="Remove contractor group"
                className="flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
              >
                <Trash2 className="size-[16px] text-error-text" />
              </button>
            </div>

            {addingContractorFor === groupIndex ? (
              <div className="flex items-center gap-[8px]">
                <input
                  value={newContractorName}
                  onChange={(e) => setNewContractorName(e.target.value)}
                  placeholder="Contractor name"
                  className="h-[40px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
                />
                <button
                  type="button"
                  onClick={() => confirmNewContractor(groupIndex)}
                  className="cursor-pointer rounded-[8px] bg-gca-green px-[12px] py-[10px] text-[13px] font-semibold text-white"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAddingContractorFor(null)}
                  className="cursor-pointer text-[13px] text-gca-show"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAddingContractorFor(groupIndex);
                  setNewContractorName("");
                }}
                className="flex w-fit cursor-pointer items-center gap-[6px] text-[13px] font-medium text-gca-green"
              >
                <Plus className="size-[12px]" />
                Add contractor
              </button>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-gca-dark">Total headcount</span>
              <span className="font-mono text-[16px] font-semibold text-gca-dark">
                {group.total_headcount}
              </span>
            </div>

            <div className="flex flex-col gap-[4px]">
              {group.role_counts.map((roleCount, roleIndex) => {
                const roleError = groupErrors?.role_counts?.[roleIndex];
                return (
                  <div
                    key={roleIndex}
                    className={`flex flex-col gap-[4px] py-[10px] ${
                      roleIndex > 0 ? "border-t border-gca-border" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-[8px]">
                      <select
                        value={roleCount.personnel_role_id}
                        onChange={(e) =>
                          updateRoleCount(groupIndex, roleIndex, { personnel_role_id: Number(e.target.value) })
                        }
                        className="h-[40px] w-full max-w-[150px] rounded-[8px] border border-gca-border bg-white px-[10px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
                      >
                        {roles.map((role) => (
                          <option key={role.personnel_role_id} value={role.personnel_role_id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <Stepper
                        value={roleCount.headcount}
                        onChange={(next) => updateRoleCount(groupIndex, roleIndex, { headcount: next })}
                      />
                      <button
                        type="button"
                        onClick={() => removeRoleCount(groupIndex, roleIndex)}
                        aria-label="Remove role"
                        className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
                      >
                        <Trash2 className="size-[13px] text-error-text" />
                      </button>
                    </div>
                    {roleError && (
                      <span className="text-[12px] text-error-text">Headcount must be at least 1</span>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => addRoleCount(groupIndex)}
                disabled={roles.length === 0}
                className="flex w-fit cursor-pointer items-center gap-[8px] pt-[8px] text-[14px] font-medium text-gca-green disabled:opacity-50"
              >
                <Plus className="size-[10px]" />
                Add role
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addGroup}
        className="flex cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border py-[14px] text-[14px] font-medium text-gca-green"
      >
        <Plus className="size-[14px]" />
        Add contractor group
      </button>
    </div>
  );
}
