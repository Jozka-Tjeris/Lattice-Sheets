"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode, useRef, useEffect, type SetStateAction } from "react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnDef,
  type SortingState, type ColumnFiltersState, type VisibilityState, type ColumnSizingState,
 } from "@tanstack/react-table";
import type { Column, Row, CellMap, CellValue, TableRow } from "./tableTypes";
import { TableCell } from "../TableCell";

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

  handleAddRow: (orderNum: number) => void;
  handleDeleteRow: (rowId: string) => void;
  handleAddColumn: () => void;
  handleDeleteColumn: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newLabel: string) => void;

  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnSizing: ColumnSizingState;
  table: ReturnType<typeof useReactTable>;
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
  const [rows, setRows] = useState<TableRow[]>(initialRows);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [cells, setCells] = useState<CellMap>(initialCells);
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>(initialGlobalSearch);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  // -----------------------
  // Cell refs for keyboard navigation
  // -----------------------
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  // -----------------------
  // Cell updates
  // -----------------------
  const updateCell = useCallback((rowId: string, columnId: string, value: CellValue) => {
    const key = `${rowId}:${columnId}`;
    setCells(prev => ({ ...prev, [key]: value }));
  }, []);

  // -----------------------
  // Row operations
  // -----------------------
  const handleDeleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    setCells(prev => {
      const updated: CellMap = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [rId] = key.split(":");
        if (rId !== rowId) updated[key] = value;
      });
      return updated;
    });
  }, []);

  const handleAddRow = useCallback((orderNum: number) => {
    const newId = `row-${crypto.randomUUID()}`;
    const newRow: TableRow = { id: newId, order: orderNum };
    setRows(prev => [...prev, newRow]);
    setCells(prev => {
      const newCells = { ...prev };
      columns.forEach(col => {
        newCells[`${newId}:${col.id}`] = "";
      });
      return newCells;
    });
  }, [columns]);

  // -----------------------
  // Column operations
  // -----------------------
  const handleAddColumn = useCallback(() => {
    const newId = `col-${crypto.randomUUID()}`;
    const newCol: Column = { id: newId, label: `Column ${columns.length + 1}`, type: "text" };
    setColumns(prev => [...prev, newCol]);

    // initialize cells for new column
    setCells(prev => {
      const newCells = { ...prev };
      rows.forEach(row => {
        newCells[`${row.id}:${newId}`] = "";
      });
      return newCells;
    });
  }, [columns, rows]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(c => c.id !== columnId));
    setCells(prev => {
      const updated: CellMap = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [, colId] = key.split(":");
        if (colId !== columnId) updated[key] = value;
      });
      return updated;
    });
  }, []);

  const handleRenameColumn = useCallback((columnId: string, newLabel: string) => {
    setColumns(prev => prev.map(c => c.id === columnId ? { ...c, label: newLabel } : c));
  }, []);

  // Focus active cell
  useEffect(() => {
    if (!activeCell) return;
    const key = `${activeCell.rowId}:${activeCell.columnId}`;
    const el = cellRefs.current[key];
    const isTyping = document.activeElement?.tagName === 'INPUT';
    if (el && !isTyping && document.activeElement !== el) {
      el.focus();
    }
  }, [activeCell]);

  const handleSortingChange = useCallback((updaterOrValue: SetStateAction<SortingState>) => {
    setSorting(updaterOrValue);
    // This force-syncs the state update
  }, []);

  // -----------------------
  // Table instance
  // -----------------------

  // Sort rows by order
  const visibleRows = useMemo(() => [...rows].sort((a, b) => a.order - b.order), [rows]);

  // Filter + search
  const tableData = useMemo(() => {
    const search = globalSearch.trim().toLowerCase();
    return visibleRows
      .filter(row => {
        if (!search) return true;
        return columns.some(col => {
          const value = cells[`${row.id}:${col.id}`];
          return value != null && String(value).toLowerCase().includes(search);
        });
      })
      .map((row, idx) => {
        const record: Record<string, CellValue> = { id: row.id, order: idx };
        columns.forEach(col => {
          record[col.id] = cells[`${row.id}:${col.id}`] ?? "";
        });
        return record;
      });
  }, [visibleRows, columns, cells, globalSearch]);

  // Column defs for TanStack
  const tableColumns: ColumnDef<unknown>[] = useMemo(() => {
    return columns.map((col) => ({
      id: col.id,
      accessorKey: col.id,
      header: col.label,
      enableColumnFilter: true,
      filterFn: col.type === "number" ? "inNumberRange" : "includesString",
      size: col.width ?? 150,
      minSize: 80,
      maxSize: 300,
      enableResizing: true,
      cell: info => {
        const rowElem = info.row.original as Row;
        const rowId = rowElem.id;
        const columnId = col.id;
        const cellKey = `${rowId}:${columnId}`;

        return (
          <TableCell
            cellId={cellKey}
            value={cells[cellKey] ?? ""}
            rowId={rowId}
            columnId={columnId}
            onClick={() => setActiveCell({ rowId, columnId })}
            onChange={value => updateCell(rowId, columnId, value)}
            registerRef={registerRef}
          />
        );
      }
    }));
  }, [columns, cells, updateCell, registerRef]);

  // TanStack table instance
  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      columnSizing,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode: "onChange",
    defaultColumn: { size: 150 },
  });

  const contextValue = useMemo(() => ({
    rows,
    columns,
    cells,
    activeCell,
    globalSearch,
    setActiveCell,
    setGlobalSearch,
    registerRef,
    updateCell,
    handleAddRow,
    handleDeleteRow,
    handleAddColumn,
    handleDeleteColumn,
    handleRenameColumn,
    table,
    sorting,
    columnFilters,
    columnSizing
  }), [rows, columns, cells, activeCell, globalSearch, columnFilters, columnSizing, table, sorting,
    handleAddColumn, handleAddRow, handleDeleteColumn, handleDeleteRow, handleRenameColumn, registerRef, updateCell]);

  return (
    <TableContext.Provider value={contextValue}>
      {children}
    </TableContext.Provider>
  );
}
