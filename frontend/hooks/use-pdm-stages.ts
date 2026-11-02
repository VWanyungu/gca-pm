"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface PdmStage {
  stage_no: number;
  name: string;
  phase_id: number;
  phase_code: "develop" | "deliver" | "sustain";
  phase_name: string;
  kind: "kickoff" | "pdm" | "closure";
}

/** The 10 regular PDM stages a project can pick into scope. Kickoff/Closure are excluded —
 *  they're not scope choices, every project gets them automatically (AC-STG-11). */
export function usePdmStages() {
  return useQuery({
    queryKey: ["pdm-stages"],
    queryFn: async () => {
      const res = await api.get<{ stages: PdmStage[] }>("/pdm-stages");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.stages.filter((s) => s.kind === "pdm");
    },
    staleTime: Infinity,
  });
}
