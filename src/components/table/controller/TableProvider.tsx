"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, 
  type ReactNode, useRef, useEffect 
} from "react";
import { useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  type ColumnDef, type SortingState, type ColumnFiltersState, type VisibilityState,
  type ColumnSizingState, type Table, type CellContext, 
  type ColumnPinningState,
} from "@tanstack/react-table";
import type {
  Column, Row, CellMap, CellValue,TableRow, ColumnType 
} from "./tableTypes";
import { TableCell } from "../TableCell";
import { useTableLayout } from "./useTableLayout";
import { useTableInteractions } from "./useTableInteractions";
import { useTableStructure } from "./useTableStructure";
import { normalizeState, useTableStateCache, type CachedTableState } from "./useTableStateCache";
import { useTableViews } from "./useTableViews";
import type { JsonValue } from "@prisma/client/runtime/client";
import { useVirtualizer, Virtualizer } from "@tanstack/react-virtual";

export type TableStructureState = {
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
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  table: Table<TableRow>;
  headerHeight: number;
  setHeaderHeight: (height: number) => void;
  getIsStructureStable: () => boolean;
  isNumericalValue: (val: string) => boolean;
  startVerticalResize: (e: React.MouseEvent) => void;
  ROW_HEIGHT: number;
  DEFAULT_COL_WIDTH: number;
  MIN_COL_WIDTH: number;
  MAX_COL_WIDTH: number;
  pinColumn: (columnId: string) => void;
  unpinColumn: () => void;
  togglePinColumn: (columnId: string) => void;
  isColumnPinned: (columnId: string) => boolean;
  getPinnedColumnId: () => string | null;
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
};

export type TableViewState = {
  newViewName: string;
  setNewViewName: (viewName: string) => void;
  activeViewId: string | null;
  setActiveViewId: (viewId: string) => void;
  activeViewConfig: CachedTableState | null;
  setActiveViewConfig: (viewConfig: CachedTableState) => void;
  currentConfig: CachedTableState;
  isDirty: boolean;
  isConfigValid: boolean;
  views: { tableId: string; name: string; createdAt: Date; updatedAt: Date; id: string; config: JsonValue; isDefault: boolean; }[];
  defaultView: { tableId: string; name: string; createdAt: Date; updatedAt: Date; id: string; config: JsonValue; isDefault: boolean; } | null | undefined;
  applyView: (view: { id: string; config: unknown; }) => void;
  resetViewConfig: () => void;
  handleCreateView: () => void;
  handleUpdateView: () => void;
  handleSetDefaultView: (view: { id: string; config: unknown; }) => void;
  handleDeleteView: (view: { id: string; config: unknown; }) => void;
}

const TableStructureContext = createContext<TableStructureState | undefined>(undefined);
const TableViewContext = createContext<TableViewState | undefined>(undefined);

export const useTableStructureController = () => {
  const ctx = useContext(TableStructureContext);
  if (!ctx) {
    throw new Error(
      "useTableStructureController must be used within TableProvider"
    );
  }
  return ctx;
};

export const useTableViewController = () => {
  const ctx = useContext(TableViewContext);
  if (!ctx) {
    throw new Error(
      "useTableViewController must be used within TableProvider"
    );
  }
  return ctx;
};

/**
 * @deprecated Prefer useTableStructureController or useTableViewController
 */
export const useTableController = () => {
  const structure = useTableStructureController();
  const views = useTableViewController();

  return useMemo(
    () => ({
      ...structure,
      ...views,
    }),
    [structure, views]
  );
};

type TableProviderProps = {
  children: ReactNode;
  tableId: string;
  initialRows: Row[];
  initialColumns: Column[];
  initialCells: CellMap;
  initialGlobalSearch: string;
};

export function TableProvider({
  children,
  tableId,
  initialRows,
  initialColumns,
  initialCells,
  initialGlobalSearch,
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

  const { load, save } = useTableStateCache(tableId);
  const [cached, setCached] = useState<CachedTableState | null>(null);
  const hasHydratedRef = useRef(false);

  const [globalSearch, setGlobalSearch] = useState<string>(initialGlobalSearch);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: [],
    right: [],
  });

  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cached) return;

    setSorting(cached.sorting ?? []);
    setColumnFilters(cached.columnFilters ?? []);
    setColumnVisibility(cached.columnVisibility ?? {});
    setColumnPinning(cached.columnPinning ?? { left: [], right: [] });
    setGlobalSearch(cached.globalSearch ?? "");
  }, [cached]);

  const pinColumn = useCallback((columnId: string) => {
    setColumnPinning({
      left: [columnId],   // enforce single left pin
      right: [],
    });
  }, []);

  const unpinColumn = useCallback(() => {
    setColumnPinning({ left: [], right: [] });
  }, []);

  const togglePinColumn = useCallback((columnId: string) => {
    setColumnPinning(prev => {
      const isPinned = prev.left?.[0] === columnId;
      return isPinned
        ? { left: [], right: [] }
        : { left: [columnId], right: [] };
    });
  }, []);

  const isColumnPinned = useCallback(
    (columnId: string) => columnPinning.left?.[0] === columnId,
    [columnPinning]
  );

  const getPinnedColumnId = useCallback(
    () => columnPinning.left?.[0] ?? null,
    [columnPinning]
  );

  const handleColumnPinningChange = useCallback(
    (updater: ColumnPinningState | ((prev: ColumnPinningState) => ColumnPinningState)) => {
      setColumnPinning(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;

        // Normalize: single left pin only
        const left = next.left?.slice(0, 1) ?? [];

        return {
          left,
          right: [], // always clear right
        };
      });
    },
    []
  );

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

  const { ROW_HEIGHT, DEFAULT_COL_WIDTH, MIN_COL_WIDTH, MAX_COL_WIDTH, headerHeight, columnSizing, 
    setHeaderHeight, startVerticalResize, setColumnSizing 
  } = useTableLayout(cached?.columnSizing);

  const { activeCell, pendingCellUpdatesRef, cellRefs, updateCellsMutation,
    setActiveCell, registerRef, updateCell, isNumericalValue,
  } = useTableInteractions(null, tableId, rowsRef, columnsRef, setCells);

  const { handleAddRow, handleDeleteRow, 
    handleAddColumn, handleDeleteColumn, handleRenameColumn, 
    getIsStructureStable, structureMutationInFlightRef 
  } = useTableStructure(tableId, setRows, setColumns, columnsRef);

  //Perform initial cache loading
  useEffect(() => {
    if (!columns.length) return;
    if(!getIsStructureStable()) return;
    if(cached) return;

    setCached(load());

    hasHydratedRef.current = true;
  }, [columns, load, cached, getIsStructureStable]);

  // After cache has loaded, perform normalization
  useEffect(() => {
    if (!cached || !columns.length) return;
    const ids = new Set(columns.map(c => c.internalId ?? c.id));
    setCached(prev => {
      const next = prev ? normalizeState(prev, ids) : null;
      if (JSON.stringify(next) !== JSON.stringify(prev)) {
        return next;
      }
      return prev; // <- prevents loop
    });
  }, [columns, cached]);

  //Set hydration ref to true after cache has been filled
  useEffect(() => {
    if (cached) {
      hasHydratedRef.current = true;
    }
  }, [cached]);

  const saveTimeoutRef = useRef<number | null>(null);

  // Debounced saving of cache
  useEffect(() => {
    // Only save cache if already hydrated and no structure mutations are happening
    if(!hasHydratedRef.current) return;
    if(!getIsStructureStable()) return;

    if(saveTimeoutRef.current !== null){
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      save({
        sorting,
        columnFilters,
        columnVisibility,
        columnSizing,
        columnPinning,
        globalSearch,
      });
    }, 300);

    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    sorting,
    columnFilters,
    columnVisibility,
    columnSizing,
    columnPinning,
    globalSearch,
    getIsStructureStable,
    save,
  ]);

  //Flush cell updates after preset interval duration
  useEffect(() => {
    const interval = setInterval(() => {
      if (structureMutationInFlightRef.current > 0) return;
      if (pendingCellUpdatesRef.current.length === 0) return;

      const updatesToSend = [...pendingCellUpdatesRef.current];
      pendingCellUpdatesRef.current = [];

      updateCellsMutation.mutate(updatesToSend);
    }, 300); // every 300ms, adjust as needed

    return () => clearInterval(interval);
  }, [updateCellsMutation, pendingCellUpdatesRef, structureMutationInFlightRef]);

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
  }, [activeCell, cellRefs]);

  // STABLE DATA: We return original row references
  const tableData = useMemo(() => {
    const sorted = [...rows].sort((a, b) => a.order - b.order);
    const search = (globalSearch ?? "").trim().toLowerCase();
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
    const rowIndexColumn: ColumnDef<TableRow, CellValue> = {
      id: "__row_index__",
      header: "#",
      size: 60, // fixed width
      minSize: 60,
      maxSize: 60,
      enableSorting: false,
      enableResizing: false,
      cell: ({ row }) => row.index + 1,
      meta: { columnType: "number", pinned: true },
    };

    const dynamicColumns = columns.map((col) => {
      const colId = col.internalId ?? col.id;
      return {
        id: colId,
        accessorFn: (row: { internalId: string; id: string; }) => cells[`${row.internalId ?? row.id}:${colId}`],
        header: col.label,
        size: col.width ?? DEFAULT_COL_WIDTH,
        minSize: MIN_COL_WIDTH,
        maxSize: MAX_COL_WIDTH,
        meta: { columnType: col.columnType ?? "text", dbId: col.id },
        // Use the stable renderer function
        cell: CellRenderer,
      };
    });

    return [rowIndexColumn, ...dynamicColumns];
    // We include cells here so the accessorFn updates, 
    // but because CellRenderer is stable, the TableCell won't unmount.
  }, [columns, cells, CellRenderer, DEFAULT_COL_WIDTH, MIN_COL_WIDTH, MAX_COL_WIDTH]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: { 
      sorting, 
      columnFilters, 
      columnVisibility, 
      columnSizing, 
      columnPinning: {
        ...columnPinning,
        left: ["__row_index__"] //force row index pinned
      },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: handleColumnPinningChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.internalId ?? row.id,
    columnResizeMode: "onChange",
  });

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => mainScrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8, // buffer rows above/below viewport
  });

  const { newViewName, setNewViewName,
    activeViewId, setActiveViewId,
    activeViewConfig, setActiveViewConfig, currentConfig, resetViewConfig,
    isDirty, isConfigValid,
    views, defaultView, applyView,
    handleCreateView, handleUpdateView, handleSetDefaultView, handleDeleteView,
  } = useTableViews(
    tableId,
    {
      sorting,
      columnFilters,
      columnVisibility,
      columnSizing,
      columnPinning,
      globalSearch,
    },
    {
      setSorting,
      setColumnFilters,
      setColumnVisibility,
      setColumnSizing,
      setColumnPinning,
      setGlobalSearch,
    },
    setActiveCell
  );

  const structureValue = useMemo(
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
      columnVisibility,
      columnPinning,
      headerHeight,
      setHeaderHeight,
      startVerticalResize,
      ROW_HEIGHT,
      DEFAULT_COL_WIDTH, 
      MIN_COL_WIDTH, 
      MAX_COL_WIDTH,
      pinColumn,
      unpinColumn,
      togglePinColumn,
      isColumnPinned,
      getPinnedColumnId,
      mainScrollRef,
      rowVirtualizer,
    }),
    [
      rows,
      columns,
      cells,
      activeCell,
      globalSearch,
      columnFilters,
      columnSizing,
      columnVisibility,
      columnPinning,
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
      setActiveCell,
      setHeaderHeight,
      ROW_HEIGHT,
      DEFAULT_COL_WIDTH,
      MIN_COL_WIDTH,
      MAX_COL_WIDTH,
      pinColumn,
      unpinColumn,
      togglePinColumn,
      isColumnPinned,
      getPinnedColumnId,
      mainScrollRef,
      rowVirtualizer,
    ],
  );

  const viewValue = useMemo(
    () => ({
      newViewName,
      setNewViewName,
      activeViewId,
      setActiveViewId,
      activeViewConfig,
      setActiveViewConfig,
      currentConfig,
      isDirty,
      isConfigValid,
      views,
      defaultView,
      applyView,
      resetViewConfig,
      handleCreateView,
      handleUpdateView,
      handleSetDefaultView,
      handleDeleteView,
    }),
    [
      newViewName,
      setNewViewName,
      activeViewId,
      setActiveViewId,
      activeViewConfig,
      setActiveViewConfig,
      currentConfig,
      isDirty,
      isConfigValid,
      views,
      defaultView,
      applyView,
      resetViewConfig,
      handleCreateView,
      handleUpdateView,
      handleSetDefaultView,
      handleDeleteView,
    ]
  );

  return (
    <TableStructureContext.Provider value={structureValue}>
      <TableViewContext.Provider value={viewValue}>
        {children}
      </TableViewContext.Provider>
    </TableStructureContext.Provider>
  );
}
