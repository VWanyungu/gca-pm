"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useClientContacts } from "@/components/project-overview/use-project-data";
import { buildMailto, buildSubmissionReportText } from "./mailto";
import type { WeeklySubmission } from "./types";
import { weekNumber } from "./types";

type Step = "recipients" | "review" | "sent";

export function SendToClientView({
  projectId,
  projectName,
  submission,
  onBack,
}: {
  projectId: string;
  projectName: string;
  submission: WeeklySubmission;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { data: contacts = [] } = useClientContacts(projectId);
  const [step, setStep] = useState<Step>("recipients");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [oneOff, setOneOff] = useState("");
  const [ccMe, setCcMe] = useState(true);
  const [message, setMessage] = useState(
    `Hi, sharing this week's progress update for ${projectName}...`,
  );
  const [attachReport, setAttachReport] = useState(true);

  function toggleContact(id: string) {
    setSelectedContactIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedContacts = contacts.filter((c) => selectedContactIds.has(c.contact_id));
  const toEmails = [...selectedContacts.map((c) => c.email), ...(oneOff.trim() ? [oneOff.trim()] : [])];

  function send() {
    const body = attachReport
      ? `${message}\n\n${buildSubmissionReportText({ submission, projectName, addressedRisks: submission.addressed_risks ?? [] })}`
      : message;
    const mailto = buildMailto({
      to: toEmails,
      cc: ccMe && user?.email ? [user.email] : undefined,
      subject: `${projectName} — Week ${weekNumber(submission.week_start)} submission`,
      body,
    });
    window.location.href = mailto;
    setStep("sent");
  }

  if (step === "sent") {
    return (
      <div className="flex w-full flex-col items-center gap-[12px] rounded-[12px] border border-gca-border bg-gca-surface p-[48px]">
        <div className="flex size-[48px] items-center justify-center rounded-full bg-gca-green text-gca-on-accent">✓</div>
        <h2 className="text-[18px] font-semibold text-gca-dark">Mail client opened</h2>
        <p className="text-[13px] text-gca-show">Review the drafted email and hit send from there.</p>
        <button onClick={onBack} className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent">
          Back to submission
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[20px] rounded-[12px] border border-gca-border bg-gca-surface p-[32px]">
      <button onClick={onBack} className="cursor-pointer w-fit text-[13px] font-medium text-gca-green">
        ← {step === "review" ? "Recipients" : "Submission"}
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-semibold text-gca-dark">Send to client</h2>
          <p className="mt-[2px] text-[13px] text-gca-show">
            Week {weekNumber(submission.week_start)} · {projectName}
          </p>
        </div>
        <div className="flex items-center gap-[8px] text-[13px] font-medium text-gca-muted">
          <StepBadge active={step === "recipients"} done={step === "review"} label="1" name="Recipients" />
          <span>—</span>
          <StepBadge active={step === "review"} done={false} label="2" name="Review" />
        </div>
      </div>

      {step === "recipients" && (
        <>
          <div className="flex flex-col gap-[8px]">
            <p className="text-[14px] font-semibold text-gca-dark">Client team</p>
            {contacts.length === 0 ? (
              <p className="text-[13px] text-gca-muted">No client contacts added for this project yet.</p>
            ) : (
              contacts.map((c) => (
                <label key={c.contact_id} className="flex items-center gap-[12px] border-b border-gca-border py-[10px] last:border-b-0">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(c.contact_id)}
                    onChange={() => toggleContact(c.contact_id)}
                    className="size-[16px]"
                  />
                  <div>
                    <p className="text-[14px] font-medium text-gca-dark">{c.name}</p>
                    <p className="text-[12px] text-gca-muted">
                      {c.title ? `${c.title} · ` : ""}
                      {c.email}
                    </p>
                  </div>
                </label>
              ))
            )}
            <input
              value={oneOff}
              onChange={(e) => setOneOff(e.target.value)}
              placeholder="Add a one-off recipient (email)"
              className="mt-[8px] h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>

          <label className="flex items-center gap-[10px] rounded-[10px] bg-gca-page-bg p-[14px] text-[13px]">
            <input type="checkbox" checked={ccMe} onChange={(e) => setCcMe(e.target.checked)} className="size-[16px]" />
            CC me on this report ({user?.email})
          </label>

          <div className="flex items-center justify-between pt-[8px]">
            <span className="text-[13px] text-gca-muted">{toEmails.length} recipients selected</span>
            <button
              onClick={() => setStep("review")}
              disabled={toEmails.length === 0}
              className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent disabled:opacity-50"
            >
              Next: Review
            </button>
          </div>
        </>
      )}

      {step === "review" && (
        <>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] font-semibold text-gca-dark">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>

          <label className="flex items-center gap-[10px] text-[13px] text-gca-dark">
            <input type="checkbox" checked={attachReport} onChange={(e) => setAttachReport(e.target.checked)} className="size-[16px]" />
            Attach report
          </label>
          <p className="-mt-[8px] text-[12px] text-gca-muted">
            Opens your mail client with the report summary in the body — attach the exported report file yourself if the client needs a file.
          </p>

          <div className="flex justify-end">
            <button
              onClick={send}
              className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent"
            >
              Send to client
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StepBadge({ active, done, label, name }: { active: boolean; done: boolean; label: string; name: string }) {
  return (
    <span className={`flex items-center gap-[6px] ${active || done ? "text-gca-dark" : ""}`}>
      <span
        className={`flex size-[20px] items-center justify-center rounded-full text-[11px] ${
          done ? "bg-gca-green text-gca-on-accent" : active ? "border border-gca-green text-gca-green" : "border border-gca-border"
        }`}
      >
        {done ? "✓" : label}
      </span>
      {name}
    </span>
  );
}
