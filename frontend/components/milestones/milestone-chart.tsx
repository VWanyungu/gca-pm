"use client";

import { useMemo } from "react";
import type { MilestoneRow, MilestoneSource } from "./types";

const MIN_MONTH_WIDTH = 128;
const TIER_GAP = 36;
const TIER_COUNT = 3;
// Max vertical reach of a marker: longest connector line + diamond + label, plus a safety margin.
// The label title is truncated to one line so this reach is fixed, never pushed taller by wrapping text.
const AXIS_Y = TIER_GAP * TIER_COUNT + 80;
const CHART_HEIGHT = AXIS_Y * 2;
const LABEL_HALF_WIDTH = 70;

interface MilestoneChartProps {
  milestones: MilestoneRow[];
  sourceFilter: MilestoneSource | "all";
  onSelect: (milestoneId: string) => void;
}

function monthKey(d: Date) {
  return d.getFullYear() * 12 + d.getMonth();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function MilestoneChart({ milestones, sourceFilter, onSelect }: MilestoneChartProps) {
  const filtered = useMemo(
    () => (sourceFilter === "all" ? milestones : milestones.filter((m) => m.source === sourceFilter)),
    [milestones, sourceFilter],
  );

  const chart = useMemo(() => {
    if (filtered.length === 0) return null;

    const dated = filtered.map((m) => ({ milestone: m, date: new Date(m.forecast_date ?? m.planned_date) }));
    const minKey = Math.min(...dated.map((d) => monthKey(d.date)));
    const maxKey = Math.max(...dated.map((d) => monthKey(d.date)));

    const months = [];
    for (let k = minKey; k <= maxKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));
    }

    const markers = dated.map(({ milestone, date }, i) => {
      const dim = daysInMonth(date.getFullYear(), date.getMonth());
      const monthIndex = monthKey(date) - minKey;
      const frac = (monthIndex + (date.getDate() - 1) / dim) / months.length;
      const tier = i % TIER_COUNT;
      const above = i % 2 === 0;
      const lineLength = (tier + 1) * TIER_GAP;
      return { milestone, date, frac, above, lineLength };
    });

    const today = new Date();
    const todayKey = monthKey(today);
    let todayFrac: number | null = null;
    if (todayKey >= minKey && todayKey <= maxKey) {
      const dim = daysInMonth(today.getFullYear(), today.getMonth());
      todayFrac = (todayKey - minKey + (today.getDate() - 1) / dim) / months.length;
    }

    return { months, markers, todayFrac, minWidth: months.length * MIN_MONTH_WIDTH };
  }, [filtered]);

  if (!chart) {
    return (
      <p className="py-[56px] text-center text-[13px] text-gca-show">
        No milestones match the current search or source filter.
      </p>
    );
  }

  const rangeLabel = `${chart.months[0].toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – ${chart.months[chart.months.length - 1].toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[24px]">
      <div className="flex w-full items-center justify-between">
        <p className="text-[14px] font-semibold text-gca-dark">{rangeLabel}</p>
        <div className="flex items-center gap-[14px]">
          <LegendItem colorClassName="bg-gca-green" label="Schedule" />
          <LegendItem colorClassName="bg-gca-warning" label="Custom" />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div style={{ paddingLeft: LABEL_HALF_WIDTH, paddingRight: LABEL_HALF_WIDTH }}>
          <div className="relative w-full" style={{ minWidth: chart.minWidth, height: CHART_HEIGHT }}>
            {/* Month axis */}
            <div className="absolute left-0 right-0 flex" style={{ top: AXIS_Y }}>
              {chart.months.map((m, i) => (
                <div key={i} className="min-w-0 flex-1 border-t-[1.5px] border-gca-border">
                  <p className="-mt-[26px] text-[15px] font-semibold text-gca-dark">
                    {m.toLocaleDateString("en-GB", { month: "short" })}
                  </p>
                </div>
              ))}
            </div>

            {/* Today marker */}
            {chart.todayFrac !== null && (
              <div
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${chart.todayFrac * 100}%`, height: CHART_HEIGHT }}
              >
                <div className="h-full w-0 border-l border-dashed border-error-text" />
                <p className="absolute bottom-0 -translate-x-1/2 text-[11px] font-semibold text-error-text">Today</p>
              </div>
            )}

            {/* Milestone markers: a connector line running from the axis to a diamond tip, with the label beyond it */}
            {chart.markers.map(({ milestone, date, frac, above, lineLength }) => (
              <button
                key={milestone.id}
                type="button"
                onClick={() => onSelect(milestone.id)}
                className="absolute cursor-pointer border-0 bg-transparent p-0"
                style={{
                  left: `${frac * 100}%`,
                  top: above ? AXIS_Y - lineLength : AXIS_Y,
                  height: lineLength,
                  width: 0,
                }}
              >
                <div className="h-full w-px bg-gca-border" />
                <span
                  className={`absolute left-0 size-[9px] -translate-x-1/2 rotate-45 rounded-[2px] ${
                    milestone.source === "custom" ? "bg-gca-warning" : "bg-gca-green"
                  } ${above ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2"}`}
                />
                <div
                  className={`absolute left-0 flex w-[140px] -translate-x-1/2 flex-col items-center gap-[2px] ${
                    above ? "bottom-full mb-[14px]" : "top-full mt-[14px]"
                  }`}
                >
                  <p className="w-full truncate text-center text-[12px] font-medium text-gca-dark" title={milestone.title}>
                    {milestone.title}
                  </p>
                  <p className="font-mono text-[11px] text-gca-show">
                    {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ colorClassName, label }: { colorClassName: string; label: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className={`size-[7px] rotate-45 rounded-[1px] ${colorClassName}`} />
      <span className="text-[12px] text-gca-show">{label}</span>
    </div>
  );
}
