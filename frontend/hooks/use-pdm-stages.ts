"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface PdmStage {
  stage_no: number;
  name: string;
  phase_id: number;
  phase_code: "develop" | "deliver" | "sustain";
  phase_name: string;
}

export function usePdmStages() {
  return useQuery({
    queryKey: ["pdm-stages"],
    queryFn: async () => {
      const res = await api.get<{ stages: PdmStage[] }>("/pdm-stages");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.stages;
    },
    staleTime: Infinity,
  });
}
