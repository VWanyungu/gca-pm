"use client";

import { useWeatherCategories } from "../use-dpr-wizard-data";
import type { DprDraftInput } from "../types";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
}

export function SiteConditionsStep({ draft, update }: StepProps) {
  const { data: weatherCategories = [] } = useWeatherCategories();

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label className="flex gap-[2px] text-[13px] font-medium text-gca-dark">
          Site<span className="text-error-text">*</span>
        </label>
        <input
          value={draft.site_location}
          onChange={(e) => update({ site_location: e.target.value })}
          placeholder="e.g. Gitanga Mall · Block A"
          className="h-[48px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="flex gap-[2px] text-[13px] font-medium text-gca-dark">
          Weather<span className="text-error-text">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-[8px]">
          {weatherCategories.map((category) => {
            const selected = draft.weather_category_id === category.weather_category_id;
            return (
              <button
                key={category.weather_category_id}
                type="button"
                onClick={() => update({ weather_category_id: category.weather_category_id })}
                className={`cursor-pointer rounded-[999px] border px-[14px] py-[8px] text-[14px] ${
                  selected
                    ? "border-gca-green bg-gca-badge-bg font-medium text-gca-badge-text"
                    : "border-gca-border bg-white text-gca-show"
                }`}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">Temperature (°C)</label>
        <div className="flex gap-[16px]">
          <div className="flex w-full flex-col gap-[4px]">
            <span className="text-[12px] text-gca-show">Min</span>
            <input
              type="number"
              value={draft.temp_min_c ?? ""}
              onChange={(e) =>
                update({ temp_min_c: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="h-[48px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green"
            />
          </div>
          <div className="flex w-full flex-col gap-[4px]">
            <span className="text-[12px] text-gca-show">Max</span>
            <input
              type="number"
              value={draft.temp_max_c ?? ""}
              onChange={(e) =>
                update({ temp_max_c: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="h-[48px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">Humidity (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={draft.humidity_pct ?? ""}
          onChange={(e) =>
            update({ humidity_pct: e.target.value === "" ? null : Number(e.target.value) })
          }
          className="h-[48px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green"
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">Wind</label>
        <input
          value={draft.wind ?? ""}
          onChange={(e) => update({ wind: e.target.value || null })}
          placeholder="Optional"
          className="h-[48px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
        />
      </div>
    </div>
  );
}
