"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  useGateActivityTemplates,
  useCreateGateActivityTemplate,
  useUpdateGateActivityTemplate,
  useDeactivateGateActivityTemplate,
  type GateActivityTemplate,
} from "@/components/admin/use-gate-activity-templates-data";

export default function AdminGateActivitiesPage() {
  const { data: templates = [] } = useGateActivityTemplates(true);

  return (
    <main className="flex w-full overflow-hidden md:max-w-[1200px] flex-col gap-[32px] p-[20px] md:p-[40px]">
      <div>
        <h1 className="text-[24px] font-semibold text-gca-dark">Kickoff &amp; Closure activities</h1>
        <p className="text-[14px] text-gca-muted">
          Predefined activities copied onto every new project&apos;s Kickoff and Closure stages.
          Editing these never changes activities already created on an existing project.
        </p>
      </div>

      <TemplateSection
        stageNo={0}
        label="Kickoff"
        templates={templates.filter((t) => t.stage_no === 0)}
      />
      <TemplateSection
        stageNo={11}
        label="Closure"
        templates={templates.filter((t) => t.stage_no === 11)}
      />
    </main>
  );
}

function TemplateSection({
  stageNo,
  label,
  templates,
}: {
  stageNo: 0 | 11;
  label: string;
  templates: GateActivityTemplate[];
}) {
  const createTemplate = useCreateGateActivityTemplate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [dueOffsetDays, setDueOffsetDays] = useState("");

  const sorted = [...templates].sort((a, b) => a.sort_order - b.sort_order);

  async function handleAdd() {
    const trimmed = title.trim();
    if (!trimmed) return;
    await createTemplate.mutateAsync({
      stage_no: stageNo,
      title: trimmed,
      description: description.trim() || null,
      requires_attachment: requiresAttachment,
      due_offset_days: dueOffsetDays ? Number(dueOffsetDays) : null,
      sort_order: (Math.max(0, ...templates.map((t) => t.sort_order)) || 0) + 10,
    });
    setTitle("");
    setDescription("");
    setRequiresAttachment(false);
    setDueOffsetDays("");
  }

  return (
    <section className="flex flex-col gap-[16px]">
      <h2 className="text-[16px] font-semibold text-gca-dark">{label}</h2>

      <div className="flex flex-col gap-[8px] rounded-[12px] border border-gca-border p-[16px]">
        <div className="flex flex-col gap-[8px] sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Activity title"
            className="h-[40px] w-full sm:w-[260px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-[40px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-[16px]">
          <label className="flex items-center gap-[6px] text-[13px] text-gca-dark">
            <input
              type="checkbox"
              checked={requiresAttachment}
              onChange={(e) => setRequiresAttachment(e.target.checked)}
            />
            Must have attachment
          </label>
          <label className="flex items-center gap-[6px] text-[13px] text-gca-dark">
            Due
            <input
              type="number"
              min={0}
              value={dueOffsetDays}
              onChange={(e) => setDueOffsetDays(e.target.value)}
              placeholder="0"
              className="h-[32px] w-[70px] rounded-[6px] border border-gca-border px-[8px] text-[13px] outline-none"
            />
            days after project start
          </label>
          <button
            onClick={handleAdd}
            disabled={createTemplate.isPending || !title.trim()}
            className="relative ml-auto flex h-[36px] items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] text-[13px] font-medium text-gca-on-accent disabled:opacity-60"
          >
            <span className={createTemplate.isPending ? "invisible" : undefined}>Add activity</span>
            {createTemplate.isPending && (
              <LoaderCircle
                className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                aria-label="Adding activity"
              />
            )}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] overflow-scroll">
        <table className="w-max md:w-full text-left">
          <thead>
            <tr className="border-b border-gca-border text-[12px] font-medium tracking-[0.3px] text-gca-muted">
              <th className="w-max md:w-[280px] px-[16px] py-[10px]">Title</th>
              <th className="w-max md:w-[300px] px-[16px] py-[10px]">Description</th>
              <th className="w-max md:w-[140px] px-[16px] py-[10px]">Attachment</th>
              <th className="w-max md:w-[120px] px-[16px] py-[10px]">Due offset</th>
              <th className="w-max md:w-[100px] px-[16px] py-[10px]">Status</th>
              <th className="w-max md:w-[120px] px-[16px] py-[10px]" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((template) => (
              <TemplateRow key={template.template_id} template={template} />
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[16px] py-[24px] text-center text-[13px] text-gca-muted">
                  No activities yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TemplateRow({ template }: { template: GateActivityTemplate }) {
  const updateTemplate = useUpdateGateActivityTemplate(template.template_id);
  const deactivateTemplate = useDeactivateGateActivityTemplate();
  const [editingTitle, setEditingTitle] = useState<string | null>(null);

  async function saveTitle() {
    const trimmed = editingTitle?.trim();
    if (!trimmed || trimmed === template.title) {
      setEditingTitle(null);
      return;
    }
    await updateTemplate.mutateAsync({ title: trimmed });
    setEditingTitle(null);
  }

  return (
    <tr className="border-b border-gca-border last:border-b-0">
      <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
        {editingTitle !== null ? (
          <input
            autoFocus
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="h-[32px] w-full rounded-[6px] border border-gca-border px-[8px] text-[13px] outline-none"
          />
        ) : (
          <button type="button" onClick={() => setEditingTitle(template.title)} className="text-left">
            {template.title}
          </button>
        )}
      </td>
      <td className="px-[16px] py-[12px] text-[13px] text-gca-muted">{template.description ?? "—"}</td>
      <td className="px-[16px] py-[12px] text-[13px]">
        <input
          type="checkbox"
          checked={template.requires_attachment}
          disabled={updateTemplate.isPending}
          onChange={(e) => updateTemplate.mutate({ requires_attachment: e.target.checked })}
        />
      </td>
      <td className="px-[16px] py-[12px] text-[13px] text-gca-muted">
        {template.due_offset_days != null ? `${template.due_offset_days} days` : "—"}
      </td>
      <td className="px-[16px] py-[12px] text-[13px]">
        {template.is_active ? (
          <span className="text-gca-green">Active</span>
        ) : (
          <span className="text-gca-muted">Inactive</span>
        )}
      </td>
      <td className="px-[16px] py-[12px] text-right">
        <button
          type="button"
          disabled={deactivateTemplate.isPending || updateTemplate.isPending}
          onClick={() =>
            template.is_active
              ? deactivateTemplate.mutate(template.template_id)
              : updateTemplate.mutate({ is_active: true })
          }
          className="inline-flex items-center gap-[6px] text-[13px] font-medium text-error-text disabled:opacity-40"
        >
          <span className="flex size-[13px] shrink-0 items-center justify-center">
            {(deactivateTemplate.isPending || updateTemplate.isPending) && (
              <LoaderCircle className="size-[13px] animate-spin" />
            )}
          </span>
          {template.is_active ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}
