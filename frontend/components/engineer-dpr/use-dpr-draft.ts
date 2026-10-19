"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createDraftDpr, patchDpr } from "./use-dpr-wizard-data";
import { emptyDprDraft, type DprDraftInput } from "./types";

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
  const [currentStep, setCurrentStep] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dprIdRef = useRef<string | null>(null);
  useEffect(() => {
    dprIdRef.current = dprId;
  }, [dprId]);

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
  // anything yet doesn't fire a doomed create attempt every 1.5s.
  useEffect(() => {
    if (!projectId || !draft.site_location.trim()) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save().catch(() => {
        // surfaced to the user via the explicit "Save draft" button instead
      });
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, projectId]);

  return { draft, update, dprId, currentStep, setCurrentStep, save, saving, savedAt };
}
