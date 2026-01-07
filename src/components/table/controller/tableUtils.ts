import { type CellKey, type CellValue } from "./tableTypes";

export function getCellValue(cells: Record<CellKey, CellValue>, rowId: string, columnId: string) {
  const key = `${rowId}:${columnId}`;
  return cells[key as CellValue];
}

export function isActiveCell(activeCell: { rowId: string; columnId: string } | null, rowId: string, columnId: string) {
  return activeCell?.rowId === rowId && activeCell?.columnId === columnId;
}
