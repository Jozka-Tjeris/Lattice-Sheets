"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { TableContext, type TableContextType } from "./TableContext";
import { TableHeader } from "./TableHeader";
import { TableBody } from "./TableBody";
import { TableCell } from "./TableCell";

import { columns as columnMeta, rows, type Row } from "./mockTableData";

export function BaseTable() {
  // -----------------------------
  // Dynamic state for rows & columns
  // -----------------------------
  const [data, setData] = useState<Row[]>(rows);
  const [columnsState, setColumnsState] = useState<typeof columnMeta>(columnMeta);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Detect clicks ouside grid
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If the click is NOT inside the table container, deactivate the cell
      if (
        tableContainerRef.current && 
        !tableContainerRef.current.contains(event.target as Node)
      ) {
        setActiveCell(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // -----------------------------
  // Track the currently active cell
  // -----------------------------
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; columnId: string } | null>(
    null
  );

  useEffect(() => {
    if (!activeCell) return;

    const key = `${activeCell.rowIndex}-${activeCell.columnId}`;
    const el = cellRefs.current[key];
    if (el && document.activeElement !== el) {
      el.focus();
    }
  }, [activeCell, data]);

  // -----------------------------
  // Function to update a single cell
  // -----------------------------
  const updateCell = useCallback((rowIndex: number, columnId: string, value: string) => {
    setData(old =>
      old.map((row, i) => (i === rowIndex ? { ...row, [columnId]: value } : row))
    );
  }, []); // Empty deps because it uses the functional update 'old => ...'

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  // -----------------------------
  // Dynamic column functions
  // -----------------------------
  const addColumn = (id: keyof Row, label: string) => {
    setColumnsState(old => [...old, { id, label }]);
  };

  const removeColumn = (id: keyof Row) => {
    setColumnsState(old => old.filter(col => col.id !== id));
  };

  // -----------------------------
  // Navigation helper
  // -----------------------------
  const moveToCell = useCallback((rowIndex: number, colIndex: number) => {
    if (
      rowIndex < 0 ||
      rowIndex >= data.length ||
      colIndex < 0 ||
      colIndex >= columnsState.length
    )
      return;

    const columnId = columnsState[colIndex]!.id;
    setActiveCell({ rowIndex, columnId });
  }, [data.length, columnsState]);

  // -----------------------------
  // Columns for TanStack Table
  // -----------------------------
  const tableColumns: ColumnDef<Row>[] = useMemo(
    () =>
      columnsState.map((col, colIndex) => ({
        accessorKey: col.id,
        header: col.label,
        cell: info => {
          const rowIndex = info.row.index;
          const columnId = info.column.id;

          return (
            <TableCell
              value={
                typeof info.getValue() === "string" || typeof info.getValue() === "number"
                  ? String(info.getValue())
                  : ""
              }
              isActive={activeCell?.rowIndex === rowIndex && activeCell?.columnId === columnId}
              onClick={() => setActiveCell({ rowIndex, columnId })}
              onChange={newValue =>
                info.table.options.meta?.updateCell(rowIndex, columnId, newValue)
              }
              onMoveNext={() => moveToCell(rowIndex, colIndex + 1)}
              onMovePrev={() => moveToCell(rowIndex, colIndex - 1)}
              onMoveUp={() => moveToCell(rowIndex - 1, colIndex)}
              onMoveDown={() => moveToCell(rowIndex + 1, colIndex)}
              cellId={`${rowIndex}-${columnId}`}
              registerRef={registerRef}
            />
          );
        },
        enableResizing: true,
        size: 150,
        minSize: 80,
        maxSize: 300,
      })),
    [columnsState, activeCell, data, moveToCell]
  );

  // -----------------------------
  // Create the table instance
  // -----------------------------
  const table = useReactTable({
    data,
    columns: tableColumns,
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: { size: 150 },
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateCell,
      addColumn,
      removeColumn,
    },
  });

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <TableContext.Provider value={{ table } as TableContextType<unknown>}>
      <div ref={tableContainerRef} className="w-full overflow-x-auto border">
        <div className="max-h-[calc(100vh-136px)] overflow-y-auto">
          <table className="border-collapse table-auto w-max">
            <TableHeader />
            <TableBody />
          </table>
        </div>
      </div>
    </TableContext.Provider>
  );
}
