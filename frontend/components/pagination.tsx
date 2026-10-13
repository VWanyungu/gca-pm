import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, perPage, total, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-[12px] border border-gca-border px-[16px] py-[12px]">
      {/* Left: showing count */}
      <div className="flex items-center gap-[10px] text-[14px] text-gca-show">
        <span>Showing</span>
        <input
          type="number"
          min="1"
          max={total}
          value={perPage}
          onChange={(e) => {
            const value = parseInt(e.target.value);
            if (!isNaN(value) && value > 0 && value <= total) {
              // Handle perPage change if needed
            }
          }}
          className="rounded-[8px] border border-gca-border bg-white px-[10px] py-[7px] w-12 font-mono font-medium text-gca-dark"
        />
        <span>of {total} projects</span>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-[6px]">
        <PageButton onClick={() => onPageChange(1)} disabled={page === 1}>
          <ChevronsLeft className="size-[14px]" />
        </PageButton>
        <PageButton onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="size-[14px]" />
        </PageButton>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex size-[36px] items-center justify-center rounded-[8px] font-mono text-[13px] ${
              p === page
                ? "bg-gca-page-bg font-semibold text-gca-dark"
                : "bg-white font-medium text-gca-dark hover:bg-gca-page-bg"
            }`}
          >
            {p}
          </button>
        ))}
        <PageButton onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="size-[14px]" />
        </PageButton>
        <PageButton onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          <ChevronsRight className="size-[14px]" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex size-[36px] items-center justify-center rounded-[8px] border border-gca-border bg-white text-gca-show hover:bg-gca-page-bg disabled:opacity-40 disabled:hover:bg-white"
    >
      {children}
    </button>
  );
}
