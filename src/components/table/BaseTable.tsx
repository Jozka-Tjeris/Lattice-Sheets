"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  getFilteredRowModel,
  getSortedRowModel
} from "@tanstack/react-table";
import { TableContext, type TableContextType } from "./TableContext";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";
import { TableCell } from "./TableCell";

import {
  columns as initialColumns,
  rows as initialRows,
  cells as initialCells,
  type Column,
  type Row,
  type CellMap,
  type CellValue,
  type CellKey,
  type TableRow,
  toCellKey,
  fromCellKey
} from "./mockTableData";

// --------------------------------------------
// Helpers
// --------------------------------------------
type ActiveCell = {
  rowId: string;
  columnId: string;
} | null;

export function BaseTable({ globalSearch }: { globalSearch: string }) {
  // --------------------------------------------
  // Core grid state (UI-owned, not TanStack-owned)
  // --------------------------------------------
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [cells, setCells] = useState<CellMap>(initialCells);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // --------------------------------------------
  // Active cell + refs (for focus management)
  // --------------------------------------------
  const [activeCell, setActiveCell] = useState<ActiveCell>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------
  // Click outside → deactivate cell
  // --------------------------------------------
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tableContainerRef.current &&
        !tableContainerRef.current.contains(e.target as Node)
      ) {
        setActiveCell(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --------------------------------------------
  // Focus active cell when it changes
  // --------------------------------------------
  useEffect(() => {
    if (!activeCell) return;

    const key = `${activeCell.rowId}:${activeCell.columnId}`;
    const el = cellRefs.current[key];
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, [activeCell]);

  const registerRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      cellRefs.current[id] = el;
    },
    []
  );

  // --------------------------------------------
  // Cell updates (single source of truth)
  // --------------------------------------------
  const updateCell = useCallback(
    (rowId: string, columnId: string, value: CellValue) => {
      const key = toCellKey({ rowId, columnId });
      setCells(prev => ({
        //Keep previous elements in to preserve structure
        ...prev,
        //Add new cell right after previous elements
        [key]: value,
      }));
    },
    []
  );

  //Row derivation, handles what rows are visible (for future use)
  const visibleRows = useMemo(
    () => [...rows].sort((a, b) => a.order - b.order),
    [rows]
  );

  // --------------------------------------------
  // Navigation helpers (index → id translation)
  // --------------------------------------------
  const moveToCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      if (
        rowIndex < 0 ||
        rowIndex >= rows.length ||
        colIndex < 0 ||
        colIndex >= columns.length
      ) {
        return;
      }

      const rowId = rows[rowIndex]!.id;
      const columnId = columns[colIndex]!.id;
      setActiveCell({ rowId, columnId });
    },
    [rows, columns]
  );

  // --------------------------------------------
  // Derived table data for TanStack
  // --------------------------------------------
  const tableData = useMemo<TableRow[]>(() => {
    return visibleRows.map((row, idx) => {
      const record: TableRow = { id: row.id, order: idx};

      for (const col of columns) {
        record[col.id] = cells[`${row.id}:${col.id}`] ?? "";
      }

      return record;
    });
  }, [visibleRows, columns, cells]);


  // --------------------------------------------
  // Column definitions (TanStack-facing)
  // --------------------------------------------
  const tableColumns: ColumnDef<TableRow>[] = useMemo(
    () =>
      columns.map((col, colIndex) => ({
        id: col.id,
        accessorKey: col.id,
        header: col.label,
        enableColumnFilter: true,
        filterFn: col.type === "number"
        ? "inNumberRange"
        : "includesString",
        size: col.width ?? 150,
        minSize: 80,
        maxSize: 300,
        enableResizing: true,
        cell: info => {
          const rowIndex = info.row.index;
          const rowId = info.row.original.id;
          const columnId = col.id;
          const cellKey: CellKey = `${rowId}:${columnId}`;

          return (
            <TableCell
              cellId={cellKey}
              value={cells[cellKey] ?? ""}
              isActive={
                activeCell?.rowId === rowId &&
                activeCell?.columnId === columnId
              }
              onClick={() => setActiveCell({ rowId, columnId })}
              onChange={value => updateCell(rowId, columnId, value)}
              onMoveNext={() => moveToCell(rowIndex, colIndex + 1)}
              onMovePrev={() => moveToCell(rowIndex, colIndex - 1)}
              onMoveUp={() => moveToCell(rowIndex - 1, colIndex)}
              onMoveDown={() => moveToCell(rowIndex + 1, colIndex)}
              registerRef={registerRef}
            />
          );
        },
      })),
    [columns, cells, activeCell, moveToCell, updateCell, registerRef]
  );

  // --------------------------------------------
  // TanStack table instance
  // --------------------------------------------
  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    defaultColumn: { size: 150 },
    state: {
      sorting,
      columnFilters
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    //Removed later when adding manualFiltering: true
    getFilteredRowModel: getFilteredRowModel(),
    //Removed later when adding manualSorting: true
    getSortedRowModel: getSortedRowModel(),
    /*
    //Remove top line eventually
    manualSorting: true
    getSortedRowModel: undefined
    */
  });

  //Modifying columns
  const handleAddColumn = useCallback(() => {
    const newId = `col_${crypto.randomUUID()}`;
    const newColumn: Column = {
      id: newId,
      label: "New Column",
      width: 150,
      type: "text" //default is text for now
    };
    
    setColumns((prev) => [...prev, newColumn]);
  }, []);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));

    // Also remove cells associated with that column
    setCells(prev => {
      const updated: CellMap = {};
      Object.entries(prev).forEach(([key, value]: [string, CellValue]) => {
        const { columnId: col } = fromCellKey(key as CellKey);
        if (col !== columnId) updated[key as CellKey] = value;
      });
      return updated;
    });
  }, []);

  const handleRenameColumn = useCallback((columnId: string, newLabel: string) => {
    setColumns(prev =>
      prev.map(col => (col.id === columnId ? { ...col, label: newLabel } : col))
    );
  }, []);

  //Modifying Rows
  const handleAddRow = useCallback(() => {
    const newId = `row-${crypto.randomUUID()}`;
    const newRow: TableRow = {
      id: newId,
      order: table.getRowCount()
    };
    
    setRows(prev => [...prev, newRow]);
    //Initialize cells for this row
    setCells(prev => {
      const newCells = { ...prev };
      columns.forEach(col => {
        const key = `${newId}:${col.id}`;
        newCells[key as CellKey] = ""; // default empty
      });
      return newCells;
    });
  }, [columns, table]);

  const handleDeleteRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(row => row.id !== rowId));

    // Also remove cells associated with that column
    setCells(prev => {
      const updated: CellMap = {};
      Object.entries(prev).forEach(([key, value]: [string, CellValue]) => {
        const { rowId: row } = fromCellKey(key as CellKey);
        if (row !== rowId) updated[key as CellKey] = value;
      });
      return updated;
    });
  }, []);

  // --------------------------------------------
  // Render
  // --------------------------------------------
  return (
    <TableContext.Provider value={{ table, handleAddColumn, handleDeleteColumn, handleRenameColumn, handleAddRow, handleDeleteRow } as TableContextType<unknown>}>
      <div ref={tableContainerRef} style={{ overscrollBehavior: "contain" }} 
        className="w-full overflow-x-auto border">
        <div className="max-h-[calc(100vh-136px)] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          <table className="border-collapse table-auto w-max">
            <TableHeader />
            <TableBody />
          </table>
        </div>
      </div>
    </TableContext.Provider>
  );
}
