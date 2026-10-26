"use client";

import type { DprDraftInput } from "../types";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
}

/** Comma-separated so the daily report can list each entry on its own line. */
const FIELDS: { key: keyof DprDraftInput; label: string; placeholder: string }[] = [
  {
    key: "equipment_text",
    label: "Equipment",
    placeholder: "Comma separated, e.g. Excavator, Concrete mixer, Dumper truck",
  },
  {
    key: "visitors_text",
    label: "Visitors",
    placeholder: "Comma separated, e.g. County inspector, Client rep",
  },
  {
    key: "delays_text",
    label: "Delays",
    placeholder: "Comma separated, e.g. Late cement delivery, Power outage",
  },
  {
    key: "incidents_text",
    label: "Incidents",
    placeholder: "Comma separated, e.g. Near miss at trench edge",
  },
  {
    key: "materials_rejected_text",
    label: "Materials rejected",
    placeholder: "Delivered items rejected today, comma separated, e.g. 20 bags cement - damp",
  },
  { key: "other_notes_text", label: "Other notes", placeholder: "Anything else worth noting" },
];

export function EquipmentNotesStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-[16px]">
      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key} className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-gca-dark">{label}</label>
          <textarea
            value={(draft[key] as string | null) ?? ""}
            onChange={(e) => update({ [key]: e.target.value } as Partial<DprDraftInput>)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-[8px] border border-gca-border bg-gca-surface p-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
          />
        </div>
      ))}
    </div>
  );
}
