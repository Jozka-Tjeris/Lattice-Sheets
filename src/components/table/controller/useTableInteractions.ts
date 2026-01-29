import { useState, useRef, useCallback, useEffect } from "react";
import type { CellValue, TableRow, Column, CellMap } from "./tableTypes";
import { api as trpc } from "~/trpc/react";
import { useSession } from "next-auth/react";

export type PendingCellUpdate = {
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
  cells: CellMap,
  setCells: React.Dispatch<React.SetStateAction<CellMap>>
) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  
  const utils = trpc.useUtils();
  
  const [activeCell, setActiveCell] = useState(initialActiveCell);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pendingCellUpdatesRef = useRef<PendingCellUpdate[]>([]);

  const isNumericalValue = useCallback((val: string) => {
    return /^-?\d*\.?\d*$/.test(val);
  }, []);

  const registerRef = useCallback((id: string, el: HTMLDivElement | null) => {
    cellRefs.current[id] = el;
  }, []);

  const updateCellsMutation = trpc.cell.updateCells.useMutation({
    onMutate: async (variables) => {
      // 1. Cancel outgoing fetches
      await utils.cell.getCells.cancel({ tableId });

      // 2. Snapshot the current cache for rollback
      const previousCells = utils.cell.getCells.getData({ tableId });

      // 3. Optimistically patch the TRPC cache
      utils.cell.getCells.setData({ tableId }, (old) => {
        if (!old) return old;
        const newMap = { ...old.cells };
        variables.forEach(v => {
          newMap[`${v.rowId}:${v.columnId}`] = v.value;
        });
        return { ...old, cells: newMap };
      });

      return { previousCells };
    },
    onError: (_err, _variables, context) => {
      // 4. If queueing fails, roll back to previous cache state
      if (context?.previousCells) {
        utils.cell.getCells.setData({ tableId }, context.previousCells);
      }
    },
    // We don't use onSuccess here because the cache is already patched in onMutate
  });

  const updateCell = useCallback(
    (stableRowId: string, stableColumnId: string, value: CellValue) => {
      if(!userId) return; // not logged in
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
    [setCells, tableId, rowsRef, columnsRef, userId]
  );

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
