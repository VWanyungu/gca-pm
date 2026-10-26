import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  label?: string;
}

export function Pagination({
  page,
  totalPages,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  label = "projects",
}: PaginationProps) {
  const [perPageDraft, setPerPageDraft] = useState(String(perPage));
  const lastPage = Math.max(totalPages, 1);
  const firstVisiblePage = lastPage <= 2 || page === 1 ? 1 : Math.min(page + 1, lastPage - 1);
  const visiblePages = Array.from(
    { length: Math.min(2, lastPage - firstVisiblePage + 1) },
    (_, index) => firstVisiblePage + index,
  );
  const lastVisiblePage = visiblePages[visiblePages.length - 1];

  function commitPerPage() {
    const value = Number(perPageDraft);
    if (Number.isInteger(value) && value >= 1 && value <= total) {
      onPerPageChange(value);
      setPerPageDraft(String(value));
    } else {
      setPerPageDraft(String(perPage));
    }
  }

  const renderPageButton = (pageNumber: number) => (
    <button
      key={pageNumber}
      onClick={() => onPageChange(pageNumber)}
      className={`flex size-[36px] items-center justify-center rounded-[8px] font-mono text-[13px] ${
        pageNumber === page
          ? "bg-gca-page-bg font-semibold text-gca-dark"
          : "bg-gca-surface font-medium text-gca-dark hover:bg-gca-page-bg"
      }`}
    >
      {pageNumber}
    </button>
  );

  return (
    // <div className="flex items-center justify-between rounded-[12px] border border-gca-border px-[16px] py-[12px]">
    <div className="flex items-center justify-between rounded-[12px]">
      {/* Left: showing count */}
      <div className="md:flex items-center gap-[10px] text-[13px] text-gca-show font-light hidden">
        <span>Showing</span>
        <input
          type="number"
          min="1"
          max={total}
          value={perPageDraft}
          onChange={(e) => setPerPageDraft(e.target.value)}
          onBlur={commitPerPage}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          className="rounded-[8px] border border-gca-border bg-gca-surface px-[10px] py-[7px] w-[50px] outline-none font-mono font-medium text-gca-dark"
        />
        <span>
          of {total} {label}
        </span>
      </div>

      {/* Right: page buttons */}
      <div className="md:flex items-center gap-[6px] hidden">
        <PageButton onClick={() => onPageChange(1)} disabled={page === 1}>
          <ChevronsLeft className="size-[14px]" />
        </PageButton>
        <PageButton onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="size-[14px]" />
        </PageButton>
        {visiblePages.map(renderPageButton)}
        {lastVisiblePage < lastPage - 1 && (
          <span className="px-[4px] text-[13px] text-gca-muted" aria-hidden="true">
            …
          </span>
        )}
        {lastVisiblePage < lastPage && renderPageButton(lastPage)}
        <PageButton onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="size-[14px]" />
        </PageButton>
        <PageButton onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          <ChevronsRight className="size-[14px]" />
        </PageButton>
      </div>

      {/* Mobile pagination */}
      <div className="flex items-center gap-[6px] w-full justify-between md:hidden">
        <PageButton onClick={() => onPageChange(1)} disabled={page === 1}>
          <ChevronsLeft className="size-[14px]" />
        </PageButton>
        <PageButton onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="size-[14px]" />
        </PageButton>
        {visiblePages.map(renderPageButton)}
        {lastVisiblePage < lastPage - 1 && (
          <span className="px-[4px] text-[13px] text-gca-muted" aria-hidden="true">
            …
          </span>
        )}
        {lastVisiblePage < lastPage && renderPageButton(lastPage)}
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
      className="flex size-[36px] items-center justify-center rounded-[8px] border border-gca-border bg-gca-surface text-gca-show hover:bg-gca-page-bg disabled:opacity-40 disabled:hover:bg-gca-surface"
    >
      {children}
    </button>
  );
}
