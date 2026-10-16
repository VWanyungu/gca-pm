"use client";

import { useState } from "react";
import Link from "next/link";
import { useWeeklySubmissions } from "./use-weekly-submission-data";
import { formatWeekPeriod, weekNumber } from "./types";

export function WeeklyRegisterTable({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const limit = 5;
  const { data } = useWeeklySubmissions({ projectId, status: "approved", page, limit });
  const submissions = data?.submissions ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">Weekly register</h1>
        <p className="mt-[2px] text-[13px] text-gca-show">Submitted weeks for this project</p>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-5 gap-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
          <span>Week</span>
          <span>Period</span>
          <span>Submitted by</span>
          <span>Submitted</span>
          <span />
        </div>
        {submissions.length === 0 ? (
          <p className="py-[24px] text-[13px] text-gca-muted">No approved weeks yet.</p>
        ) : (
          submissions.map((s) => (
            <div
              key={s.submission_id}
              className="grid grid-cols-5 items-center gap-[16px] border-t border-gca-border py-[12px] text-[13px] text-gca-dark"
            >
              <span className="font-mono font-medium">{weekNumber(s.week_start)}</span>
              <span>{formatWeekPeriod(s.week_start)}</span>
              <span>{s.creator_name ?? "—"}</span>
              <span>{s.approved_at ? new Date(s.approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
              <Link
                href={`/projects/${projectId}/weekly-submission/${s.submission_id}`}
                className="justify-self-end text-[13px] font-medium text-gca-green"
              >
                View →
              </Link>
            </div>
          ))
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-end gap-[8px] text-[13px]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="cursor-pointer rounded-[6px] border border-gca-border px-[10px] py-[4px] disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-gca-muted">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            className="cursor-pointer rounded-[6px] border border-gca-border px-[10px] py-[4px] disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
