"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportError } from "@/lib/toast";
import { createDraftDpr, findDprForDate, getDprDetail, patchDpr } from "./use-dpr-wizard-data";
import { detailToDraftInput, emptyDprDraft, type DprDraftInput } from "./types";

function storageKey(projectId: string, reportDate: string) {
  return `engineer-dpr-draft:${projectId}:${reportDate}`;
}

/**
 * Owns the in-memory DPR draft for the wizard: step index, field edits, and a debounced
 * save to the API (POST once, then PATCH). Mirrors `createDprSchema` exactly — see
 * `types.ts`. localStorage is a per-device convenience against a lost tab, not the source
 * of truth; the server draft (once created) is.
 */
export function useDprDraft(projectId: string, reportDate: string) {
  const [draft, setDraft] = useState<DprDraftInput>(() => {
    if (typeof window === "undefined") return emptyDprDraft(reportDate);
    try {
      const raw = window.localStorage.getItem(storageKey(projectId, reportDate));
      return raw ? (JSON.parse(raw) as DprDraftInput) : emptyDprDraft(reportDate);
    } catch {
      return emptyDprDraft(reportDate);
    }
  });
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

  // AC-DPR-04: one DPR per project per date. localStorage only remembers what THIS device
  // typed, not whether a draft already exists server-side (a different device, or this one
  // after the tab closed) — so ask the server first. Getting this wrong means a doomed second
  // POST that the unique constraint rejects every 1.5s until the page is refreshed.
  useEffect(() => {
    let cancelled = false;
    setCheckedServer(false);
    (async () => {
      try {
        const existing = await findDprForDate(projectId, reportDate);
        if (cancelled) return;
        if (existing) {
          const full = await getDprDetail(projectId, existing.dpr_id);
          if (cancelled) return;
          setDprId(existing.dpr_id);
          setExistingStatus(existing.status);
          if (existing.status === "draft") {
            setDraft(detailToDraftInput(full));
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, reportDate]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey(projectId, reportDate), JSON.stringify(draft));
    } catch {
      // best-effort only
    }
  }, [draft, projectId, reportDate]);

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

  // Debounced autosave whenever the draft changes. Skipped until `site_location` is filled in —
  // the only field `createDprSchema` requires non-empty — so opening the wizard and not typing
  // anything yet doesn't fire a doomed create attempt every 1.5s. Also skipped until the
  // server check above has resolved (never race it into creating a duplicate) and entirely
  // while today's DPR is already submitted (editing that is a separate, same-day-edit flow).
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
