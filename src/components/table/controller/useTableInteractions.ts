import { useState, useRef, useCallback, useEffect } from "react";
import type { CellValue, TableRow, Column, CellMap } from "./tableTypes";
import { api as trpc } from "~/trpc/react";

type PendingUpdate = {
  rowId: string;
  columnId: string;
  value: CellValue;
  tableId: string;
};

export function useTableInteractions(
  initialActiveCell: { rowId: string; columnId: string } | null,
  tableId: string,
  rowsRef: React.RefObject<TableRow[]>,
  columnsRef: React.RefObject<Column[]>,
  setCells: React.Dispatch<React.SetStateAction<CellMap>>
) {
  const [activeCell, setActiveCell] = useState(initialActiveCell);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingCellUpdatesRef = useRef<PendingUpdate[]>([]);

  const isNumericalValue = useCallback((val: string) => {
    return /^-?\d*\.?\d*$/.test(val);
  }, []);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  const updateCellsMutation = trpc.cell.updateCells.useMutation();

  const updateCell = useCallback(
    (stableRowId: string, stableColumnId: string, value: CellValue) => {
      const actualRow = rowsRef.current.find(
        (r) => r.internalId === stableRowId || r.id === stableRowId
      );
      const actualCol = columnsRef.current.find(
        (c) => c.internalId === stableColumnId || c.id === stableColumnId
      );
      if (!actualCol) return;

      setCells(prev => ({
        ...prev,
        [`${stableRowId}:${stableColumnId}`]: value,
      }));

      pendingCellUpdatesRef.current.push({
        rowId: actualRow?.id ?? stableRowId,
        columnId: actualCol?.id ?? stableColumnId,
        value: String(value),
        tableId,
      });
    },
    [setCells, tableId, rowsRef, columnsRef]
  );

  // Flush pending updates every 300ms
  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingCellUpdatesRef.current.length === 0) return;
      const updatesToSend = [...pendingCellUpdatesRef.current];
      pendingCellUpdatesRef.current = [];
      updateCellsMutation.mutate(updatesToSend);
    }, 300);

    return () => clearInterval(interval);
  }, [updateCellsMutation]);

  // Auto-focus active cell
  useEffect(() => {
    if (!activeCell) return;
    const el = cellRefs.current[`${activeCell.rowId}:${activeCell.columnId}`];
    if (el && document.activeElement !== el && document.activeElement?.tagName !== "INPUT") {
      el.focus();
    }
  }, [activeCell]);

  return {
    activeCell,
    setActiveCell,
    registerRef,
    updateCell,
    isNumericalValue,
    updateCellsMutation,
    pendingCellUpdatesRef,
    cellRefs
  };
}
