import type { ColumnType } from "~/components/table/controller/tableTypes";
import type { ViewConfig } from "../api/viewsConfigTypes";
import type { JsonValue } from "@prisma/client/runtime/client";

export type UpdateCellsMutation = {
  type: "updateCells";
  tableId: string;
  changes: {
    rowId: string;
    columnId: string;
    value: string | number;
  }[];
  userId: string;
};

export type AddRowMutation = {
  type: "addRow";
  tableId: string;
  optimisticId: string;
  order: number;
  userId: string;
};

export type AddColumnMutation = {
  type: "addColumn";
  tableId: string;
  optimisticId: string;
  order: number;
  name: string;
  columnType: ColumnType;
  userId: string;
};

export type DeleteRowMutation = {
  type: "deleteRow";
  tableId: string;
  rowId: string;
  userId: string;
};

export type DeleteColumnMutation = {
  type: "deleteColumn";
  tableId: string;
  columnId: string;
  userId: string;
};

export type RenameColumnMutation = {
  type: "renameColumn";
  tableId: string;
  columnId: string;
  newLabel: string;
  userId: string;
};

export type RenameTableMutation = {
  type: "renameTable";
  tableId: string;
  newName: string;
  userId: string;
};

export type DeleteTableMutation = {
  type: "deleteTable";
  tableId: string;
  userId: string;
};

export type CreateViewMutation = {
  type: "createView";
  tableId: string;
  optimisticId: string; // generated client-side
  name: string;
  config: ViewConfig;
  isDefault?: boolean;
  userId: string;
};

export type UpdateViewMutation = {
  type: "updateView";
  tableId: string;
  viewId: string;
  name?: string;
  config: ViewConfig;
  isDefault?: boolean;
  userId: string;
};

export type DeleteViewMutation = {
  type: "deleteView";
  tableId: string;
  viewId: string;
  userId: string;
};

export type TableMutation =
  | UpdateCellsMutation
  | AddRowMutation
  | AddColumnMutation
  | DeleteRowMutation
  | DeleteColumnMutation
  | RenameColumnMutation
  | RenameTableMutation
  | DeleteTableMutation
  | CreateViewMutation
  | UpdateViewMutation
  | DeleteViewMutation;

// Define what each mutation actually returns from the server
export type MutationResults = {
  updateCells: void;
  addRow: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tableId: string;
    order: number;
  };
  addColumn: {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    columnType: string;
    tableId: string;
    order: number;
  };
  deleteRow: void;
  deleteColumn: void;
  renameColumn: void;
  renameTable: void;
  deleteTable: void;
  createView: {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    tableId: string;
    config: JsonValue;
    isDefault: boolean;
  };
  updateView: void;
  deleteView: void;
};

export type QueueItem<T extends TableMutation = TableMutation> = {
  id: string;
  mutation: T;
  createdAt: number;
  attempt: number;
  // Use the lookup table to find the correct result type
  resolve: (value: { result: MutationResults[T["type"]] }) => void;
  reject: (reason?: unknown) => void;
};
