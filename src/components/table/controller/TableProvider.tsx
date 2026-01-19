"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode, useRef, useEffect } from "react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type ColumnDef,
  type SortingState, type ColumnFiltersState, type VisibilityState, type ColumnSizingState,
  type Table,
 } from "@tanstack/react-table";
import type { Column, Row, CellMap, CellValue, TableRow, ColumnType } from "./tableTypes";
import { TableCell } from "../TableCell";
import { api as trpc } from "~/trpc/react";

export const TEST_TABLE_ID = "cmk732o8z0002rxrtztx6teww";

export type TableProviderState = {
  rows: TableRow[];
  columns: Column[];
  cells: CellMap;
  activeCell: { rowId: string; columnId: string } | null;
  globalSearch: string;
  setActiveCell: (cell: { rowId: string; columnId: string } | null) => void;
  setGlobalSearch: (search: string) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  updateCell: (tableId: string, rowId: string, columnId: string, value: CellValue) => void;
  handleAddRow: (orderNum: number, tableId: string) => void;
  handleDeleteRow: (rowId: string, tableId: string) => void;
  handleAddColumn: (orderNum: number, tableId: string, label: string, type: ColumnType) => void;
  handleDeleteColumn: (columnId: string, tableId: string) => void;
  handleRenameColumn: (columnId: string, newLabel: string, tableId: string) => void;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnSizing: ColumnSizingState;
  table: Table<TableRow>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  getIsStructureStable: () => boolean;
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

function createTableRow(row: Row): TableRow {
  return {
    ...row,
    internalId: row.internalId ?? row.id,
    cells: {},
  };
}

export function TableProvider({ children, initialRows, initialColumns, initialCells, initialGlobalSearch = "" }: TableProviderProps) {
  // 1. Initialize with stable internal IDs
  const [rows, setRows] = useState<TableRow[]>(() => initialRows.map(r => createTableRow({ ...r, internalId: r.id })));
  const [columns, setColumns] = useState<Column[]>(() => initialColumns.map(c => ({ ...c, internalId: c.id, columnType: c.columnType })));
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

  const beginStructureMutation = () => {
    structureMutationInFlightRef.current += 1;
  };

  const endStructureMutation = () => {
    structureMutationInFlightRef.current -= 1;
  };

  const getIsStructureStable = useCallback(() => structureMutationInFlightRef.current === 0, []);

  const pendingCellUpdatesRef = useRef<
    Array<{ rowId: string; columnId: string; value: CellValue; tableId: string; }>
  >([]);

  // Data update effects (refresh data states once tRPC data comes in)
  useEffect(() => {
    if (initialRows.length > 0) {
      setRows(initialRows.map(r => createTableRow({ ...r, internalId: r.id })));
    }
  }, [initialRows]);

  useEffect(() => {
    if (initialColumns.length > 0) {
      setColumns(initialColumns.map(c => ({ ...c, internalId: c.id, columnType: c.columnType })));
    }
  }, [initialColumns]);

  useEffect(() => {
    if (Object.keys(initialCells).length > 0) {
      setCells(initialCells);
    }
  }, [initialCells]);


  // -----------------------
  // tRPC mutations
  // -----------------------
  const updateCellsMutation = trpc.cell.updateCells.useMutation();

  const addRowMutation = trpc.row.addRow.useMutation({
    onMutate: () => {
      beginStructureMutation();
    },
    onSuccess: ({ row, optimisticId }) => {
      setRows(prev => prev.map(r => 
        createTableRow(r.id === optimisticId ? { ...row, internalId: optimisticId, optimistic: false} : r
      )));
      // NO LONGER NEEDED: Rewriting all cell keys is unnecessary because we kept internalId stable!
    },
    onError: (_, { optimisticId }) => {
      setRows(prev => prev.filter(r => r.id !== optimisticId));
    },
    onSettled: () => {
      endStructureMutation();
    },
  });

  const addColumnMutation = trpc.column.addColumn.useMutation({
    onMutate: () => {
      beginStructureMutation();
    },
    onSuccess: ({ column, optimisticId }) => {
      setColumns(prev => prev.map(c => 
        c.id === optimisticId 
          ? { id: column.id, internalId: optimisticId, label: column.name, columnType: column.columnType as ColumnType, order: column.order, optimistic: false } 
          : c
      ));
    },
    onError: (_, { optimisticId }) => {
      setColumns(prev => prev.filter(c => c.id !== optimisticId));
    },
    onSettled: () => {
      endStructureMutation();
    },
  });

  const deleteRowMutation = trpc.row.deleteRow.useMutation();
  const deleteColumnMutation = trpc.column.deleteColumn.useMutation();
  const renameColumnMutation = trpc.column.renameColumn.useMutation();

  // -----------------------
  // Cell updates
  // -----------------------
  const updateCell = useCallback((tableId: string, stableRowId: string, stableColumnId: string, value: CellValue) => {
    const key = `${stableRowId}:${stableColumnId}`;
    setCells(prev => ({ ...prev, [key]: value }));
    const actualRow = rows.find(r => r.internalId === stableRowId || r.id === stableRowId);
    const actualCol = columns.find(c => c.internalId === stableColumnId || c.id === stableColumnId);
    if (!actualCol) return;

    const payload = {
      rowId: actualRow?.id ?? stableRowId,
      columnId: actualCol?.id ?? stableColumnId,
      value: String(value),
      tableId: tableId,
    };

    pendingCellUpdatesRef.current.push(payload);
  }, [rows, columns]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (structureMutationInFlightRef.current > 0) return;
      if (pendingCellUpdatesRef.current.length === 0) return;

      const updatesToSend = [...pendingCellUpdatesRef.current];
      pendingCellUpdatesRef.current = [];

      updateCellsMutation.mutate(updatesToSend);
    }, 300); // every 300ms, adjust as needed

    return () => clearInterval(interval);
  }, [updateCellsMutation]);

  // -----------------------
  // Structural Operations
  // -----------------------
  const handleAddRow = useCallback((orderNum: number, tableId: string) => {
    const optimisticId = `optimistic-row-${crypto.randomUUID()}`;
    setRows(prev => [...prev, { id: optimisticId, internalId: optimisticId, order: orderNum, optimistic: true, cells: {} }]);
    addRowMutation.mutate({ tableId, orderNum, optimisticId });
  }, [addRowMutation]);

  const handleAddColumn = useCallback((orderNum: number, tableId: string, label: string, type: ColumnType) => {
    const optimisticId = `optimistic-col-${crypto.randomUUID()}`;
    setColumns(prev => [...prev, { id: optimisticId, internalId: optimisticId, label, order: orderNum, columnType: type, optimistic: true }]);
    addColumnMutation.mutate({ tableId, label, orderNum, type, optimisticId });
  }, [addColumnMutation]);

  const handleDeleteRow = useCallback((rowId: string, tableId: string) => {
    beginStructureMutation();
    setRows(prev => prev.filter(r => r.id !== rowId && r.internalId !== rowId));
    deleteRowMutation.mutate(
      { tableId, rowId },
      { onSettled: endStructureMutation }
    );
  }, [deleteRowMutation]);

  const handleDeleteColumn = useCallback((columnId: string, tableId: string) => {
    beginStructureMutation();
    setColumns(prev => prev.filter(c => c.id !== columnId && c.internalId !== columnId));
    deleteColumnMutation.mutate(
      { tableId, columnId },
      { onSettled: endStructureMutation }
    );
  }, [deleteColumnMutation]);

  const handleRenameColumn = useCallback((columnId: string, newLabel: string, tableId: string) => {
    setColumns(prev => prev.map(c => (c.id === columnId || c.internalId === columnId) ? { ...c, label: newLabel } : c));
    renameColumnMutation.mutate({ tableId, columnId, newLabel });
  }, [renameColumnMutation]);

  // -----------------------
  // Table Setup
  // -----------------------
  const visibleRows = useMemo(() => [...rows].sort((a, b) => a.order - b.order), [rows]);

  const tableData = useMemo<TableRow[]>(() => {
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
        const record: TableRow = {
          ...row,
          internalId: rId,
          order: idx,
          cells: {},
        };
        columns.forEach(col => {
          const cId = col.internalId ?? col.id;
          record.cells[cId] = cells[`${rId}:${cId}`] ?? "";
        });
        return record;
      });
  }, [visibleRows, columns, cells, globalSearch]);

  const tableColumns = useMemo<ColumnDef<TableRow>[]>(() => {
    return columns.map((col) => {
      const colId = col.internalId ?? col.id;
      const resolvedType = (col.columnType ?? "text");
      return {
        id: colId,
        accessorFn: row => row.cells[colId],
        header: col.label,
        size: col.width ?? 150,
        meta: { columnType: resolvedType },
        cell: info => {
          const rowElem = info.row.original;
          const rId = rowElem.internalId ?? rowElem.id;
          const cellKey = `${rId}:${colId}`;

          return (
            <TableCell
              cellId={cellKey}
              value={cells[cellKey] ?? ""}
              rowId={rId}
              columnId={colId}
              columnType={resolvedType}
              onClick={() => setActiveCell({ rowId: rId, columnId: colId })}
              onChange={value => updateCell(TEST_TABLE_ID, rId, colId, value)}
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
    getRowId: row => row.internalId ?? row.id, // CRITICAL: Stability anchor
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
    handleAddRow, handleDeleteRow, handleAddColumn, handleDeleteColumn, handleRenameColumn, getIsStructureStable,
    table, sorting, columnFilters, columnSizing, headerHeight, setHeaderHeight
  }), [rows, columns, cells, activeCell, globalSearch, columnFilters, columnSizing, table, sorting, headerHeight, registerRef, updateCell, handleAddRow, handleDeleteRow, handleAddColumn, handleDeleteColumn, handleRenameColumn, getIsStructureStable]);

  return <TableContext.Provider value={contextValue}>{children}</TableContext.Provider>;
}