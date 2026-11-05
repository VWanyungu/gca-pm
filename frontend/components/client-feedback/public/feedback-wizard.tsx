"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Check, Lock, Moon, Star, Sun } from "lucide-react";
import { api } from "@/lib/api-client";
import { useTheme } from "@/components/theme-provider";
import { buildMailto } from "@/components/weekly-submission/mailto";

interface FeedbackLinkData {
  status: "sent" | "opened" | "responded" | "expired";
  project_name: string;
  contact_name: string;
  about: string;
  pm_name: string | null;
  pm_email: string | null;
  rating_overall?: number;
  rating_quality?: number;
  rating_updates?: number;
  rating_schedule?: number;
}

interface Answers {
  overall?: number;
  quality?: number;
  updates?: number;
  schedule?: number;
  comment?: string;
}

interface Submitted {
  rating_overall: number;
  rating_quality: number;
  rating_updates: number;
  rating_schedule: number;
}

type Step = "welcome" | 1 | 2 | 3 | 4 | "comment" | "done";

type ScaleField = "overall" | "quality" | "updates" | "schedule";

const SCALE_QUESTIONS: {
  step: 1 | 2 | 3 | 4;
  field: ScaleField;
  text: string;
  low: string;
  high: string;
  kind: "stars" | "numbers";
}[] = [
  {
    step: 1,
    field: "overall",
    text: "Overall, how satisfied are you with the project so far?",
    low: "Very unhappy",
    high: "Very happy",
    kind: "stars",
  },
  {
    step: 2,
    field: "quality",
    text: "How would you rate the quality of the work?",
    low: "Poor",
    high: "Excellent",
    kind: "numbers",
  },
  {
    step: 3,
    field: "updates",
    text: "How well has the team kept you updated?",
    low: "Poor",
    high: "Excellent",
    kind: "numbers",
  },
  {
    step: 4,
    field: "schedule",
    text: "How well is the project keeping to schedule?",
    low: "Poor",
    high: "Excellent",
    kind: "numbers",
  },
];

const NEXT_STEP: Record<1 | 2 | 3 | 4, Step> = {
  1: 2,
  2: 3,
  3: 4,
  4: "comment",
};

function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="flex size-[32px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-gca-border bg-gca-surface hover:bg-gca-page-bg"
    >
      <span className="theme-icon-window size-[16px]">
        <Moon className="theme-icon theme-icon-moon size-[16px] text-gca-dark" />
        <Sun className="theme-icon theme-icon-sun size-[16px] text-gca-dark" />
      </span>
    </button>
  );
}

function TopBar({ right }: { right: string }) {
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <Image src="/GCA Logo.svg" alt="Gas Connect Africa" width={120} height={43} priority />
      <span className="flex items-center gap-[10px]">
        {/* <span className="rounded-full border border-gca-border bg-gca-surface px-[14px] py-[8px] text-[13px] font-medium text-gca-show">
          {right}
        </span> */}
        <ThemeToggle />
      </span>
    </div>
  );
}

function ProgressBar({ answered }: { answered: number }) {
  return (
    <div className="flex gap-[6px] pb-[48px]">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-[3px] flex-1 rounded-full ${i < answered ? "bg-gca-green" : "bg-gca-border"}`}
        />
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="feedback-wizard-card relative z-10 flex w-full max-w-[358px] flex-col gap-[20px] rounded-[16px] border border-gca-border bg-gca-surface p-[24px] pb-[48px] text-center">
      {children}
    </div>
  );
}

function Glow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[50vh] bg-gca-green opacity-20 blur-[100px]"
    />
  );
}

export function FeedbackWizard({ token }: { token: string }) {
  const {
    data,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["feedback-link", token],
    queryFn: async () => {
      const res = await api.get<FeedbackLinkData>(`/feedback/${token}`, { silent: true });
      if (res.status !== "success" || !res.data)
        throw new Error(res.message || "Feedback link not found");
      return res.data;
    },
    retry: false,
  });

  const [step, setStep] = useState<Step>("welcome");
  const [answers, setAnswers] = useState<Answers>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  function answerAndAdvance(field: ScaleField, value: number, next: Step) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setTimeout(() => setStep(next), 180);
  }

  async function submit() {
    if (!answers.overall || !answers.quality || !answers.updates || !answers.schedule) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await api.post<Submitted>(
      `/feedback/${token}`,
      {
        rating_overall: answers.overall,
        rating_quality: answers.quality,
        rating_updates: answers.updates,
        rating_schedule: answers.schedule,
        comment: answers.comment?.trim() || null,
      },
      { silent: true },
    );
    setSubmitting(false);
    if (res.status !== "success" || !res.data) {
      setSubmitError(res.message || "Could not send your feedback");
      return;
    }
    setSubmitted(res.data);
    setStep("done");
  }

  const shell = (children: React.ReactNode, right: string) => (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[var(--background)] px-[20px] py-[24px]">
      <div className="relative z-10 mx-auto flex w-full max-w-[600px] flex-1 flex-col gap-[40px]">
        <TopBar right={right} />
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
      <Glow />
    </div>
  );

  if (isLoading) return shell(<p className="text-[13px] text-gca-muted">Loading…</p>, "—");

  if (fetchError || !data) {
    return shell(
      <Card>
        <Lock className="size-[36px] text-gca-muted" />
        <div>
          <h1 className="text-[20px] font-semibold text-gca-dark">This link doesn&apos;t work</h1>
          <p className="mt-[8px] text-[13px] text-gca-show">
            Double-check the link, or ask the project team to send a new one.
          </p>
        </div>
      </Card>,
      "—",
    );
  }

  if (data.status === "expired") {
    return shell(
      <Card>
        <Lock className="size-[36px] text-gca-muted" />
        <div>
          <h1 className="text-[20px] font-semibold text-gca-dark">This link has expired</h1>
          <p className="mt-[8px] text-[13px] text-gca-show">
            Feedback links only last a short while, so old ones can&apos;t be reused.
          </p>
        </div>
        {data.pm_name && data.pm_email && (
          <div className="flex flex-col gap-[10px] border-t border-gca-border pt-[16px]">
            <p className="text-[12px] font-medium uppercase tracking-wide text-gca-muted">
              Ask for a new link
            </p>
            <div className="rounded-[10px] border border-gca-border px-[14px] py-[12px]">
              <p className="text-[13px] font-medium text-gca-dark">{data.pm_name}</p>
              <p className="text-[12px] text-gca-muted">{data.pm_email}</p>
            </div>
            <a
              href={buildMailto({
                to: [data.pm_email],
                subject: `${data.project_name} — feedback link expired`,
                body: `Hi ${data.pm_name.split(" ")[0]},\n\nCould you send me a fresh feedback link for ${data.project_name}? Mine has expired.\n\nThanks!`,
              })}
              className="rounded-[8px] border border-gca-border py-[10px] text-center text-[13px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              Email {data.pm_name.split(" ")[0]}
            </a>
          </div>
        )}
      </Card>,
      "—",
    );
  }

  if (data.status === "responded" || step === "done") {
    const result: Submitted = submitted ?? {
      rating_overall: data.rating_overall ?? 0,
      rating_quality: data.rating_quality ?? 0,
      rating_updates: data.rating_updates ?? 0,
      rating_schedule: data.rating_schedule ?? 0,
    };
    return shell(
      <Card>
        {/* <ProgressBar answered={4} /> */}
        <div className="flex w-full items-center justify-center">
          <div className="flex size-[48px] items-center justify-center rounded-full bg-gca-badge-bg">
            <Check className="size-[22px] text-gca-green" />
          </div>
        </div>
        <div>
          <h1 className="text-[22px] font-semibold text-gca-dark">
            Thanks {data.contact_name.split(" ")[0]}
          </h1>
          <p className="mt-[8px] text-[13px] text-gca-show">Your feedback has been recorded</p>
        </div>
        <div className="flex flex-col gap-[10px] py-[14px]">
          <SummaryRow label="Overall" value={result.rating_overall} />
          <SummaryRow label="Quality of work" value={result.rating_quality} />
          <SummaryRow label="Updates" value={result.rating_updates} />
          <SummaryRow className="border-none" label="Schedule" value={result.rating_schedule} />
        </div>
      </Card>,
      "Done",
    );
  }

  if (step === "welcome") {
    return shell(
      <Card>
        <ProgressBar answered={0} />
        <div>
          <h1 className="text-[22px] text-gca-dark">How are we doing on {data.project_name}?</h1>
          <p className="mt-[10px] text-[13px] text-gca-show">
            Four quick questions about the work so far
          </p>
        </div>
        <button
          onClick={() => setStep(1)}
          className="cursor-pointer rounded-[10px] bg-gca-green py-[13px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
        >
          Start
        </button>
      </Card>,
      "4 questions",
    );
  }

  const question = SCALE_QUESTIONS.find((q) => q.step === step);
  if (question) {
    const value = answers[question.field];
    return shell(
      <Card>
        <ProgressBar answered={question.step} />
        <h2 className="text-[19px] text-gca-dark">{question.text}</h2>
        {question.kind === "stars" ? (
          <div className="flex flex-col gap-[8px]">
            <div className="flex gap-[10px] justify-between">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => answerAndAdvance(question.field, n, NEXT_STEP[question.step])}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className="cursor-pointer"
                >
                  <Star
                    className={`size-[36px] ${
                      value != null && n <= value
                        ? "fill-gca-warning text-gca-warning"
                        : "fill-none text-gca-border"
                    }`}
                  />
                </button>
              ))}
            </div>
            {/* <div className="flex justify-between text-[12px] text-gca-muted">
              <span>{question.low}</span>
              <span>{question.high}</span>
            </div> */}
            {/* <p className="pt-[8px] text-center text-[13px] text-gca-muted">
              Give a rating to continue
            </p> */}
          </div>
        ) : (
          <div className="flex flex-col gap-[8px]">
            <div className="flex gap-[8px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => answerAndAdvance(question.field, n, NEXT_STEP[question.step])}
                  className={`flex-1 cursor-pointer rounded-full border p-[14px] text-[15px] ${
                    value === n
                      ? "border-gca-green bg-gca-green text-gca-on-accent"
                      : "border-gca-border text-gca-dark hover:border-gca-green"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[12px] text-gca-muted mt-2 font-extralight">
              <span className="px-[14px] text-center">{question.low}</span>
              <span>{question.high}</span>
            </div>
          </div>
        )}
        {question.step > 1 && (
          <button
            onClick={() => setStep((question.step - 1) as Step)}
            className="cursor-pointer self-center text-[13px] font-medium text-gca-green"
          >
            Back
          </button>
        )}
      </Card>,
      `Question ${question.step} / 4`,
    );
  }

  if (step === "comment") {
    return shell(
      <Card>
        <ProgressBar answered={4} />
        <h2 className="text-[19px] text-gca-dark">Anything you&apos;d like to tell the team?</h2>
        <textarea
          value={answers.comment ?? ""}
          onChange={(e) => setAnswers((prev) => ({ ...prev, comment: e.target.value }))}
          rows={4}
          placeholder="Optional"
          className="rounded-[10px] border border-gca-border bg-[var(--background)] p-[14px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
        />
        {submitError && <p className="text-[12px] text-error-text">{submitError}</p>}
        <button
          onClick={submit}
          disabled={submitting}
          className="cursor-pointer rounded-[10px] bg-gca-green py-[13px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send feedback"}
        </button>
        <button
          onClick={() => setStep(4)}
          className="cursor-pointer self-center text-[13px] font-medium text-gca-green"
        >
          Back
        </button>
      </Card>,
      "Optional",
    );
  }

  return null;
}

function SummaryRow({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between text-[13px] py-[6px] border-b border-gca-border ${className ?? ""}`}
    >
      <span className="text-gca-show">{label}</span>
      <span className="text-gca-muted">
        <span className="text-gca-dark text-2xl font-light">{value}</span> / 5
      </span>
    </div>
  );
}
