"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ClipboardList, FilePlus2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { canAccess, CAN_CREATE_DPR } from "@/lib/access-control";
import { reportError } from "@/lib/toast";
import Dropdown from "@/components/Dropdown";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { Pagination } from "@/components/pagination";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import { useProjectDetail, useSidebarCounts } from "@/components/project-overview/use-project-data";
import { useDprs } from "@/components/weekly-submission/use-weekly-submission-data";
import type { DprAmendment, DprSummary } from "@/components/weekly-submission/types";
import { DprNewWizard } from "@/components/engineer-dpr/dpr-new-wizard";
import { DprEditWizard } from "@/components/engineer-dpr/dpr-edit-wizard";
import { useDprInvalidate } from "@/components/engineer-dpr/use-dpr-wizard-data";
import { todayInTimezone } from "@/components/engineer-dpr/types";
import {
  useDecideDprAmendment,
  useDeleteDpr,
  useDprAmendments,
  useMissedDprDates,
} from "./use-dpr-actions";

type SubView =
  | { mode: "list" }
  | { mode: "new"; reportDate: string }
  | { mode: "edit"; dprId: string; amendmentMode?: boolean };

type DprRow = { type: "dpr"; dpr: DprSummary } | { type: "missed"; date: string };

/** Matches the server's max (listDprsQuerySchema) — the merged list pages client-side, so it
 *  needs every DPR, not a page of them. */
const ALL_DPRS_LIMIT = 1000;

const STATUS_FILTER_ALL = "all";
const STATUS_OPTIONS = [
  { id: STATUS_FILTER_ALL, name: "All status" },
  { id: "draft", name: "Draft" },
  { id: "submitted", name: "Submitted" },
  { id: "missed", name: "Missed" },
];

function DprDeleteModal({
  projectId,
  dpr,
  onClose,
}: {
  projectId: string;
  dpr: DprSummary;
  onClose: () => void;
}) {
  const deleteDpr = useDeleteDpr(projectId);

  async function handleConfirm() {
    try {
      await deleteDpr.mutateAsync(dpr.dpr_id);
      onClose();
    } catch (error) {
      reportError(error instanceof Error ? error.message : "Could not delete draft DPR");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">Delete draft DPR?</h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          This draft for {formatDate(dpr.report_date)} will be permanently removed. This cannot be
          undone.
        </p>
        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={deleteDpr.isPending}
            className="rounded-[8px] bg-error-border px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-40"
          >
            Delete draft
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusInfo(dpr: DprSummary): { label: string; className: string } {
  if (dpr.status === "draft") return { label: "Draft", className: "text-gca-muted" };
  if (dpr.is_late) return { label: "Submitted late", className: "text-gca-warning" };
  return { label: "Submitted", className: "text-gca-green" };
}

export function DprListView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  // The inline wizard borrows the engineers' one-step-at-a-time flow on a phone; the
  // full-page layout needs the width its section rail assumes.
  const isMobile = useIsMobile();
  const { data: project } = useProjectDetail(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const invalidateDprs = useDprInvalidate(projectId);
  function backToList() {
    invalidateDprs();
    setSubView({ mode: "list" });
  }
  const [dprToDelete, setDprToDelete] = useState<DprSummary | null>(null);
  const [rejectingAmendmentId, setRejectingAmendmentId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const showRealDprs = statusFilter !== "missed";
  const showMissed = statusFilter === STATUS_FILTER_ALL || statusFilter === "missed";
  // Filed DPRs and missed dates are one chronological list to the reader, so paging happens
  // over the merged rows below. Missed dates exist only client-side, so the whole DPR list
  // has to come down in one request for the merge to be complete.
  const { data } = useDprs({
    projectId,
    status: statusFilter === "draft" || statusFilter === "submitted" ? statusFilter : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page: 1,
    limit: ALL_DPRS_LIMIT,
  });

  const canCreate = canAccess(user?.role, CAN_CREATE_DPR, { projectId });
  const canRequestAsPm = canAccess(user?.role, [{ role: "PM", scopeType: "project" }], {
    projectId,
  });
  const isAdmin = !!user?.role.some(
    (grant) => grant.role === "Admin" && grant.scope_type === "global",
  );
  const canDecideAmendments = canRequestAsPm || isAdmin;
  // Missed days are part of the record for whoever is reading it — a PM chasing a gap needs
  // them as much as the engineer who would fill it.
  const { data: allMissedDates = [] } = useMissedDprDates(projectId, true);
  const { data: amendments = [] } = useDprAmendments(projectId, canCreate || canDecideAmendments);
  const deleteDpr = useDeleteDpr(projectId);
  const decideAmendment = useDecideDprAmendment(projectId);
  const dprs = showRealDprs ? (data?.dprs ?? []) : [];
  const pendingByDpr = new Map(amendments.map((amendment) => [amendment.dpr_id, amendment]));

  const missedDates = showMissed
    ? allMissedDates.filter(
        (date) => (!fromDate || date >= fromDate) && (!toDate || date <= toDate),
      )
    : [];

  const allRows: DprRow[] = [
    ...dprs.map((dpr): DprRow => ({ type: "dpr", dpr })),
    ...missedDates.map((date): DprRow => ({ type: "missed", date })),
  ].sort((a, b) => {
    const dateA = a.type === "dpr" ? a.dpr.report_date.slice(0, 10) : a.date;
    const dateB = b.type === "dpr" ? b.dpr.report_date.slice(0, 10) : b.date;
    return dateB.localeCompare(dateA);
  });

  const total = allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const rows = allRows.slice((currentPage - 1) * perPage, currentPage * perPage);
  const hasActiveFilters = statusFilter !== STATUS_FILTER_ALL || !!fromDate || !!toDate;

  if (!project) return null;

  function changeFilter<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  async function deleteDraft(dpr: DprSummary) {
    setDprToDelete(dpr);
  }

  async function decide(amendment: DprAmendment, decision: "approve" | "reject") {
    if (decision === "reject" && !decisionNote.trim()) {
      reportError("Please enter a reason for rejecting this amendment");
      return;
    }
    try {
      await decideAmendment.mutateAsync({
        amendmentId: amendment.amendment_id,
        decision,
        decisionNote: decisionNote.trim() || undefined,
      });
      setRejectingAmendmentId(null);
      setDecisionNote("");
    } catch (error) {
      reportError(error instanceof Error ? error.message : "Could not decide amendment");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="dpr" />

      <div className="flex w-full min-w-0 justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
          {subView.mode === "new" ? (
            <DprNewWizard
              key={subView.reportDate}
              projectId={projectId}
              reportDate={subView.reportDate}
              layout={isMobile ? "steps" : "full"}
              onClose={backToList}
              onSubmitted={(dprId) => router.push(`/projects/${projectId}/dpr/${dprId}?back=dpr`)}
            />
          ) : subView.mode === "edit" ? (
            <DprEditWizard
              key={`${subView.dprId}:${subView.amendmentMode ?? false}`}
              projectId={projectId}
              dprId={subView.dprId}
              amendmentMode={subView.amendmentMode}
              layout={isMobile ? "steps" : "full"}
              onClose={backToList}
              onSubmitted={(dprId) => router.push(`/projects/${projectId}/dpr/${dprId}?back=dpr`)}
              onAmendmentRequested={backToList}
            />
          ) : (
            <>
              <div className="flex w-full flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
                  Daily progress reports
                </h1>
                {canCreate && (
                  <button
                    onClick={() =>
                      setSubView({
                        mode: "new",
                        reportDate: todayInTimezone(project.project.timezone),
                      })
                    }
                    className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[12px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover sm:w-auto sm:py-[10px]"
                  >
                    <Plus className="size-[14px]" />
                    New DPR
                  </button>
                )}
              </div>

              {/* A native date input needs ~180px with its label, so the three filters get
                  their own row each on a phone rather than sharing one and clipping. */}
              <MobileFilterToggle>
                <div className="flex flex-col items-stretch gap-[12px] sm:flex-row sm:flex-wrap sm:items-center">
                  <Dropdown
                    id="dpr-filter-status"
                    data={STATUS_OPTIONS}
                    selectedId={statusFilter}
                    style="h-[40px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
                    onSelect={(id) => changeFilter(setStatusFilter, id)}
                  />
                  <label className="flex h-[40px] min-w-0 items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px]">
                    <span className="text-[13px] text-gca-muted">From</span>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(event) => {
                        setFromDate(event.target.value);
                        setToDate(event.target.value);
                        setPage(1);
                      }}
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-gca-dark outline-none sm:flex-none"
                    />
                  </label>
                  <label className="flex h-[40px] min-w-0 items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px]">
                    <span className="text-[13px] text-gca-muted">To</span>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(event) => changeFilter(setToDate, event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-[14px] text-gca-dark outline-none sm:flex-none"
                    />
                  </label>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        changeFilter(setStatusFilter, STATUS_FILTER_ALL);
                        setFromDate("");
                        setToDate("");
                      }}
                      className="cursor-pointer text-[13px] font-medium text-gca-green"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </MobileFilterToggle>

              {canDecideAmendments && amendments.length > 0 && (
                <section className="flex flex-col gap-[10px] rounded-[12px] bg-gca-surface">
                  <h2 className="text-[15px] font-semibold text-gca-dark">
                    Amendment requests{" "}
                    {/* <span className="text-gca-warning">({amendments.length})</span> */}
                  </h2>
                  {amendments.map((amendment) => (
                    <div
                      key={amendment.amendment_id}
                      className="flex flex-col gap-[10px] border-t border-gca-border pt-[12px]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-[8px]">
                        <div>
                          <p className="text-[13px] font-semibold text-gca-dark">
                            {/* {amendment.dpr_ref ?? "DPR"} · */}
                            {formatDate(amendment.report_date ?? "")}
                          </p>
                          <p className="text-[12px] text-gca-muted">
                            Requested by {amendment.requester_name ?? "Engineer"}
                            {/* ·{" "} {new Date(amendment.requested_at).toLocaleDateString("en-GB")} */}
                          </p>
                        </div>
                        <div className="flex gap-[8px]">
                          <button
                            type="button"
                            onClick={() =>
                              setRejectingAmendmentId(
                                rejectingAmendmentId === amendment.amendment_id
                                  ? null
                                  : amendment.amendment_id,
                              )
                            }
                            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[13px] font-semibold text-gca-dark"
                          >
                            <X className="size-[14px]" />
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => void decide(amendment, "approve")}
                            disabled={decideAmendment.isPending}
                            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] bg-gca-green px-[12px] py-[8px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50"
                          >
                            <Check className="size-[14px]" />
                            Approve
                          </button>
                        </div>
                      </div>
                      <p className="text-[13px] text-gca-dark">{amendment.reason}</p>
                      {/* <details className="text-[13px] text-gca-show">
                        <summary className="cursor-pointer font-medium">
                          Review proposed DPR
                        </summary>
                        <pre className="mt-[8px] max-h-[280px] overflow-auto rounded-[8px] bg-gca-page-bg p-[12px] text-[11px]">
                          {JSON.stringify(amendment.proposed_document, null, 2)}
                        </pre>
                      </details> */}
                      {rejectingAmendmentId === amendment.amendment_id && (
                        <div className="flex flex-col gap-[8px] rounded-[8px]">
                          <label
                            htmlFor={`amendment-decision-note-${amendment.amendment_id}`}
                            className="text-[13px] font-medium text-gca-dark"
                          >
                            Reason for rejection
                          </label>
                          <textarea
                            id={`amendment-decision-note-${amendment.amendment_id}`}
                            value={decisionNote}
                            onChange={(event) => setDecisionNote(event.target.value)}
                            rows={2}
                            maxLength={10000}
                            className="rounded-[8px] border border-gca-border bg-gca-surface px-[10px] py-[8px] text-[13px] outline-none focus:border-gca-green"
                          />
                          <div className="flex justify-end gap-[8px]">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAmendmentId(null);
                                setDecisionNote("");
                              }}
                              className="cursor-pointer px-[10px] py-[6px] text-[13px] text-gca-show"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void decide(amendment, "reject")}
                              disabled={!decisionNote.trim() || decideAmendment.isPending}
                              className="cursor-pointer rounded-[6px] bg-error-text px-[12px] py-[7px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50"
                            >
                              Confirm rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}

              {rows.length === 0 ? (
                <div className="flex flex-col items-center gap-[16px] py-[56px]">
                  <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
                    <ClipboardList className="size-[18px] text-gca-green" />
                  </span>
                  <div className="flex flex-col items-center gap-[4px] text-center">
                    <p className="text-[14px] font-semibold text-gca-dark">
                      {hasActiveFilters ? "No DPRs match these filters" : "No DPRs yet"}
                    </p>
                    <p className="max-w-[420px] text-[13px] text-gca-show">
                      {hasActiveFilters
                        ? "Try a different status or date range."
                        : "Daily progress reports submitted for this project will show up here."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col">
                  {/* No column headings on a phone — each row carries its own labels there. */}
                  <div className="hidden w-full items-center justify-between gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted md:flex">
                    <p className="w-[18%]">Reference</p>
                    <p className="w-[24%]">Date</p>
                    <p className="w-[22%]">Site</p>
                    <p className="w-[16%]">Status</p>
                    <p className="w-[20%] text-center"></p>
                  </div>
                  {rows.map((row, i) => {
                    if (row.type === "missed") {
                      return (
                        <div key={row.date} className={i > 0 ? "border-t border-gca-border" : ""}>
                          {/* Phone: the date leads and the only action for a gap sits beside
                              it, since there is no header row to read columns against. */}
                          <div className="flex items-center justify-between gap-[12px] py-[14px] md:hidden">
                            <button
                              type="button"
                              onClick={() => setSubView({ mode: "new", reportDate: row.date })}
                              className="flex min-w-0 cursor-pointer flex-col items-start gap-[2px] text-left"
                            >
                              <span className="text-[15px] font-semibold text-gca-dark">
                                {formatDate(row.date)}
                              </span>
                              <span className="text-[12px] font-semibold text-error-text">
                                Missed
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={`Submit DPR for ${formatDate(row.date)}`}
                              onClick={() => setSubView({ mode: "new", reportDate: row.date })}
                              className="flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[13px] font-semibold text-gca-dark"
                            >
                              <FilePlus2 className="size-[14px]" />
                              Submit
                            </button>
                          </div>
                          <div className="hidden w-full items-center gap-[10px] py-[12px] md:flex">
                            {/* <button
                              type="button"
                              onClick={() => setSubView({ mode: "new", reportDate: row.date })}
                              className="flex min-w-0 w-[80%] cursor-pointer items-center gap-[10px] text-left"
                            > */}
                            <span className="w-[18%] truncate text-[13px] font-medium text-gca-dark">
                              —
                            </span>
                            <span
                              className="w-[24%] text-[13px] text-gca-dark"
                              onClick={() => setSubView({ mode: "new", reportDate: row.date })}
                            >
                              {formatDate(row.date)}
                            </span>
                            <span className="w-[22%] truncate text-[13px] text-gca-dark">—</span>
                            <span className="w-[16%] text-[13px] font-semibold text-error-text">
                              Missed
                            </span>
                            {/* </button> */}
                            <div className="flex w-[20%] justify-end gap-[6px]">
                              <button
                                type="button"
                                aria-label={`Submit DPR for ${formatDate(row.date)}`}
                                title="Submit"
                                onClick={() => setSubView({ mode: "new", reportDate: row.date })}
                                className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-gca-border px-[10px] py-[6px] text-[12px] font-semibold text-gca-dark hover:bg-gca-page-bg"
                              >
                                <FilePlus2 className="size-[13px]" />
                                Submit
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const dpr = row.dpr;
                    const status = statusInfo(dpr);
                    const isAuthor = dpr.author_id === user?.userId;
                    const canEditDraft = dpr.status === "draft" && (isAuthor || isAdmin);
                    const canRequestEdit =
                      dpr.status === "submitted" &&
                      (isAuthor || canRequestAsPm || isAdmin) &&
                      !pendingByDpr.has(dpr.dpr_id);
                    const pending = pendingByDpr.get(dpr.dpr_id);
                    const openDpr = () =>
                      dpr.status === "draft"
                        ? setSubView({ mode: "edit", dprId: dpr.dpr_id })
                        : router.push(`/projects/${projectId}/dpr/${dpr.dpr_id}?back=dpr`);
                    // Written once and placed in both the phone card and the desktop row.
                    const rowActions = (
                      <>
                        {canEditDraft && (
                          <>
                            <button
                              type="button"
                              aria-label={`Edit draft DPR for ${formatDate(dpr.report_date)}`}
                              title="Edit draft"
                              onClick={() => setSubView({ mode: "edit", dprId: dpr.dpr_id })}
                              className="flex size-[32px] cursor-pointer items-center justify-center rounded-[6px] text-gca-show hover:bg-gca-page-bg"
                            >
                              <Pencil className="size-[15px]" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Delete draft DPR for ${formatDate(dpr.report_date)}`}
                              title="Delete draft"
                              disabled={deleteDpr.isPending}
                              onClick={() => void deleteDraft(dpr)}
                              className="flex size-[32px] cursor-pointer items-center justify-center rounded-[6px] text-error-text hover:bg-error-bg disabled:opacity-50"
                            >
                              <Trash2 className="size-[15px]" />
                            </button>
                          </>
                        )}
                        {canRequestEdit && (
                          <button
                            type="button"
                            aria-label={`Request edit for ${formatDate(dpr.report_date)}`}
                            title="Request amendment"
                            onClick={() =>
                              setSubView({
                                mode: "edit",
                                dprId: dpr.dpr_id,
                                amendmentMode: true,
                              })
                            }
                            className="flex size-[32px] cursor-pointer items-center justify-center rounded-[6px] text-gca-show hover:bg-gca-page-bg"
                          >
                            <Pencil className="size-[15px]" />
                          </button>
                        )}
                      </>
                    );
                    return (
                      <div key={dpr.dpr_id} className={i > 0 ? "border-t border-gca-border" : ""}>
                        {/* Phone: date and status on the first line, reference and site as a
                            quiet second line, actions beside them. */}
                        <div className="flex flex-col gap-[6px] py-[14px] md:hidden">
                          <div className="flex items-start justify-between gap-[12px]">
                            <button
                              type="button"
                              onClick={openDpr}
                              className="min-w-0 cursor-pointer text-left text-[15px] font-semibold text-gca-dark"
                            >
                              {formatDate(dpr.report_date)}
                            </button>
                            <span
                              className={`shrink-0 text-[12px] font-semibold ${status.className}`}
                            >
                              {pending ? "Amendment pending" : status.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-[12px]">
                            <p className="min-w-0 truncate text-[12px] text-gca-muted">
                              {dpr.dpr_ref ?? "—"} · {dpr.site_location}
                            </p>
                            <div className="flex shrink-0 gap-[6px]">{rowActions}</div>
                          </div>
                        </div>

                        <div className="hidden w-full items-center justify-between gap-[10px] py-[12px] md:flex">
                          <span className="w-[18%] truncate text-[13px] font-medium text-gca-dark">
                            {dpr.dpr_ref ?? "—"}
                          </span>
                          <button
                            type="button"
                            className="w-[24%] cursor-pointer text-left text-[13px] text-gca-dark"
                            onClick={openDpr}
                          >
                            {formatDate(dpr.report_date)}
                          </button>
                          <span className="w-[22%] truncate text-[13px] text-gca-dark">
                            {dpr.site_location}
                          </span>
                          <span className={`w-[16%] text-[13px] font-semibold ${status.className}`}>
                            {pending ? "Amendment pending" : status.label}
                          </span>
                          <div className="flex w-[20%] justify-end gap-[6px]">{rowActions}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  perPage={perPage}
                  total={total}
                  onPageChange={setPage}
                  onPerPageChange={(n) => {
                    setPerPage(n);
                    setPage(1);
                  }}
                  label="entries"
                />
              )}
            </>
          )}

          {dprToDelete && (
            <DprDeleteModal
              projectId={projectId}
              dpr={dprToDelete}
              onClose={() => {
                setDprToDelete(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
