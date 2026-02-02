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
  Column, Row, CellMap, CellValue, TableRow 
} from "./tableTypes";
import { TableCell } from "../TableCell";
import { useTableLayout } from "./useTableLayout";
import { useTableInteractions, type PendingCellUpdate } from "./useTableInteractions";
import { useTableStructure } from "./useTableStructure";
import { normalizeState, useTableStateCache, type CachedTableState } from "./useTableStateCache";
import { useTableViews } from "./useTableViews";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useTableJsonIO } from "./useTableJsonIO";
import type { ImportTarget } from "~/server/services/tableIOtypes";
import { INDEX_COL_ID } from "~/constants/table";

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
  handleAddRow: () => void;
  handleDeleteRow: (rowId: string, rowPosition: number) => void;
  handleAddColumn: () => void;
  handleDeleteColumn: (columnId: string) => void;
  handleRenameColumn: (columnId: string) => void;
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
  mainScrollRef: React.RefObject<HTMLDivElement | null>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  getPinnedLeftStyle: (columnId: string) => React.CSSProperties;
  isPinnedLeft: (columnId: string) => boolean;
  lastPinnedLeftId: string | null;
};

export type TableViewState = {
  activeViewId: string | null;
  setActiveViewId: (viewId: string) => void;
  activeViewConfig: CachedTableState | null;
  setActiveViewConfig: (viewConfig: CachedTableState) => void;
  currentConfig: CachedTableState;
  isViewDirty: boolean;
  isConfigValid: boolean;
  views: { id: string; name: string; config: CachedTableState; isDefault: boolean; }[];
  applyView: (view: { id: string; tableId: string; config: unknown; }) => void;
  resetViewConfig: () => void;
  handleCreateView: () => void;
  handleUpdateView: () => void;
  handleSetDefaultView: (viewId: string) => void;
  handleDeleteView: (viewId: string) => void;
}

export type TableIOState = {
  exportJson: (tableId: string) => Promise<void>;
  importJson: (file: File, target: ImportTarget, baseId: string) => Promise<void>;
  isExporting: boolean;
  isImporting: boolean;
}

const TableStructureContext = createContext<TableStructureState | undefined>(undefined);
const TableViewContext = createContext<TableViewState | undefined>(undefined);
const TableIOContext = createContext<TableIOState | undefined>(undefined);

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

export const useTableIOController = () => {
  const ctx = useContext(TableIOContext);
  if (!ctx) {
    throw new Error(
      "useTableIOController must be used within TableProvider"
    );
  }
  return ctx;
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
    left: [INDEX_COL_ID],
    right: [],
  });

  const mainScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!cached) return;

    setSorting(cached.sorting ?? []);
    setColumnFilters(cached.columnFilters ?? []);
    setColumnVisibility(cached.columnVisibility ?? {});
    setColumnPinning(cached.columnPinning ?? { left: [INDEX_COL_ID], right: [] });
    setGlobalSearch(cached.globalSearch ?? "");
  }, [cached]);

  const handleColumnPinningChange = useCallback(
    (updater: ColumnPinningState | ((prev: ColumnPinningState) => ColumnPinningState)) => {
      setColumnPinning(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;

        // Normalize: single left pin only
        let left = next.left ?? [];

        // Remove duplicates
        left = Array.from(new Set(left));

        // Ensure index column is always first
        left = left.filter(id => id !== INDEX_COL_ID);
        left.unshift(INDEX_COL_ID);

        return {
          left,
          right: [], // still disabled
        };
      });
    },
    []
  );

  // Used to prevent re-initialization after initial load has finished
  const hasInitializedRows = useRef(false);
  const hasInitializedCols = useRef(false);
  const hasInitializedCells = useRef(false);

  // Resets when tableId changes
  useEffect(() => {
    hasInitializedRows.current = false;
    hasInitializedCols.current = false;
    hasInitializedCells.current = false;
  }, [tableId]);

  useEffect(() => {
    // Only sync if not initialized yet or if the local state is currently empty
    const shouldSync = !hasInitializedRows.current || rows.length === 0;
    if (initialRows.length > 0 && shouldSync) {
      setRows(initialRows.map((r) => (
        { ...r, internalId: r.internalId ?? r.id, optimistic: false }
      )));
      hasInitializedRows.current = true;
    }
  }, [initialRows, tableId, rows.length]); // tableId ensures fresh start on navigation

  useEffect(() => {
    const shouldSync = !hasInitializedCols.current || columns.length === 0;

    if (initialColumns.length > 0 && shouldSync) {
      setColumns(initialColumns.map((c) => (
        { ...c, internalId: c.id, columnType: c.columnType, optimistic: false }
      )));
      hasInitializedCols.current = true;
    }
  }, [initialColumns, tableId, columns.length]);

  useEffect(() => {
    const shouldSync = !hasInitializedCells.current || Object.keys(cells).length === 0;

    if (Object.keys(initialCells).length > 0 && shouldSync) {
      setCells(initialCells);
      hasInitializedCells.current = true;
    }
  }, [initialCells, tableId, cells]);

  const { ROW_HEIGHT, DEFAULT_COL_WIDTH, MIN_COL_WIDTH, MAX_COL_WIDTH, headerHeight, columnSizing, 
    setHeaderHeight, startVerticalResize, setColumnSizing 
  } = useTableLayout(cached?.columnSizing);

  const { activeCell, pendingCellUpdatesRef, cellRefs, updateCellsMutation,
    setActiveCell, registerRef, updateCell, isNumericalValue,
  } = useTableInteractions(null, tableId, rowsRef, columnsRef, cells, setCells);

  const { exportJson, importJson, isExporting, isImporting
  } = useTableJsonIO();

  const isOptimisticColumnId = (id: string) =>
  id.startsWith("optimistic-col-");

  // After cache has loaded, perform normalization
  useEffect(() => {
    if (!cached || !columns.length) return;
    const ids = new Set(columns.map(c => c.id).filter(id => !isOptimisticColumnId(id)));
    // Always add INDEX_COL_ID as it's a required column id stored in a view config
    ids.add(INDEX_COL_ID);
    setCached(prev => {
      const next = prev ? normalizeState(prev, columns, ids) : null;
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
    // Note: by default un-initialized cells are undefined, so using nullish operator prevents unwanted updates
    const val = info.getValue() ?? "";

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
      id: INDEX_COL_ID,
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
      columnPinning,
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

  const { 
    columnPinning: colPinDep, 
    columnSizing: colSizeDep, 
    columnVisibility: colVisDep 
  } = table.getState();

  const pinnedLeftMeta = useMemo(() => {
    let offset = 0;
    const map: Record<string,
      { id: string; left: number; width: number; index: number }> = {};

    const pinnedLeftColumns = table.getLeftLeafColumns();

    pinnedLeftColumns.forEach((col, index) => {
      map[col.id] = {
        id: col.id,
        left: offset,
        width: col.getSize(),
        index,
      };
      offset += col.getSize();
    });

    return {
      map,
      totalWidth: offset,
      orderedIds: pinnedLeftColumns.map(c => c.id),
    };
  }, 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [table, colPinDep, colSizeDep, colVisDep]);

  const isPinnedLeft = useCallback(
    (columnId: string) => !!pinnedLeftMeta.map[columnId],
    [pinnedLeftMeta]
  );

  const lastPinnedLeftId =
    pinnedLeftMeta.orderedIds[pinnedLeftMeta.orderedIds.length - 1] ?? null;

  const getPinnedLeftStyle = useCallback(
    (columnId: string): React.CSSProperties => {
      const meta = pinnedLeftMeta.map[columnId];
      if (!meta) return {};

      return {
        position: "sticky" as const,
        left: meta.left,
        width: meta.width,
        boxShadow: meta.id === lastPinnedLeftId ? "2px 0 6px rgba(0,0,0,0.1)" : ""
      };
    },
    [pinnedLeftMeta, lastPinnedLeftId]
  );

  const stableTableStateSetters = useMemo(() => ({
    setSorting,
    setColumnFilters,
    setColumnVisibility,
    setColumnSizing,
    setColumnPinning,
    setGlobalSearch,
  }), [setSorting, setColumnFilters, setColumnVisibility, setColumnSizing, setColumnPinning, setGlobalSearch]);

  const stableTableState = useMemo(() => ({
    sorting,
    columnFilters,
    columnVisibility,
    columnSizing,
    columnPinning,
    globalSearch,
  }), [sorting, columnFilters, columnVisibility, columnSizing, columnPinning, globalSearch]);

  // Focus effect (also update based on view config state)
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
  }, [activeCell, cellRefs, stableTableState]);

  const { activeViewId, setActiveViewId,
    activeViewConfig, setActiveViewConfig, currentConfig, resetViewConfig,
    isViewDirty, isConfigValid,
    views, applyView,
    handleCreateView, handleUpdateView, handleDeleteView, handleSetDefaultView,
    onStructureCommitted,
  } = useTableViews(
    tableId,
    stableTableState,
    stableTableStateSetters,
    setActiveCell,
    setCached,
    save,
    columns,
  );

  const { handleAddRow, handleDeleteRow, 
    handleAddColumn, handleDeleteColumn, handleRenameColumn, 
    getIsStructureStable,
    optimisticRowIdMapRef, optimisticColIdMapRef,
  } = useTableStructure(tableId, rows, columns, setRows, setColumns, isViewDirty, onStructureCommitted);

  //Perform initial cache loading
  useEffect(() => {
    if (!columns.length) return;
    if(!getIsStructureStable()) return;
    if(cached) return;

    setCached(load());

    hasHydratedRef.current = true;
  }, [columns, load, cached, getIsStructureStable]);

  const flushPendingCellUpdates = useCallback(() => {
    if (pendingCellUpdatesRef.current.length === 0) return;
    if (!getIsStructureStable()) return; // skip flush while structure is in flight

    const stillPending: PendingCellUpdate[] = [];
    const updatesToSend = pendingCellUpdatesRef.current
      .map(update => {
        // Split the key into rowId and columnId
        const rowId = update.rowId;
        const colId = update.columnId;

        const mappedRowId = optimisticRowIdMapRef.current[rowId] ?? rowId;
        const mappedColId = optimisticColIdMapRef.current[colId] ?? colId;

        // Skip updates for rows or columns that are still unresolved
        if ((rowId.startsWith("optimistic-row-") && !optimisticRowIdMapRef.current[rowId]) ||
            (colId.startsWith("optimistic-col-") && !optimisticColIdMapRef.current[colId])) {
          stillPending.push(update);
          return null;
        }

        return {
          ...update,
          rowId: mappedRowId,
          columnId: mappedColId,
        };
      })
      .filter((u) => u !== null);

    if (updatesToSend.length === 0) return;
    // Re-add pending updates back
    pendingCellUpdatesRef.current = stillPending;

    updateCellsMutation.mutate(updatesToSend);
  }, [getIsStructureStable, optimisticColIdMapRef, optimisticRowIdMapRef, pendingCellUpdatesRef, updateCellsMutation]);

  //Flush cell updates after preset interval duration
  useEffect(() => {
    const interval = setInterval(() => {
      flushPendingCellUpdates();
    }, 300);

    // Cleanup runs once when the component unmounts
    return () => {
      clearInterval(interval);
      flushPendingCellUpdates(); // run exactly once
    };
    // Only include stable deps here
  }, [flushPendingCellUpdates]); 

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
      mainScrollRef,
      rowVirtualizer,
      getPinnedLeftStyle,
      pinnedLeftMeta,
      isPinnedLeft,
      lastPinnedLeftId,
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
      mainScrollRef,
      rowVirtualizer,
      getPinnedLeftStyle,
      pinnedLeftMeta,
      isPinnedLeft,
      lastPinnedLeftId,
    ],
  );

  const viewValue = useMemo(
    () => ({
      activeViewId,
      setActiveViewId,
      activeViewConfig,
      setActiveViewConfig,
      currentConfig,
      isViewDirty,
      isConfigValid,
      views,
      applyView,
      resetViewConfig,
      handleCreateView,
      handleUpdateView,
      handleSetDefaultView,
      handleDeleteView,
    }),
    [
      activeViewId,
      setActiveViewId,
      activeViewConfig,
      setActiveViewConfig,
      currentConfig,
      isViewDirty,
      isConfigValid,
      views,
      applyView,
      resetViewConfig,
      handleCreateView,
      handleUpdateView,
      handleSetDefaultView,
      handleDeleteView,
    ]
  );

  const IOValue = useMemo(
    () => ({
      exportJson,
      importJson,
      isExporting,
      isImporting,
    }),
    [
      exportJson,
      importJson,
      isExporting,
      isImporting,
    ]
  );

  return (
    <TableIOContext.Provider value={IOValue}>
      <TableStructureContext.Provider value={structureValue}>
        <TableViewContext.Provider value={viewValue}>
          {children}
        </TableViewContext.Provider>
      </TableStructureContext.Provider>
    </TableIOContext.Provider>
  );
}
