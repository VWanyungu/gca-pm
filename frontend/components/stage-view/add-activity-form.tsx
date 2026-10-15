"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import type { StageActivity, TeamMember } from "@/components/project-overview/types";

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface AddActivityFormProps {
  projectId: string;
  stageNo: number;
  stageName: string;
  team: TeamMember[];
  editing?: StageActivity;
  onDone: () => void;
  onCancel: () => void;
}

export function AddActivityForm({ projectId, stageNo, stageName, team, editing, onDone, onCancel }: AddActivityFormProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [ownerId, setOwnerId] = useState(editing?.owner_id ?? "");
  const [dueDate, setDueDate] = useState(editing?.due_date?.slice(0, 10) ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerOptions = team.map((m) => ({ id: m.user_id, name: `${m.first_name} ${m.last_name}` }));

  async function submit() {
    if (!title.trim() || !ownerId || !dueDate) {
      setError("Title, owner and due date are required");
      return;
    }
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      owner_id: ownerId,
      due_date: dueDate,
    };

    if (editing) {
      const res = await api.patch(`/projects/${projectId}/stage-activities/${editing.activity_id}`, body);
      setSaving(false);
      if (res.status !== "success") {
        setError(res.message || "Couldn't save the activity");
        return;
      }
      onDone();
      return;
    }

    if (file) {
      body.attachment = { file: await fileToDataUri(file), caption: file.name };
    }
    const res = await api.post(`/projects/${projectId}/stage-activities`, { ...body, stage_no: stageNo });
    setSaving(false);
    if (res.status !== "success") {
      setError(res.message || "Couldn't add the activity");
      return;
    }
    onDone();
  }

  return (
    <div className="flex w-full flex-col gap-[24px]">
      <button onClick={onCancel} className="flex items-center gap-[6px] text-[14px] font-medium text-gca-green">
        <ArrowLeft className="size-[13px]" />
        All activities
      </button>

      <div className="flex flex-col gap-[2px]">
        <h2 className="text-[20px] font-semibold text-gca-dark">{editing ? "Edit activity" : "New activity"}</h2>
        <p className="text-[14px] text-gca-show">{stageName}</p>
      </div>

      {error && <p className="rounded-[8px] bg-error-bg px-[14px] py-[10px] text-[13px] text-error-text">{error}</p>}

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Activity</p>
          <p className="mt-[4px] text-[13px] text-gca-show">What needs doing in this stage.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Title<span className="text-error-text">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Inspect valves at supplier"
              className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              rows={3}
              className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Owner and timing</p>
          <p className="mt-[4px] text-[13px] text-gca-show">One owner, one date. Overdue activities show on the overview.</p>
        </div>
        <div className="flex w-full max-w-[792px] gap-[16px]">
          <div className="flex w-full flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Owner<span className="text-error-text">*</span>
            </label>
            <Dropdown
              id="activity-owner"
              title="Choose owner"
              data={ownerOptions}
              selectedId={ownerId}
              style="h-[40px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px]"
              onSelect={(id) => setOwnerId(id)}
            />
          </div>
          <div className="flex w-full flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Due date<span className="text-error-text">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
        </div>
      </div>

      {!editing && (
        <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
          <div className="w-[280px] shrink-0">
            <p className="text-[14px] font-semibold text-gca-dark">Attachment</p>
            <p className="mt-[4px] text-[13px] text-gca-show">Specs, quotes or photos.</p>
          </div>
          <div className="w-full max-w-[792px]">
            <label className="flex h-[55px] w-full cursor-pointer items-center justify-center rounded-[8px] border border-dashed border-gca-border text-[13px] text-gca-show">
              {file ? file.name : (
                <>
                  Drop a file or <span className="pl-[4px] font-medium text-gca-green">browse</span>
                </>
              )}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-end gap-[16px] border-t border-gca-border pt-[20px]">
        <button onClick={onCancel} className="text-[14px] font-medium text-gca-show">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving}
          className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
        >
          {editing ? "Save changes" : "Add activity"}
        </button>
      </div>
    </div>
  );
}
