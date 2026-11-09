"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, MessageSquare, Star, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_REQUEST_CLIENT_FEEDBACK } from "@/lib/access-control";
import { reportError } from "@/lib/toast";
import {
  useProjectDetail,
  useClientContacts,
} from "@/components/project-overview/use-project-data";
import { useFeedbackRequests } from "./use-client-feedback";
import { RequestFeedbackPopover } from "./request-feedback-popover";
import { DeleteFeedbackRequestModal } from "./delete-feedback-request-modal";
import { feedbackLink, statusLabel, formatShortDate } from "./types";
import type { FeedbackRequest } from "./types";

function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="text-[13px] text-gca-muted">—</span>;
  const rounded = Math.round(value);
  return (
    <span className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          style={{ width: size, height: size }}
          className={
            n <= rounded ? "fill-gca-warning text-gca-warning" : "fill-none text-gca-border"
          }
        />
      ))}
    </span>
  );
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-gca-show">{label}</span>
        <span className="font-semibold text-gca-dark">
          {value != null ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div className="h-[6px] w-full overflow-hidden rounded-full bg-gca-page-bg">
        <div
          className="h-full rounded-full bg-gca-green"
          style={{ width: value != null ? `${(value / 5) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

export function ClientFeedbackView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: contacts = [] } = useClientContacts(projectId);
  const { data } = useFeedbackRequests(projectId);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedbackRequest | null>(null);
  const [copiedRequestId, setCopiedRequestId] = useState<string | null>(null);

  const canRequest = canAccess(user?.role, CAN_REQUEST_CLIENT_FEEDBACK, { projectId });

  async function copyFeedbackLink(request: FeedbackRequest) {
    try {
      await navigator.clipboard.writeText(feedbackLink(request.token));
      setCopiedRequestId(request.request_id);
      setTimeout(
        () => setCopiedRequestId((current) => (current === request.request_id ? null : current)),
        1500,
      );
    } catch (error) {
      reportError(error instanceof Error ? error.message : "Could not copy feedback link");
    }
  }

  if (!project) return null;

  const requests = data?.requests ?? [];
  const summary = data?.summary;
  const comments = requests.filter((r) => r.comment?.trim());

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div>
          <h1 className="text-[22px] font-semibold text-gca-dark">Client feedback</h1>
          {/* <p className="mt-[4px] text-[13px] text-gca-show">
            {project.project.name} · What the client thinks of how the project is going
          </p> */}
        </div>
        {canRequest && (
          <div className="relative">
            <button
              onClick={() => setPopoverOpen((open) => !open)}
              className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
            >
              Request feedback
            </button>
            {popoverOpen && (
              <RequestFeedbackPopover
                projectId={projectId}
                projectName={project.project.name}
                contacts={contacts}
                onClose={() => setPopoverOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-[12px] bg-gca-surface">
          <div className="flex items-center justify-between gap-[12px] border-b border-gca-border px-[20px] py-[14px]">
            <span className="flex items-center gap-[8px] text-[14px] font-semibold text-gca-dark">
              Requests
              <span className="rounded-full bg-gca-page-bg px-[8px] py-[2px] text-[12px] font-medium text-gca-show">
                {requests.length}
              </span>
            </span>
            <span className="text-[12px] text-gca-muted">
              {requests.filter((r) => r.status === "responded").length} of {requests.length}{" "}
              answered
            </span>
          </div>

          {requests.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No feedback requested yet"
              description="Send a request to a client contact to start collecting feedback."
              className="py-[32px]"
            />
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden w-full text-left md:table">
                <thead>
                  <tr className="text-[12px] text-gca-muted">
                    <th className="px-[20px] py-[10px] font-medium">Client contact</th>
                    <th className="px-[12px] py-[10px] font-medium">About</th>
                    <th className="px-[12px] py-[10px] font-medium">Sent</th>
                    <th className="px-[12px] py-[10px] font-medium">Status</th>
                    <th className="px-[12px] py-[10px] font-medium">Rating</th>
                    <th className="w-[36px]" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <RequestRow
                      key={request.request_id}
                      request={request}
                      canDelete={canRequest}
                      copied={copiedRequestId === request.request_id}
                      expanded={expandedId === request.request_id}
                      onCopy={() => copyFeedbackLink(request)}
                      onToggle={() =>
                        setExpandedId((current) =>
                          current === request.request_id ? null : request.request_id,
                        )
                      }
                      onDelete={() => setDeleteTarget(request)}
                    />
                  ))}
                </tbody>
              </table>

              {/* Phone cards */}
              <ul className="flex flex-col md:hidden">
                {requests.map((request) => {
                  const status = statusLabel(request.status);
                  return (
                    <li
                      key={request.request_id}
                      className="border-b border-gca-border px-[16px] py-[12px] last:border-b-0"
                    >
                      <button
                        onClick={() =>
                          setExpandedId((current) =>
                            current === request.request_id ? null : request.request_id,
                          )
                        }
                        className="flex w-full cursor-pointer items-center justify-between gap-[12px] text-left"
                      >
                        <span>
                          <span className="block text-[14px] font-medium text-gca-dark">
                            {request.contact_name}
                          </span>
                          <span className="mt-[2px] block text-[12px] text-gca-muted">
                            {request.about} · {formatShortDate(request.created_at)}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-[8px]">
                          <span
                            className={`rounded-full px-[8px] py-[2px] text-[11px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <Stars value={request.rating_overall} />
                        </span>
                      </button>
                      {canRequest && (request.status === "sent" || request.status === "opened") && (
                        <div className="mt-[6px] flex items-center gap-[12px]">
                          <button
                            onClick={() => copyFeedbackLink(request)}
                            aria-label={`Copy link for ${request.contact_name}`}
                            className="flex cursor-pointer items-center gap-[6px] text-[12px] font-medium text-gca-show hover:text-gca-green"
                          >
                            {copiedRequestId === request.request_id ? (
                              <Check className="size-[13px] text-gca-green" />
                            ) : (
                              <Copy className="size-[13px]" />
                            )}
                            {copiedRequestId === request.request_id ? "Copied" : "Copy link"}
                          </button>
                          {request.status === "sent" && (
                            <button
                              onClick={() => setDeleteTarget(request)}
                              aria-label={`Delete request for ${request.contact_name}`}
                              className="flex cursor-pointer items-center gap-[6px] text-[12px] font-medium text-error-text"
                            >
                              <Trash2 className="size-[13px]" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                      {expandedId === request.request_id && request.comment && (
                        <p className="mt-[8px] rounded-[8px] bg-gca-page-bg p-[10px] text-[12px] text-gca-show">
                          “{request.comment}”
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className="w-full shrink-0 rounded-[12px] border border-gca-border bg-gca-surface p-[20px] lg:w-[320px]">
          <p className="text-[14px] font-semibold text-gca-dark">Client rating</p>
          <div className="mt-[10px] flex items-end gap-[10px]">
            <span className="text-[36px] font-semibold leading-none text-gca-dark">
              {summary?.overall?.toFixed(1) ?? "—"}
            </span>
            <div className="mb-[4px] flex flex-col gap-[2px]">
              <Stars value={summary?.overall ?? null} size={16} />
              <span className="text-[12px] text-gca-muted">
                Based on {summary?.count ?? 0} responses
              </span>
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-[14px]">
            <RatingBar label="Quality of work" value={summary?.quality ?? null} />
            <RatingBar label="Communication" value={summary?.updates ?? null} />
            <RatingBar label="Keeping to schedule" value={summary?.schedule ?? null} />
          </div>

          {comments.length > 0 && (
            <div className="mt-[16px] border-t border-gca-border pt-[12px]">
              <button
                onClick={() => setCommentsOpen((open) => !open)}
                className="flex w-full cursor-pointer items-center justify-between text-[13px] font-medium text-gca-dark"
              >
                Show comments summary
                {commentsOpen ? (
                  <ChevronDown className="size-[16px] text-gca-muted" />
                ) : (
                  <ChevronRight className="size-[16px] text-gca-muted" />
                )}
              </button>
              {commentsOpen && (
                <ul className="mt-[10px] flex flex-col gap-[10px]">
                  {comments.map((c) => (
                    <li key={c.request_id} className="text-[12px] text-gca-show">
                      <span className="font-medium text-gca-dark">{c.contact_name}: </span>“
                      {c.comment}”
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteFeedbackRequestModal
          projectId={projectId}
          request={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </main>
  );
}

function RequestRow({
  request,
  canDelete,
  copied,
  expanded,
  onCopy,
  onToggle,
  onDelete,
}: {
  request: FeedbackRequest;
  canDelete: boolean;
  copied: boolean;
  expanded: boolean;
  onCopy: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const status = statusLabel(request.status);
  return (
    <>
      <tr
        className="cursor-pointer border-t border-gca-border text-[13px] hover:bg-gca-page-bg"
        onClick={onToggle}
      >
        <td className="px-[20px] py-[12px]">
          <span className="block font-medium text-gca-dark">{request.contact_name}</span>
          <span className="block text-[12px] text-gca-muted">
            {request.contact_title ? `${request.contact_title}, ` : ""}
            {request.contact_email}
          </span>
        </td>
        <td className="px-[12px] py-[12px] text-gca-show">{request.about}</td>
        <td className="px-[12px] py-[12px] text-gca-show">{formatShortDate(request.created_at)}</td>
        <td className="px-[12px] py-[12px]">
          <span
            className={`rounded-full px-[8px] py-[2px] text-[12px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </td>
        <td className="px-[12px] py-[12px]">
          <Stars value={request.rating_overall} />
        </td>
        <td className="px-[12px] py-[12px]">
          <span className="flex items-center justify-end gap-[10px] text-gca-muted">
            {canDelete && (request.status === "sent" || request.status === "opened") && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy();
                  }}
                  aria-label={`Copy link for ${request.contact_name}`}
                  className="cursor-pointer hover:text-gca-green"
                >
                  {copied ? (
                    <Check className="size-[15px] text-gca-green" />
                  ) : (
                    <Copy className="size-[15px]" />
                  )}
                </button>
                {request.status === "sent" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    aria-label={`Delete request for ${request.contact_name}`}
                    className="cursor-pointer hover:text-error-text"
                  >
                    <Trash2 className="size-[15px]" />
                  </button>
                )}
              </>
            )}
            {request.status == "responded" &&
              (expanded ? (
                <ChevronDown className="size-[16px]" />
              ) : (
                <ChevronRight className="size-[16px]" />
              ))}
          </span>
        </td>
      </tr>
      {expanded && request.comment && (
        <tr className="border-t border-gca-border bg-gca-page-bg">
          <td colSpan={6} className="px-[20px] py-[12px] text-[13px] text-gca-show">
            “{request.comment}”
          </td>
        </tr>
      )}
    </>
  );
}
