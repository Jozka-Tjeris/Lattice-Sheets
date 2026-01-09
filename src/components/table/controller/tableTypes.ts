export type CellValue = string | number;

export type CellKey = string;

export type ColumnType = "text" | "number";

export type Column = {
  id: string;
  label: string;
  order: number;
  type: ColumnType;
  width?: number;
  optimistic?: boolean;
  internalId?: string;
};

export type Row = {
  id: string;
  order: number;
  optimistic?: boolean;
  internalId?: string;
};

export type TableRow = Row;

export type CellMap = Record<CellKey, CellValue>;

export type CellAddress = {
  rowId: string;
  columnId: string;
};

// Helpers
export function toCellKey(address: CellAddress): CellKey {
  return `${address.rowId}:${address.columnId}`;
}

export function fromCellKey(key: CellKey): CellAddress {
  const parts = key.split(":");

  if (parts.length !== 2) {
    throw new Error(`Invalid CellKey format: ${key}`);
  }
  // Runtime guard ensures tuple safety
  const [rowId, columnId] = parts as [string, string];
  return { rowId, columnId };
}
