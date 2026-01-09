import { useTableController } from "./TableProvider";
import { useCallback } from "react";

export function useMoveActiveCell() {
  const { activeCell, rows, columns, setActiveCell } = useTableController();

  return useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!activeCell) return;

      // 1. Find indices based on internalId (or fallback to id)
      const rowIndex = rows.findIndex(r => (r.internalId ?? r.id) === activeCell.rowId);
      const colIndex = columns.findIndex(c => (c.internalId ?? c.id) === activeCell.columnId);

      if (rowIndex === -1 || colIndex === -1) return;

      let nextRowIdx = rowIndex;
      let nextColIdx = colIndex;

      switch (direction) {
        case "up": nextRowIdx = Math.max(0, rowIndex - 1); break;
        case "down": nextRowIdx = Math.min(rows.length - 1, rowIndex + 1); break;
        case "left": nextColIdx = Math.max(0, colIndex - 1); break;
        case "right": nextColIdx = Math.min(columns.length - 1, colIndex + 1); break;
      }

      if (nextRowIdx === rowIndex && nextColIdx === colIndex) return;

      const nextRow = rows[nextRowIdx]!;
      const nextCol = columns[nextColIdx]!;

      // 2. Set the active cell using the stable internalId
      setActiveCell({ 
        rowId: nextRow.internalId ?? nextRow.id, 
        columnId: nextCol.internalId ?? nextCol.id 
      });
    },
    [activeCell, rows, columns, setActiveCell]
  );
}
