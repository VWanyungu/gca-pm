export function ProgressBar({
  completed,
  planned,
  width = "w-full",
}: {
  completed: number;
  planned: number;
  width?: string;
}) {
  return (
    <div className={`relative h-[6px] rounded-[3px] bg-gca-page-bg ${width}`}>
      {planned > 0 && (
        <div
          className="absolute left-0 top-0 z-0 h-[6px] rounded-[3px] bg-gca-muted/35"
          style={{ width: `${Math.round(Math.min(planned, 100))}%` }}
        />
      )}
      <div
        className="absolute left-0 top-0 z-10 h-[6px] rounded-[3px] bg-gca-green"
        style={{ width: `${Math.round(Math.min(completed, 100))}%` }}
      />
    </div>
  );
}
