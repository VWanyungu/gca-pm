"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import Dropdown from "@/components/Dropdown";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import { useProjectDetail, useProjectTeam, useClientContacts } from "@/components/project-overview/use-project-data";
import { initials, type TeamMember } from "@/components/project-overview/types";

interface UserOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

function useAllUsers() {
  return useQuery({
    queryKey: ["users", "assignable"],
    queryFn: async () => {
      const res = await api.get<{ response: { users: UserOption[] } }>("/users?type=multiple&limit=100");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.response.users;
    },
  });
}

function mainOf(members: TeamMember[]): TeamMember | undefined {
  return [...members].sort((a, b) => new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime())[0];
}

export default function TeamView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: clientContacts = [] } = useClientContacts(projectId);
  const { data: users = [] } = useAllUsers();

  const [editMode, setEditMode] = useState(false);
  const [addingEngineer, setAddingEngineer] = useState(false);
  const [newEngineerId, setNewEngineerId] = useState("");
  const [addingPm, setAddingPm] = useState(false);
  const [newPmId, setNewPmId] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [contactDraft, setContactDraft] = useState({ name: "", title: "", email: "" });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  }

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const pms = team.filter((m) => m.role === "PM");
  const planners = team.filter((m) => m.role === "Planner");
  const engineers = team.filter((m) => m.role === "SiteEngineer");
  const mainPm = mainOf(pms);
  const mainPlanner = mainOf(planners);

  const userOptions = users.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }));
  const assignableForPm = users.filter((u) => !pms.some((p) => p.user_id === u.id));
  const assignableForEngineer = users.filter((u) => !engineers.some((e) => e.user_id === u.id));

  async function removeRole(attributeId: string) {
    await api.delete(`/roles/${attributeId}`);
    invalidate();
  }

  async function addEngineer() {
    if (!newEngineerId) return;
    await api.post("/roles", { userId: newEngineerId, role: "SiteEngineer", scopeType: "project", projectId });
    setNewEngineerId("");
    setAddingEngineer(false);
    invalidate();
  }

  async function addPm() {
    if (!newPmId) return;
    await api.post("/roles", { userId: newPmId, role: "PM", scopeType: "project", projectId });
    setNewPmId("");
    setAddingPm(false);
    invalidate();
  }

  async function reassignMain(role: "PM" | "Planner", current: TeamMember | undefined, nextUserId: string) {
    if (!nextUserId || nextUserId === current?.user_id) return;
    if (current) await api.delete(`/roles/${current.attribute_id}`, { reason: "Reassigned main " + role });
    await api.post("/roles", { userId: nextUserId, role, scopeType: "project", projectId });
    invalidate();
  }

  async function addContact() {
    if (!contactDraft.name.trim() || !contactDraft.email.trim()) return;
    await api.post(`/projects/${projectId}/client-contacts`, {
      name: contactDraft.name,
      email: contactDraft.email,
      title: contactDraft.title || null,
    });
    setContactDraft({ name: "", title: "", email: "" });
    setAddingContact(false);
    invalidate();
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "client-contacts"] });
  }

  async function removeContact(contactId: string) {
    await api.delete(`/projects/${projectId}/client-contacts/${contactId}`);
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "client-contacts"] });
  }

  if (!project) return null;

  const total = team.length + clientContacts.length;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} active="team" />

      <main className="flex w-full flex-col gap-[20px] p-[40px]">
        <Link href={`/projects/${projectId}`} className="flex items-center gap-[6px] text-[14px] font-medium text-gca-show">
          ← Overview
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">Team</h1>
            <p className="text-[14px] text-gca-show">
              {total} people{clientContacts.length > 0 ? ` · ${clientContacts.length} from the client` : ""}
            </p>
          </div>
          {canManage &&
            (editMode ? (
              <div className="flex items-center gap-[8px]">
                <button onClick={() => setEditMode(false)} className="text-[14px] font-medium text-gca-show">
                  Cancel
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
                >
                  Save changes
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="rounded-[8px] border border-gca-border px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
              >
                Edit team
              </button>
            ))}
        </div>

        <div className="grid w-full grid-cols-[1fr_1fr_1fr_120px] gap-x-[16px] border-b border-gca-border pb-[8px] text-[12px] font-medium text-gca-muted">
          <span>Person</span>
          <span>Role</span>
          <span>Site / organisation</span>
          <span>Added</span>
        </div>

        <TeamGroup
          title="Project management"
          count={pms.length}
          editMode={editMode}
          mainLabel="Main PM"
          mainValue={mainPm?.user_id}
          onReassignMain={(id) => reassignMain("PM", mainPm, id)}
          userOptions={userOptions}
        >
          {pms.map((m) => (
            <PersonRow
              key={m.attribute_id}
              member={m}
              isMain={m.attribute_id === mainPm?.attribute_id}
              roleLabel="Project Manager"
              site="All sites"
              editMode={editMode}
              onRemove={() => removeRole(m.attribute_id)}
            />
          ))}
          {editMode &&
            (addingPm ? (
              <AddRow
                options={assignableForPm.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))}
                value={newPmId}
                onChange={setNewPmId}
                onAdd={addPm}
                onCancel={() => setAddingPm(false)}
              />
            ) : (
              <AddLink label="Add a project manager" onClick={() => setAddingPm(true)} />
            ))}
        </TeamGroup>

        <TeamGroup
          title="Planning"
          count={planners.length}
          editMode={editMode}
          mainLabel="Main Planner"
          mainValue={mainPlanner?.user_id}
          onReassignMain={(id) => reassignMain("Planner", mainPlanner, id)}
          userOptions={userOptions}
        >
          {planners.map((m) => (
            <PersonRow
              key={m.attribute_id}
              member={m}
              isMain={m.attribute_id === mainPlanner?.attribute_id}
              roleLabel="Planner"
              site="Schedule"
              editMode={editMode}
              onRemove={() => removeRole(m.attribute_id)}
            />
          ))}
        </TeamGroup>

        <TeamGroup title="Site engineers" count={engineers.length} editMode={editMode}>
          {engineers.map((m) => (
            <PersonRow
              key={m.attribute_id}
              member={m}
              roleLabel="Site Engineer"
              site="—"
              editMode={editMode}
              onRemove={() => removeRole(m.attribute_id)}
            />
          ))}
          {editMode &&
            (addingEngineer ? (
              <AddRow
                options={assignableForEngineer.map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))}
                value={newEngineerId}
                onChange={setNewEngineerId}
                onAdd={addEngineer}
                onCancel={() => setAddingEngineer(false)}
              />
            ) : (
              <AddLink label="Add an engineer" onClick={() => setAddingEngineer(true)} />
            ))}
        </TeamGroup>

        <TeamGroup title="Client" count={clientContacts.length} editMode={editMode}>
          {clientContacts.map((c) => (
            <div key={c.contact_id} className="grid w-full grid-cols-[1fr_1fr_1fr_120px] items-center gap-x-[16px] py-[13px]">
              <div className="flex items-center gap-[10px]">
                <span className="flex size-[32px] items-center justify-center rounded-full bg-[#fff4e5] text-[12px] font-semibold text-gca-warning">
                  {initials(c.name.split(" ")[0] ?? "", c.name.split(" ")[1] ?? "")}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-gca-dark">{c.name}</p>
                  <p className="text-[12px] text-gca-muted">{c.email}</p>
                </div>
              </div>
              <span className="text-[14px] text-gca-show">{c.title ?? "—"}</span>
              <span className="text-[14px] text-gca-show">{project.project.client_name ?? "—"}</span>
              {editMode ? (
                <button onClick={() => removeContact(c.contact_id)} className="justify-self-start">
                  <X className="size-[14px] text-gca-muted" />
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {editMode &&
            (addingContact ? (
              <div className="flex items-center gap-[8px] rounded-[8px] bg-gca-page-bg p-[10px]">
                <input
                  value={contactDraft.name}
                  onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })}
                  placeholder="Full name"
                  className="h-[36px] w-[160px] rounded-[6px] border border-gca-border px-[10px] text-[13px] outline-none"
                />
                <input
                  value={contactDraft.title}
                  onChange={(e) => setContactDraft({ ...contactDraft, title: e.target.value })}
                  placeholder="Role"
                  className="h-[36px] w-[120px] rounded-[6px] border border-gca-border px-[10px] text-[13px] outline-none"
                />
                <input
                  value={contactDraft.email}
                  onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })}
                  placeholder="Email"
                  className="h-[36px] flex-1 rounded-[6px] border border-gca-border px-[10px] text-[13px] outline-none"
                />
                <button onClick={addContact} className="rounded-[6px] bg-gca-green px-[12px] py-[8px] text-[13px] font-semibold text-white">
                  Add
                </button>
                <button onClick={() => setAddingContact(false)} className="text-[13px] font-medium text-gca-show">
                  Cancel
                </button>
              </div>
            ) : (
              <AddLink label="Add a client contact" onClick={() => setAddingContact(true)} />
            ))}
        </TeamGroup>

        {editMode && (
          <p className="text-[12px] text-gca-muted">
            Changing the main PM or main Planner moves their access. The change is logged.
          </p>
        )}
      </main>
    </div>
  );
}

function TeamGroup({
  title,
  count,
  editMode,
  mainLabel,
  mainValue,
  onReassignMain,
  userOptions,
  children,
}: {
  title: string;
  count: number;
  editMode: boolean;
  mainLabel?: string;
  mainValue?: string;
  onReassignMain?: (id: string) => void;
  userOptions?: { id: string; name: string }[];
  children: React.ReactNode;
}) {
  if (count === 0 && !editMode) return null;
  return (
    <div className="flex flex-col gap-[4px]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-[6px] text-[13px] font-semibold text-gca-dark">
          {title} <span className="text-gca-muted">{count}</span>
        </p>
        {editMode && mainLabel && onReassignMain && userOptions && (
          <div className="flex items-center gap-[8px]">
            <span className="text-[12px] text-gca-muted">{mainLabel}</span>
            <Dropdown
              id={`main-${mainLabel}`}
              data={userOptions}
              selectedId={mainValue}
              style="h-[32px] w-[180px] rounded-[6px] border border-gca-border px-[10px] text-[13px]"
              onSelect={(id) => onReassignMain(id)}
            />
          </div>
        )}
      </div>
      <div className="flex flex-col divide-y divide-gca-border">{children}</div>
    </div>
  );
}

function PersonRow({
  member,
  isMain,
  roleLabel,
  site,
  editMode,
  onRemove,
}: {
  member: TeamMember;
  isMain?: boolean;
  roleLabel: string;
  site: string;
  editMode: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="grid w-full grid-cols-[1fr_1fr_1fr_120px] items-center gap-x-[16px] py-[13px]">
      <div className="flex items-center gap-[10px]">
        <span className="flex size-[32px] items-center justify-center rounded-full bg-gca-badge-bg text-[12px] font-semibold text-gca-badge-text">
          {initials(member.first_name, member.last_name)}
        </span>
        <div>
          <p className="text-[14px] font-medium text-gca-dark">
            {member.first_name} {member.last_name}
          </p>
          <p className="text-[12px] text-gca-muted">{member.email}</p>
        </div>
      </div>
      <span className="flex items-center gap-[6px] text-[14px] text-gca-show">
        {roleLabel}
        {isMain && <span className="text-[12px] font-semibold text-gca-green">Main</span>}
      </span>
      <span className="text-[14px] text-gca-show">{site}</span>
      {editMode && !isMain ? (
        <button onClick={onRemove} className="justify-self-start">
          <X className="size-[14px] text-gca-muted" />
        </button>
      ) : (
        <span className="text-[12px] text-gca-muted">{new Date(member.granted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
      )}
    </div>
  );
}

function AddLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-[6px] py-[10px] text-[13px] font-medium text-gca-green">
      <Plus className="size-[12px]" />
      {label}
    </button>
  );
}

function AddRow({
  options,
  value,
  onChange,
  onAdd,
  onCancel,
}: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-[8px] rounded-[8px] bg-gca-page-bg p-[10px]">
      <Dropdown
        id="add-member"
        title="Choose a person"
        data={options}
        selectedId={value}
        style="h-[36px] w-[220px] rounded-[6px] border border-gca-border px-[10px] text-[13px]"
        onSelect={(id) => onChange(id)}
      />
      <button onClick={onAdd} className="rounded-[6px] bg-gca-green px-[12px] py-[8px] text-[13px] font-semibold text-white">
        Add
      </button>
      <button onClick={onCancel} className="text-[13px] font-medium text-gca-show">
        Cancel
      </button>
    </div>
  );
}
