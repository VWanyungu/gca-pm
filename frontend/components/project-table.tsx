import Link from "next/link";
import { Pencil } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ProgressBar } from "./progress-bar";
import type { Project } from "@/app/(app)/page";

const STATUS_STYLES: Record<string, string> = {
  active: "text-gca-green",
  complete: "text-gca-green",
  on_hold: "text-gca-warning",
  cancelled: "text-error-text",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  complete: "Complete",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

function buildColumns(canEdit: boolean): ColumnDef<Project>[] {
  return [
    {
      accessorKey: "name",
      header: "Project",
      cell: ({ row }) => (
        <div className="max-w-[260px] overflow-hidden">
          <Link
            href={`/projects/${row.original.id}`}
            className="block truncate text-[13px] font-medium text-gca-dark hover:underline"
          >
            {row.original.name}
          </Link>
          <p className="truncate text-[12px] text-gca-muted">{row.original.client}</p>
        </div>
      ),
    },
    {
      accessorKey: "stage",
      header: "Stage",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate text-[13px] text-gca-dark">{row.original.stage}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span
          className={`block max-w-[120px] truncate text-[13px] font-medium ${STATUS_STYLES[row.original.status] ?? "text-gca-muted"}`}
        >
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "spi",
      header: "SPI",
      meta: { className: "hidden sm:table-cell" },
      cell: ({ row }) => {
        const p = row.original;
        const spiColor = p.spi !== null && p.spi < 0.95 ? "text-gca-warning" : "text-gca-dark";
        return (
          <span className={`font-mono text-[13px] font-medium ${spiColor}`}>
            {p.spi !== null ? (p.completed / p.planned).toFixed(2) : "—"}
          </span>
        );
      },
    },
    {
      id: "progress",
      header: "Completed",
      cell: ({ row }) => (
        <div className="flex max-w-[200px] items-center gap-[8px]">
          <ProgressBar completed={row.original.completed} planned={row.original.planned} width="w-[120px]" />
          <span className="font-mono text-[12px] text-gca-show">{Math.round(row.original.completed)}%</span>
        </div>
      ),
    },
    {
      accessorKey: "nextMilestone",
      header: "Next milestone",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <span className="block max-w-[212px] truncate text-[13px] text-gca-dark">
          {row.original.nextMilestone ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        canEdit ? (
          <Link
            href={`/projects/${row.original.id}/settings`}
            className="flex size-[32px] items-center justify-center rounded-[8px] border border-gca-border text-gca-show hover:bg-gca-page-bg"
          >
            <Pencil className="size-[14px]" />
          </Link>
        ) : null,
    },
  ];
}

export function ProjectTable({ projects, canEdit }: { projects: Project[]; canEdit: boolean }) {
  const columns = buildColumns(canEdit);
  const table = useReactTable({ data: projects, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="text-left text-[12px] font-medium text-gca-muted">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`py-[8px] pr-3 font-medium ${(header.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""}`}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-gca-border">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`py-[12px] pr-3 ${(cell.column.columnDef.meta as { className?: string } | undefined)?.className ?? ""}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
