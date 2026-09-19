"use client";

import { Fragment, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** Fournir pour activer les lignes dépliables (motif journal_d_audit_admin_credix_2). */
  renderExpanded?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

/** Table de données générique avec lignes dépliables — référence : journal d'audit admin. */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  renderExpanded,
  onRowClick,
  emptyTitle = "Aucune donnée",
  emptyDescription,
  className,
}: DataTableProps<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (data.length === 0) {
    return <EmptyState icon="inbox" title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.header} className={col.className}>
              {col.header}
            </TableHead>
          ))}
          {renderExpanded && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => {
          const id = getRowId(row);
          const isOpen = expanded.has(id);
          return (
            <Fragment key={id}>
              <TableRow
                clickable={!!onRowClick || !!renderExpanded}
                onClick={() => {
                  onRowClick?.(row);
                  if (renderExpanded) toggle(id);
                }}
              >
                {columns.map((col) => (
                  <TableCell key={col.header} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
                {renderExpanded && (
                  <TableCell className="w-10">
                    <Icon name="expand_more" size={18} className={cn("text-outline transition-transform", isOpen && "rotate-180")} />
                  </TableCell>
                )}
              </TableRow>
              {renderExpanded && isOpen && (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="bg-surface-container-low">
                    {renderExpanded(row)}
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
