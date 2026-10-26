import { useMemo, useState } from "react";
import type { MetricRow } from "./types";

const CHART_W = 652;
const CHART_H = 180;

type RangeMode = "week" | "month";
type Slot = { label: string; row: MetricRow | null };

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeekSlots(metrics: MetricRow[]): Slot[] {
  const byDate = new Map(metrics.map((m) => [dateKey(m.as_of_date), m]));
  const monday = startOfWeek(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      row: byDate.get(localDateKey(d)) ?? null,
    };
  });
}

function buildMonthSlots(metrics: MetricRow[]): Slot[] {
  const year = new Date().getFullYear();
  const lastInMonth = new Map<number, MetricRow>();
  for (const m of metrics) {
    const key = dateKey(m.as_of_date);
    const metricYear = Number(key.slice(0, 4));
    const month = Number(key.slice(5, 7)) - 1;
    if (metricYear === year) lastInMonth.set(month, m);
  }
  return Array.from({ length: 12 }, (_, i) => ({
    label: new Date(year, i, 1).toLocaleDateString("en-GB", { month: "short" }),
    row: lastInMonth.get(i) ?? null,
  }));
}

function slotsToPath(slots: Slot[], key: "planned_pct" | "actual_pct"): string {
  if (slots.length === 0) return "";
  const step = slots.length > 1 ? CHART_W / (slots.length - 1) : 0;
  let path = "";
  let started = false;
  slots.forEach((slot, i) => {
    if (!slot.row) {
      started = false;
      return;
    }
    const x = i * step;
    const y = CHART_H - (slot.row[key] / 100) * CHART_H;
    path += `${started ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    started = true;
  });
  return path.trim();
}

function RangeToggle({ value, onChange }: { value: RangeMode; onChange: (v: RangeMode) => void }) {
  const options: { key: RangeMode; label: string }[] = [
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
  ];
  return (
    <div className="flex items-center gap-[2px] rounded-full border border-gca-border bg-gca-page-bg p-[2px]">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-[12px] py-[4px] text-[12px] transition-colors ${
            value === opt.key
              ? "bg-gca-surface text-gca-dark shadow-sm"
              : "text-gca-muted hover:text-gca-dark"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressCard({ metrics }: { metrics: MetricRow[] }) {
  const [range, setRange] = useState<RangeMode>("week");
  const latest = metrics[metrics.length - 1];

  const slots = useMemo(
    () => (range === "week" ? buildWeekSlots(metrics) : buildMonthSlots(metrics)),
    [metrics, range],
  );

  if (!latest) {
    return (
      <div className="flex h-[415px] w-[700px] shrink-0 items-center justify-center rounded-[12px] border border-gca-border bg-gca-surface p-[24px]">
        <p className="text-[14px] text-gca-muted">No progress data yet.</p>
      </div>
    );
  }

  const delta = Number((latest.actual_pct - latest.planned_pct).toFixed(1));
  const spiOk = latest.spi !== null && latest.spi >= 0.95;

  const plannedPath = slotsToPath(slots, "planned_pct");
  const actualPath = slotsToPath(slots, "actual_pct");

  const step = slots.length > 1 ? CHART_W / (slots.length - 1) : 0;
  let lastFilledIdx = -1;
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i].row) {
      lastFilledIdx = i;
      break;
    }
  }
  const lastFilled = lastFilledIdx >= 0 ? slots[lastFilledIdx].row : null;
  const lastActualX = lastFilledIdx * step;
  const lastActualY = lastFilled ? CHART_H - (lastFilled.actual_pct / 100) * CHART_H : CHART_H;

  return (
    <div className="flex h-[415px] w-[700px] shrink-0 flex-col gap-[16px] rounded-[12px] border border-gca-border bg-gca-surface p-[24px] pb-[28px]">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-[16px] font-semibold text-gca-dark">Progress</h3>
        <div className="flex items-center gap-[6px] text-[12px] text-gca-show">
          <span className="flex items-center gap-[4px]">
            <span className="size-[8px] rounded-full border border-dashed border-gca-muted" />{" "}
            Planned
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="size-[8px] rounded-full bg-gca-green" /> Actual
          </span>
        </div>
      </div>
      <div className="flex items-center gap-[24px]">
        <Tile
          label="SPI"
          value={latest.spi?.toFixed(2) ?? "—"}
          note={spiOk ? "On track" : "Behind"}
          noteColor={spiOk ? "text-gca-green" : "text-gca-warning"}
        />
        <Divider />
        <Tile
          label="Planned"
          value={`${Math.trunc(latest.planned_pct)}%`}
          note="Cumulative"
          noteColor="text-gca-show"
        />
        <Divider />
        <Tile
          label="Actual"
          value={`${Math.trunc(latest.actual_pct)}%`}
          note={delta >= 0 ? `${delta} pts ahead` : `${Math.abs(delta)} pts behind`}
          noteColor={delta >= 0 ? "text-gca-green" : "text-gca-warning"}
        />
        <Divider />
        <Tile
          label="Forecast end"
          value={formatDate(latest.forecast_finish)}
          note={latest.forecast_finish === latest.baseline_finish ? "On baseline" : "Vs. baseline"}
          noteColor="text-gca-show"
        />
      </div>

      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-end">
          <RangeToggle value={range} onChange={setRange} />
        </div>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 10}`} width={CHART_W} height={CHART_H}>
          {[0, 60, 120, 180].map((y) => (
            <line key={y} x1={0} y1={y} x2={CHART_W} y2={y} stroke="#e2e8e3" strokeWidth={1} />
          ))}
          <path
            d={plannedPath}
            fill="none"
            stroke="#5e7264"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <path d={actualPath} fill="none" stroke="#2e7d45" strokeWidth={2} />
          {lastFilled && (
            <g
              transform={`translate(${Math.max(lastActualX - 15, 0)}, ${Math.max(lastActualY - 24, 0)})`}
            >
              {/* <rect width={40} height={22} rx={6} fill="#2e7d45" /> */}
              <text
                x={8}
                y={15}
                fontSize={13}
                // fontFamily="monospace"
                fill="#2e7d45"
                fontWeight={800}
              >
                {` ${lastFilled.actual_pct.toFixed(1)}`}
              </text>
            </g>
          )}
        </svg>
        <div className="flex w-full items-center justify-between text-[11px] text-gca-muted">
          {slots.map((slot, i) => (
            <span key={i}>{slot.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  noteColor,
}: {
  label: string;
  value: string;
  note: string;
  noteColor: string;
}) {
  return (
    <div className="flex flex-col gap-[2px]">
      <p className="text-[12px] font-medium text-gca-muted">{label}</p>
      <p className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">{value}</p>
      <p className={`text-[12px] ${noteColor}`}>{note}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-[48px] w-px bg-gca-border" />;
}
