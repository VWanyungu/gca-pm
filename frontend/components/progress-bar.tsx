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
      <div
        className="absolute left-0 top-0 h-[6px] rounded-[3px] bg-gca-green"
        style={{ width: `${Math.round(Math.min(completed, 100))}%` }}
      />
      {planned > 0 && planned < 100 && (
        <div
          className="absolute top-[-3px] h-[12px] w-[2px] bg-gca-dark"
          style={{ left: `${Math.round(planned)}%` }}
        />
      )}
    </div>
  );
}
