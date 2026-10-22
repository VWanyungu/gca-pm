"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportError } from "@/lib/toast";
import { createDraftDpr, findDprForDate, getDprDetail, patchDpr } from "./use-dpr-wizard-data";
import { detailToDraftInput, emptyDprDraft, type DprDraftInput } from "./types";

/**
 * Drives the "New DPR" form: starts from an empty draft and checks the server once for an
 * existing DPR on this date (draft or submitted) so a second visit for the same day resumes
 * it instead of racing the one-per-date constraint with a duplicate create.
 *
 * Deliberately has no localStorage cache. An earlier version read a cached draft back in on
 * mount as a "lost tab" safety net, but that meant a stale draft from an already-deleted or
 * -submitted DPR for the same date could silently resurface here and get autosaved as a new
 * one — the server (checked below) is the only source of truth for "does one already exist".
 */
export function useNewDprDraft(projectId: string, reportDate: string) {
  const [draft, setDraft] = useState<DprDraftInput>(() => emptyDprDraft(reportDate));
  const [dprId, setDprId] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<"draft" | "submitted" | null>(null);
  const [checkedServer, setCheckedServer] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dprIdRef = useRef<string | null>(null);
  useEffect(() => {
    dprIdRef.current = dprId;
  }, [dprId]);

  // AC-DPR-04: one DPR per project per date. Ask the server first — getting this wrong means
  // a doomed second POST that the unique constraint rejects every 1.5s until refreshed.
  useEffect(() => {
    let cancelled = false;
    setCheckedServer(false);
    setDprId(null);
    setExistingStatus(null);
    setCurrentStep(0);
    setDraft(emptyDprDraft(reportDate));
    (async () => {
      try {
        const existing = await findDprForDate(projectId, reportDate);
        if (cancelled) return;
        if (existing) {
          const full = await getDprDetail(projectId, existing.dpr_id);
          if (cancelled) return;
          setDprId(existing.dpr_id);
          setExistingStatus(existing.status);
          if (existing.status === "draft") setDraft(detailToDraftInput(full));
        }
      } catch (error) {
        reportError(error instanceof Error ? error.message : "Could not check for an existing DPR");
      } finally {
        if (!cancelled) setCheckedServer(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reportDate]);

  const update = useCallback((patch: Partial<DprDraftInput>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const save = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      if (dprIdRef.current) {
        await patchDpr(projectId, dprIdRef.current, draft);
      } else {
        const created = await createDraftDpr(projectId, draft);
        setDprId(created.dpr_id);
        dprIdRef.current = created.dpr_id;
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [projectId, draft]);

  // Debounced autosave whenever the draft changes. Skipped until `site_location` is filled in,
  // until the server check above has resolved (never race it into creating a duplicate), and
  // entirely while today's DPR is already submitted.
  useEffect(() => {
    if (!projectId || !draft.site_location.trim() || !checkedServer || existingStatus === "submitted") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save().catch((error: unknown) => {
        reportError(error instanceof Error ? error.message : "Could not save draft");
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, projectId, checkedServer, existingStatus]);

  return {
    draft,
    update,
    dprId,
    currentStep,
    setCurrentStep,
    save,
    saving,
    savedAt,
    checkingExisting: !checkedServer,
    alreadySubmitted: existingStatus === "submitted",
  };
}

/**
 * Drives editing one already-known DPR — its id comes from the list (or the "resume" check in
 * `NewDprPage`), never guessed from a date. Always PATCHes, never creates, and only autosaves
 * while the DPR is still a draft: editing a submitted one (amendment mode) is proposed
 * explicitly via "Request amendment", never autosaved onto the live record.
 */
export function useEditDprDraft(projectId: string, dprId: string) {
  const [draft, setDraft] = useState<DprDraftInput | null>(null);
  const [status, setStatus] = useState<"draft" | "submitted" | null>(null);
  const [reportDate, setReportDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const full = await getDprDetail(projectId, dprId);
        if (cancelled) return;
        setDraft(detailToDraftInput(full));
        setStatus(full.status);
        setReportDate(full.report_date);
      } catch (error) {
        reportError(error instanceof Error ? error.message : "Could not load this DPR");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, dprId]);

  const update = useCallback((patch: Partial<DprDraftInput>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await patchDpr(projectId, dprId, draft);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [projectId, dprId, draft]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draft || status !== "draft" || !draft.site_location.trim()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save().catch((error: unknown) => {
        reportError(error instanceof Error ? error.message : "Could not save draft");
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, status]);

  return { draft, update, status, reportDate, currentStep, setCurrentStep, save, saving, savedAt, loading };
}
