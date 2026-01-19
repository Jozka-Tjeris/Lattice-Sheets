export type CellValue = string | number;

export type CellKey = string;

export type ColumnType = "text" | "number";

export type Column = {
  id: string;
  label: string;
  order: number;
  columnType: ColumnType;
  width?: number;
  optimistic?: boolean;
  internalId?: string;
};

export const COLUMN_CONFIG = {
  text: {
    label: 'Text',
    icon: 'A',
    align: 'text-left',
  },
  number: {
    label: 'Number',
    icon: '#',
    align: 'text-left',
  },
} as const;

export type Row = {
  id: string;
  order: number;
  optimistic?: boolean;
  internalId?: string;
};

export type TableRow = Row & {
  cells: Record<string, CellValue>;
};

export type CellMap = Record<CellKey, CellValue>;

export type CellAddress = {
  rowId: string;
  columnId: string;
};

export type TableData = {
  baseId: string;
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

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
