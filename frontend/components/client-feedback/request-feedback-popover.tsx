"use client";

import { useRef, useState } from "react";
import { Check, Copy, LoaderCircle, Mail, Plus } from "lucide-react";
import useOutsideClick from "@/hooks/use-outside-click";
import Dropdown from "@/components/Dropdown";
import { buildMailto } from "@/components/weekly-submission/mailto";
import type { ClientContact } from "@/components/project-overview/types";
import { createFeedbackRequests, useFeedbackRequestsInvalidate } from "./use-client-feedback";
import { feedbackLink } from "./types";
import type { FeedbackRequest } from "./types";

const EXPIRY_OPTIONS = [
  { id: "7", name: "In 7 days" },
  { id: "14", name: "In 14 days" },
  { id: "30", name: "In 30 days" },
];

type Step = { mode: "choose" } | { mode: "ready"; requests: FeedbackRequest[] };

function emailFor(projectName: string, request: FeedbackRequest): string {
  return buildMailto({
    to: [request.contact_email],
    subject: `${projectName} — a quick word on how things are going`,
    body: `Hi ${request.contact_name.split(" ")[0]},\n\nWe'd value your take on ${projectName}. It takes about 2 minutes, no login needed:\n${feedbackLink(request.token)}\n\nThanks!`,
  });
}

export function RequestFeedbackPopover({
  projectId,
  projectName,
  contacts,
  onClose,
}: {
  projectId: string;
  projectName: string;
  contacts: ClientContact[];
  onClose: () => void;
}) {
  const invalidate = useFeedbackRequestsInvalidate(projectId);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick({ ref, handler: onClose });

  const [step, setStep] = useState<Step>({ mode: "choose" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expiryDays, setExpiryDays] = useState("14");
  const [sending, setSending] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      const requests = await createFeedbackRequests(projectId, {
        contact_ids: Array.from(selectedIds),
        expires_in_days: Number(expiryDays),
      });
      invalidate();
      setStep({ mode: "ready", requests });
    } finally {
      setSending(false);
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(feedbackLink(token));
    setCopiedToken(token);
    setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
  }

  // shortcut: each mailto opens its own compose window rather than one combined email, since a
  // mailto body can't vary per recipient. Fine for the handful of contacts a project has.
  function emailEachLink(requests: FeedbackRequest[]) {
    for (const request of requests) window.open(emailFor(projectName, request), "_blank");
  }

  return (
    <div
      ref={ref}
      className="fixed inset-x-[16px] top-[160px] z-20 max-h-[calc(100vh-180px)] overflow-y-auto rounded-[12px] border border-gca-border bg-gca-surface p-[16px] shadow-[0px_8px_24px_0px_rgba(23,48,31,0.12)] md:absolute md:inset-x-auto md:right-0 md:top-[calc(100%+8px)] md:max-h-none md:w-[320px]"
    >
      {step.mode === "choose" && (
        <div className="flex flex-col gap-[14px]">
          {/* <div>
            <p className="text-[15px] font-semibold text-gca-dark">Request feedback</p>
            <p className="mt-[2px] text-[12px] text-gca-show">
              Each contact gets their own private link.
            </p>
          </div> */}

          <div className="flex flex-col gap-[4px]">
            <label className="text-[13px] font-medium text-gca-dark">
              Send to<span className="text-error-text ml-1">*</span>
            </label>
            {contacts.length === 0 ? (
              <p className="text-[12px] text-gca-muted">
                No client contacts added for this project yet.
              </p>
            ) : (
              <div className="flex max-h-[220px] flex-col gap-[2px] overflow-y-auto">
                {contacts.map((c) => (
                  <label
                    key={c.contact_id}
                    className="flex cursor-pointer items-start gap-[10px] rounded-[8px] px-[6px] py-[8px] hover:bg-gca-page-bg"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.contact_id)}
                      onChange={() => toggle(c.contact_id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`mt-[2px] flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gca-green ${
                        selectedIds.has(c.contact_id)
                          ? "border-gca-green bg-gca-green"
                          : "border-gca-border"
                      }`}
                    >
                      {selectedIds.has(c.contact_id) && (
                        <Check className="size-[11px] text-gca-on-accent" />
                      )}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-gca-dark">
                        {c.name}
                        {c.title ? ` · ${c.title}` : ""}
                      </span>
                      <span className="block text-[12px] text-gca-muted">{c.email}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[4px]">
            <label className="text-[13px] font-medium text-gca-dark">
              Link expires<span className="text-error-text ml-1">*</span>
            </label>
            <Dropdown
              id="feedback-expiry"
              data={EXPIRY_OPTIONS}
              selectedId={expiryDays}
              onSelect={(id) => setExpiryDays(id)}
              style="h-[38px] w-full rounded-[8px] border border-gca-border px-[12px] text-[13px]"
            />
          </div>

          <div className="flex items-center justify-end gap-[12px] border-t border-gca-border pt-[12px]">
            {/* <span className="text-[12px] text-gca-muted">
              {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected
            </span> */}
            <button
              onClick={generate}
              disabled={selectedIds.size === 0 || sending}
              className="flex w-[170px] items-center justify-center rounded-[8px] bg-gca-green px-[14px] py-[6px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50 sm:w-[190px]"
            >
              {sending ? (
                <LoaderCircle className="size-[16px] animate-spin" aria-hidden="true" />
              ) : selectedIds.size > 1 ? (
                `Generate ${selectedIds.size} links`
              ) : (
                "Generate link"
              )}
            </button>
          </div>
        </div>
      )}

      {step.mode === "ready" && (
        <div className="flex flex-col gap-[12px]">
          {/* <div className="flex items-center gap-[8px]">
            <Check className="size-[16px] text-gca-green" />
            <p className="text-[15px] font-semibold text-gca-dark">
              {step.requests.length > 1 ? `${step.requests.length} links ready` : "Link ready"}
            </p>
          </div> */}

          <div className="flex flex-col gap-[10px]">
            {step.requests.map((request) => (
              <div key={request.request_id} className="flex flex-col gap-[4px]">
                <span className="text-[12px] font-medium text-gca-dark">
                  {request.contact_name}
                </span>
                <div className="flex items-center gap-[6px]">
                  <span className="flex-1 truncate rounded-[8px] border border-gca-border px-[10px] py-[7px] text-[12px] text-gca-show">
                    {feedbackLink(request.token)}
                  </span>
                  <button
                    onClick={() => copyLink(request.token)}
                    aria-label={`Copy link for ${request.contact_name}`}
                    className="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border text-gca-show hover:text-gca-green"
                  >
                    {copiedToken === request.token ? (
                      <Check className="size-[14px] text-gca-green" />
                    ) : (
                      <Copy className="size-[14px]" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-[2px] border-t border-gca-border pt-[10px]">
            {step.requests.length > 1 ? (
              <>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      step.requests.map((r) => feedbackLink(r.token)).join("\n"),
                    )
                  }
                  className="flex cursor-pointer items-center gap-[8px] rounded-[8px] px-[6px] py-[6px] text-[13px] text-gca-dark hover:bg-gca-page-bg"
                >
                  <Copy className="size-[14px]" /> Copy all {step.requests.length} links
                </button>
                <button
                  onClick={() => emailEachLink(step.requests)}
                  className="flex cursor-pointer items-center gap-[8px] rounded-[8px] px-[6px] py-[6px] text-[13px] text-gca-dark hover:bg-gca-page-bg"
                >
                  <Mail className="size-[14px]" /> Email each contact their link
                </button>
              </>
            ) : (
              <a
                href={emailFor(projectName, step.requests[0])}
                className="flex cursor-pointer items-center gap-[8px] rounded-[8px] px-[6px] py-[8px] text-[13px] text-gca-dark hover:bg-gca-page-bg"
              >
                <Mail className="size-[14px]" /> Email link to {step.requests[0].contact_name}
              </a>
            )}
            <button
              onClick={() => setStep({ mode: "choose" })}
              className="flex cursor-pointer items-center gap-[8px] rounded-[8px] px-[6px] py-[6px] text-[13px] text-gca-dark hover:bg-gca-page-bg"
            >
              <Plus className="size-[14px]" /> Create another link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
