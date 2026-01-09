"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode, useRef, useEffect, type SetStateAction } from "react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnDef,
  type SortingState, type ColumnFiltersState, type VisibilityState, type ColumnSizingState,
 } from "@tanstack/react-table";
import type { Column, Row, CellMap, CellValue, TableRow, ColumnType } from "./tableTypes";
import { TableCell } from "../TableCell";
import { api as trpc } from "~/trpc/react";

export const TEST_TABLE_ID = "cmk5beznr0002gartzrg6rpy3";

export type TableProviderState = {
  rows: TableRow[];
  columns: Column[];
  cells: CellMap;
  activeCell: { rowId: string; columnId: string } | null;
  globalSearch: string;
  setActiveCell: (cell: { rowId: string; columnId: string } | null) => void;
  setGlobalSearch: (search: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  updateCell: (rowId: string, columnId: string, value: CellValue) => void;
  handleAddRow: (orderNum: number, tableId: string) => void;
  handleDeleteRow: (rowId: string, tableId: string) => void;
  handleAddColumn: (orderNum: number, tableId: string, label: string, type: ColumnType) => void;
  handleDeleteColumn: (columnId: string, tableId: string) => void;
  handleRenameColumn: (columnId: string, newLabel: string, tableId: string) => void;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnSizing: ColumnSizingState;
  table: ReturnType<typeof useReactTable>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
};

const TableContext = createContext<TableProviderState | undefined>(undefined);

export const useTableController = () => {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTableController must be used within TableProvider");
  return ctx;
};

type TableProviderProps = {
  children: ReactNode;
  initialRows: Row[];
  initialColumns: Column[];
  initialCells: CellMap;
  initialGlobalSearch?: string;
};

export function TableProvider({ children, initialRows, initialColumns, initialCells, initialGlobalSearch = "" }: TableProviderProps) {
  // 1. Initialize with stable internal IDs
  const [rows, setRows] = useState<TableRow[]>(() => initialRows.map(r => ({ ...r, internalId: r.id })));
  const [columns, setColumns] = useState<Column[]>(() => initialColumns.map(c => ({ ...c, internalId: c.id })));
  const [cells, setCells] = useState<CellMap>(initialCells);
  
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>(initialGlobalSearch);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [headerHeight, setHeaderHeight] = useState(40);

  const structureMutationInFlightRef = useRef(0);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  // -----------------------
  // tRPC mutations
  // -----------------------
  const updateCellsMutation = trpc.table.updateCells.useMutation();

  const addRowMutation = trpc.table.addRow.useMutation({
    onSuccess: ({ row, optimisticId }) => {
      setRows(prev => prev.map(r => 
        r.id === optimisticId ? { ...row, internalId: optimisticId, optimistic: false } : r
      ));
      // NO LONGER NEEDED: Rewriting all cell keys is unnecessary because we kept internalId stable!
    },
    onError: (_, { optimisticId }) => {
      setRows(prev => prev.filter(r => r.id !== optimisticId));
    },
  });

  const addColumnMutation = trpc.table.addColumn.useMutation({
    onSuccess: ({ column, optimisticId }) => {
      setColumns(prev => prev.map(c => 
        c.id === optimisticId 
          ? { id: column.id, internalId: optimisticId, label: column.name, type: column.type as ColumnType, order: column.order, optimistic: false } 
          : c
      ));
    },
    onError: (_, { optimisticId }) => {
      setColumns(prev => prev.filter(c => c.id !== optimisticId));
    },
  });

  const deleteRowMutation = trpc.table.deleteRow.useMutation();
  const deleteColumnMutation = trpc.table.deleteColumn.useMutation();
  const renameColumnMutation = trpc.table.renameColumn.useMutation();

  // -----------------------
  // Cell updates
  // -----------------------
  const updateCell = useCallback((stableRowId: string, stableColumnId: string, value: CellValue) => {
    // Find actual IDs for the API call
    const actualRow = rows.find(r => r.internalId === stableRowId || r.id === stableRowId);
    const actualCol = columns.find(c => c.internalId === stableColumnId || c.id === stableColumnId);
    if (!actualCol) return;

    const key = `${stableRowId}:${stableColumnId}`;
    setCells(prev => ({ ...prev, [key]: value }));

    updateCellsMutation.mutate([{
      rowId: actualRow?.id ?? stableRowId,
      columnId: actualCol?.id ?? stableColumnId,
      value: String(value)
    }]);
  }, [columns, rows, updateCellsMutation]);

  // -----------------------
  // Structural Operations
  // -----------------------
  const handleAddRow = useCallback((orderNum: number, tableId: string) => {
    const optimisticId = `optimistic-row-${crypto.randomUUID()}`;
    setRows(prev => [...prev, { id: optimisticId, internalId: optimisticId, order: orderNum, optimistic: true }]);
    addRowMutation.mutate({ tableId, orderNum, optimisticId });
  }, [addRowMutation]);

  const handleAddColumn = useCallback((orderNum: number, tableId: string, label: string, type: ColumnType) => {
    const optimisticId = `optimistic-col-${crypto.randomUUID()}`;
    setColumns(prev => [...prev, { id: optimisticId, internalId: optimisticId, label, order: orderNum, type, optimistic: true }]);
    addColumnMutation.mutate({ tableId, label, orderNum, type, optimisticId });
  }, [addColumnMutation]);

  const handleDeleteRow = useCallback((rowId: string, tableId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId && r.internalId !== rowId));
    deleteRowMutation.mutate({ tableId, rowId });
  }, [deleteRowMutation]);

  const handleDeleteColumn = useCallback((columnId: string, tableId: string) => {
    setColumns(prev => prev.filter(c => c.id !== columnId && c.internalId !== columnId));
    deleteColumnMutation.mutate({ tableId, columnId });
  }, [deleteColumnMutation]);

  const handleRenameColumn = useCallback((columnId: string, newLabel: string, tableId: string) => {
    setColumns(prev => prev.map(c => (c.id === columnId || c.internalId === columnId) ? { ...c, label: newLabel } : c));
    renameColumnMutation.mutate({ tableId, columnId, newLabel });
  }, [renameColumnMutation]);

  // -----------------------
  // Table Setup
  // -----------------------
  const visibleRows = useMemo(() => [...rows].sort((a, b) => a.order - b.order), [rows]);

  const tableData = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return visibleRows
      .filter(row => {
        if (!search) return true;
        const rId = row.internalId ?? row.id;
        return columns.some(col => {
          const cId = col.internalId ?? col.id;
          const value = cells[`${rId}:${cId}`];
          return value != null && String(value).toLowerCase().includes(search);
        });
      })
      .map((row, idx) => {
        const rId = row.internalId ?? row.id;
        const record: any = { ...row, internalId: rId, order: idx };
        columns.forEach(col => {
          const cId = col.internalId ?? col.id;
          record[cId] = cells[`${rId}:${cId}`] ?? "";
        });
        return record;
      });
  }, [visibleRows, columns, cells, globalSearch]);

  const tableColumns: ColumnDef<any>[] = useMemo(() => {
    return columns.map((col) => {
      const colId = col.internalId ?? col.id;
      return {
        id: colId,
        accessorKey: colId,
        header: col.label,
        size: col.width ?? 150,
        cell: info => {
          const rowElem = info.row.original;
          const rId = rowElem.internalId || rowElem.id;
          const cellKey = `${rId}:${colId}`;

          return (
            <TableCell
              cellId={cellKey}
              value={cells[cellKey] ?? ""}
              rowId={rId}
              columnId={colId}
              columnType={col.type}
              onClick={() => setActiveCell({ rowId: rId, columnId: colId })}
              onChange={value => updateCell(rId, colId, value)}
              registerRef={registerRef}
            />
          );
        }
      };
    });
  }, [columns, cells, updateCell, registerRef]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: { sorting, columnFilters, columnVisibility, columnSizing },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row: any) => row.internalId || row.id, // CRITICAL: Stability anchor
    columnResizeMode: "onChange",
  });

  // Focus effect
  useEffect(() => {
    if (!activeCell) return;
    const el = cellRefs.current[`${activeCell.rowId}:${activeCell.columnId}`];
    if (el && document.activeElement?.tagName !== 'INPUT' && document.activeElement !== el) {
      el.focus();
    }
  }, [activeCell]);

  const contextValue = useMemo(() => ({
    rows, columns, cells, activeCell, globalSearch,
    setActiveCell, setGlobalSearch, registerRef, updateCell,
    handleAddRow, handleDeleteRow, handleAddColumn, handleDeleteColumn, handleRenameColumn,
    table, sorting, columnFilters, columnSizing, headerHeight, setHeaderHeight
  }), [rows, columns, cells, activeCell, globalSearch, columnFilters, columnSizing, table, sorting, headerHeight, registerRef, updateCell, handleAddRow, handleDeleteRow, handleAddColumn, handleDeleteColumn, handleRenameColumn]);

  return <TableContext.Provider value={contextValue}>{children}</TableContext.Provider>;
}