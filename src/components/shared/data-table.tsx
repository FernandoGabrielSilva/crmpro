'use client';

import {
  tableFeatures,
  useTable,
  rowSelectionFeature,
  type ColumnDef,
  type RowSelectionState,
  type RowData,
} from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export const dataTableFeatures = tableFeatures({ rowSelectionFeature });
export type DataTableFeatures = typeof dataTableFeatures;

export type DataTableProps<TData extends RowData> = {
  data: TData[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  getRowId?: (row: TData) => string;
  selected?: RowSelectionState;
  onSelectedChange?: (selection: RowSelectionState) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: TData) => void;
};

export function DataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  selected,
  onSelectedChange,
  isLoading,
  emptyState,
  onRowClick,
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: onSelectedChange ? { rowSelection: selected ?? {} } : undefined,
    onRowSelectionChange: onSelectedChange
      ? (updater) => {
          const next =
            typeof updater === 'function' ? updater(selected ?? {}) : updater;
          onSelectedChange(next);
        }
      : undefined,
  });

  const rows = table.getRowModel().rows;

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {onSelectedChange && (
              <TableHead className="w-10">
                <Checkbox
                  checked={table.getIsAllPageRowsSelected()}
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label="Selecionar todos"
                />
              </TableHead>
            )}
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            data-state={row.getIsSelected() ? 'selected' : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
            onClick={() => onRowClick?.(row.original)}
          >
            {onSelectedChange && (
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Selecionar linha"
                />
              </TableCell>
            )}
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
