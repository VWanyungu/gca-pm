import type { MetricRow } from "./types";

const CHART_W = 652;
const CHART_H = 180;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pointsToPath(values: number[]): string {
  if (values.length === 0) return "";
  const step = values.length > 1 ? CHART_W / (values.length - 1) : 0;
  return values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(CHART_H - (v / 100) * CHART_H).toFixed(1)}`)
    .join(" ");
}

export function ProgressCard({ metrics }: { metrics: MetricRow[] }) {
  const latest = metrics[metrics.length - 1];

  if (!latest) {
    return (
      <div className="flex h-[415px] w-[700px] shrink-0 items-center justify-center rounded-[12px] border border-gca-border bg-white p-[24px]">
        <p className="text-[14px] text-gca-muted">No progress data yet.</p>
      </div>
    );
  }

  const delta = Number((latest.actual_pct - latest.planned_pct).toFixed(1));
  const spiOk = latest.spi !== null && latest.spi >= 0.95;

  const plannedPath = pointsToPath(metrics.map((m) => m.planned_pct));
  const actualPath = pointsToPath(metrics.map((m) => m.actual_pct));
  const lastActualY = CHART_H - (latest.actual_pct / 100) * CHART_H;
  const lastActualX = metrics.length > 1 ? CHART_W : 0;

  const labelCount = 7;
  const labelIdxs = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i * (metrics.length - 1)) / (labelCount - 1)),
  );

  return (
    <div className="flex h-[415px] w-[700px] shrink-0 flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[24px]">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-[16px] font-semibold text-gca-dark">Progress</h3>
        <div className="flex items-center gap-[6px] text-[12px] text-gca-show">
          <span className="flex items-center gap-[4px]">
            <span className="size-[8px] rounded-full border border-dashed border-gca-muted" /> Planned
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="size-[8px] rounded-full bg-gca-green" /> Actual
          </span>
        </div>
      </div>

      <div className="flex items-center gap-[24px]">
        <Tile label="SPI" value={latest.spi?.toFixed(2) ?? "—"} note={spiOk ? "On track" : "Behind"} noteColor={spiOk ? "text-gca-green" : "text-gca-warning"} />
        <Divider />
        <Tile label="Planned" value={`${Math.trunc(latest.planned_pct)}%`} note="Cumulative" noteColor="text-gca-show" />
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
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 10}`} width={CHART_W} height={CHART_H}>
          {[0, 60, 120, 180].map((y) => (
            <line key={y} x1={0} y1={y} x2={CHART_W} y2={y} stroke="#e2e8e3" strokeWidth={1} />
          ))}
          <path d={plannedPath} fill="none" stroke="#5e7264" strokeWidth={1.5} strokeDasharray="4 4" />
          <path d={actualPath} fill="none" stroke="#2e7d45" strokeWidth={2} />
          {metrics.length > 0 && (
            <g transform={`translate(${lastActualX - 70}, ${Math.max(lastActualY - 24, 0)})`}>
              <rect width={70} height={22} rx={6} fill="#2e7d45" />
              <text x={8} y={15} fontSize={11} fontFamily="monospace" fill="white" fontWeight={600}>
                {`Actual ${latest.actual_pct.toFixed(1)}%`}
              </text>
            </g>
          )}
        </svg>
        <div className="flex w-full items-center justify-between text-[11px] text-gca-muted">
          {labelIdxs.map((idx, i) => (
            <span key={i}>
              {new Date(metrics[idx].as_of_date).toLocaleDateString("en-GB", { month: "short" })}
            </span>
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
