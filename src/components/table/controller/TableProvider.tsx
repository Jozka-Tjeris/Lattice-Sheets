"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  useRef,
  useEffect,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ColumnSizingState,
  type Table,
  type CellContext,
} from "@tanstack/react-table";
import type {
  Column,
  Row,
  CellMap,
  CellValue,
  TableRow,
  ColumnType,
} from "./tableTypes";
import { TableCell } from "../TableCell";
import { api as trpc } from "~/trpc/react";
import { useTableLayout } from "./useTableLayout";

export const ROW_HEIGHT = 40;
export const BORDER_WIDTH = 1;

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
  handleAddColumn: (orderNum: number, label: string, type: ColumnType) => void;
  handleDeleteColumn: (columnId: string) => void;
  handleRenameColumn: (columnId: string, newLabel: string) => void;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnSizing: ColumnSizingState;
  table: Table<TableRow>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  getIsStructureStable: () => boolean;
  isNumericalValue: (val: string) => boolean;
  startVerticalResize: (e: React.MouseEvent) => void;
};

const TableContext = createContext<TableProviderState | undefined>(undefined);

export const useTableController = () => {
  const ctx = useContext(TableContext);
  if (!ctx)
    throw new Error("useTableController must be used within TableProvider");
  return ctx;
};

type TableProviderProps = {
  children: ReactNode;
  tableId: string;
  initialRows: Row[];
  initialColumns: Column[];
  initialCells: CellMap;
  initialGlobalSearch?: string;
};

export function TableProvider({
  children,
  tableId,
  initialRows,
  initialColumns,
  initialCells,
  initialGlobalSearch = "",
}: TableProviderProps) {
  const [rows, setRows] = useState<TableRow[]>(() =>
    initialRows.map((r) => ({ ...r, internalId: r.internalId ?? r.id })),
  );
  const [columns, setColumns] = useState<Column[]>(() =>
    initialColumns.map((c) => ({
      ...c,
      internalId: c.id,
      columnType: c.columnType,
    })),
  );
  const [cells, setCells] = useState<CellMap>(initialCells);

  // Sync refs to rows/columns so updateCell doesn't need them in dependency array
  const rowsRef = useRef(rows);
  const columnsRef = useRef(columns);
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { columnsRef.current = columns; }, [columns]);

  const [activeCell, setActiveCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [globalSearch, setGlobalSearch] = useState<string>(initialGlobalSearch);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const structureMutationInFlightRef = useRef(0);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isNumericalValue = useCallback((val: string) => {
    return /^-?\d*\.?\d*$/.test(val);
  }, []);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  const beginStructureMutation = () => {
    structureMutationInFlightRef.current += 1;
  };

  const endStructureMutation = () => {
    structureMutationInFlightRef.current -= 1;
  };

  const getIsStructureStable = useCallback(
    () => structureMutationInFlightRef.current === 0,
    [],
  );

  const pendingCellUpdatesRef = useRef<
    Array<{
      rowId: string;
      columnId: string;
      value: CellValue;
      tableId: string;
    }>
  >([]);

  useEffect(() => {
    if (initialRows.length > 0) {
      setRows(initialRows.map((r) => ({ ...r, internalId: r.internalId ?? r.id })));
    }
  }, [initialRows]);

  useEffect(() => {
    if (initialColumns.length > 0) {
      setColumns(initialColumns.map((c) => ({ ...c, internalId: c.id, columnType: c.columnType })));
    }
  }, [initialColumns]);

  useEffect(() => {
    if (Object.keys(initialCells).length > 0) {
      setCells(initialCells);
    }
  }, [initialCells]);

  const { ROW_HEIGHT, headerHeight, setHeaderHeight, startVerticalResize, columnSizing, setColumnSizing } = useTableLayout()

  const updateCellsMutation = trpc.cell.updateCells.useMutation();

  const addRowMutation = trpc.row.addRow.useMutation({
    onMutate: () => beginStructureMutation(),
    onSuccess: ({ row, optimisticId }) => {
      setRows((prev) =>
        prev.map((r) =>
          r.internalId === optimisticId || r.id === optimisticId
            ? { ...r, id: row.id, optimistic: false } // Keep existing object ref where possible
            : r,
        ),
      );
    },
    onError: (_, { optimisticId }) => {
      setRows((prev) => prev.filter((r) => r.id !== optimisticId));
    },
    onSettled: () => endStructureMutation(),
  });

  const addColumnMutation = trpc.column.addColumn.useMutation({
    onMutate: () => beginStructureMutation(),
    onSuccess: ({ column, optimisticId }) => {
      setColumns((prev) =>
        prev.map((c) =>
          c.id === optimisticId || c.internalId === optimisticId
            ? { ...c, id: column.id, optimistic: false, label: column.name, order: column.order }
            : c,
        ),
      );
    },
    onError: (_, { optimisticId }) => {
      setColumns((prev) => prev.filter((c) => c.id !== optimisticId));
    },
    onSettled: () => endStructureMutation(),
  });

  const deleteRowMutation = trpc.row.deleteRow.useMutation();
  const deleteColumnMutation = trpc.column.deleteColumn.useMutation();
  const renameColumnMutation = trpc.column.renameColumn.useMutation();

  const updateCell = useCallback(
    (stableRowId: string, stableColumnId: string, value: CellValue) => {
      const key = `${stableRowId}:${stableColumnId}`;
      setCells((prev) => ({ ...prev, [key]: value }));
      
      const actualRow = rowsRef.current.find((r) => r.internalId === stableRowId || r.id === stableRowId);
      const actualCol = columnsRef.current.find((c) => c.internalId === stableColumnId || c.id === stableColumnId);
      
      if (!actualCol) return;

      pendingCellUpdatesRef.current.push({
        rowId: actualRow?.id ?? stableRowId,
        columnId: actualCol?.id ?? stableColumnId,
        value: String(value),
        tableId: tableId,
      });
    },
    [tableId],
  );

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

  const handleAddRow = useCallback(
    (orderNum: number) => {
      if (columnsRef.current.length === 0) return;
      const optimisticId = `optimistic-row-${crypto.randomUUID()}`;
      setRows((prev) => [
        ...prev,
        {
          id: optimisticId,
          internalId: optimisticId,
          order: orderNum,
          optimistic: true
        },
      ]);
      addRowMutation.mutate({ tableId, orderNum, optimisticId });
    },
    [addRowMutation, tableId],
  );

  const handleAddColumn = useCallback(
    (orderNum: number, label: string, type: ColumnType) => {
      const optimisticId = `optimistic-col-${crypto.randomUUID()}`;
      setColumns((prev) => [
        ...prev,
        {
          id: optimisticId,
          internalId: optimisticId,
          label,
          order: orderNum,
          columnType: type,
          optimistic: true,
        },
      ]);
      addColumnMutation.mutate({
        tableId,
        label,
        orderNum,
        type,
        optimisticId,
      });
    },
    [addColumnMutation, tableId],
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      beginStructureMutation();
      setRows((prev) =>
        prev.filter((r) => r.id !== rowId && r.internalId !== rowId),
      );
      deleteRowMutation.mutate(
        { tableId, rowId },
        { onSettled: endStructureMutation },
      );
    },
    [deleteRowMutation, tableId],
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      beginStructureMutation();
      setColumns((prev) =>
        prev.filter((c) => c.id !== columnId && c.internalId !== columnId),
      );
      deleteColumnMutation.mutate(
        { tableId, columnId },
        { onSettled: endStructureMutation },
      );
    },
    [deleteColumnMutation, tableId],
  );

  const handleRenameColumn = useCallback(
    (columnId: string, newLabel: string) => {
      setColumns((prev) =>
        prev.map((c) =>
          c.id === columnId || c.internalId === columnId
            ? { ...c, label: newLabel }
            : c,
        ),
      );
      renameColumnMutation.mutate({ tableId, columnId, newLabel });
    },
    [renameColumnMutation, tableId],
  );

  // STABLE DATA: We return original row references
  const tableData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.order - b.order);
    const search = globalSearch.trim().toLowerCase();
    if (!search) return sorted;

    return sorted.filter((row) => {
      const rId = row.internalId ?? row.id;
      return columns.some((col) => {
        const cId = col.internalId ?? col.id;
        const value = cells[`${rId}:${cId}`];
        return value != null && String(value).toLowerCase().includes(search);
      });
    });
  }, [rows, columns, cells, globalSearch]);

  // Define this inside TableProvider but BEFORE tableColumns
  const CellRenderer = useCallback((info: CellContext<TableRow, CellValue>) => {
    const colId = info.column.id;
    const rowElem = info.row.original;
    const rId = rowElem.internalId ?? rowElem.id;
    const cellKey = `${rId}:${colId}`;
    const resolvedType = info.column.columnDef.meta?.columnType ?? "text";
    
    // Get the most recent value directly from the table state
    // This ensures the value is never stale even if the column def doesn't re-run
    const val = info.getValue();

    return (
      <TableCell
        cellId={cellKey}
        value={val} // info.getValue() is updated by TanStack automatically
        rowId={rId}
        columnId={colId}
        columnType={resolvedType}
        onClick={() => setActiveCell({ rowId: rId, columnId: colId })}
        onChange={(value) => updateCell(rId, colId, value)}
        registerRef={registerRef}
      />
    );
  }, [updateCell, registerRef, setActiveCell]); // Note: cells is NOT a dependency here

  const tableColumns = useMemo<ColumnDef<TableRow, CellValue>[]>(() => {
    return columns.map((col) => {
      const colId = col.internalId ?? col.id;
      return {
        id: colId,
        accessorFn: (row) => cells[`${row.internalId ?? row.id}:${colId}`] ?? "",
        header: col.label,
        size: col.width ?? 150,
        meta: { columnType: col.columnType ?? "text", dbId: col.id },
        // Use the stable renderer function
        cell: CellRenderer,
      };
    });
    // We include cells here so the accessorFn updates, 
    // but because CellRenderer is stable, the TableCell won't unmount.
  }, [columns, cells, CellRenderer]);

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
    getRowId: (row) => row.internalId ?? row.id,
    columnResizeMode: "onChange",
  });

  // Focus effect
  useEffect(() => {
    if (!activeCell) return;
    const el = cellRefs.current[`${activeCell.rowId}:${activeCell.columnId}`];
    if (
      el &&
      document.activeElement?.tagName !== "INPUT" &&
      document.activeElement !== el
    ) {
      el.focus();
    }
  }, [activeCell]);

  const contextValue = useMemo(
    () => ({
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
      getIsStructureStable,
      isNumericalValue,
      table,
      sorting,
      columnFilters,
      columnSizing,
      headerHeight,
      setHeaderHeight,
      startVerticalResize,
    }),
    [
      rows,
      columns,
      cells,
      activeCell,
      globalSearch,
      columnFilters,
      columnSizing,
      table,
      sorting,
      headerHeight,
      registerRef,
      updateCell,
      handleAddRow,
      handleDeleteRow,
      handleAddColumn,
      handleDeleteColumn,
      handleRenameColumn,
      getIsStructureStable,
      isNumericalValue,
      startVerticalResize,
    ],
  );

  return (
    <TableContext.Provider value={contextValue}>
      {children}
    </TableContext.Provider>
  );
}
