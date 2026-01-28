import { type TableMutation } from "../mutationTypes";
import { executeAddColumn } from "./addColumn";
import { executeAddRow } from "./addRow";
import { executeCreateTable } from "./createTable";
import { executeCreateView } from "./createView";
import { executeDeleteColumn } from "./deleteColumn";
import { executeDeleteRow } from "./deleteRow";
import { executeDeleteTable } from "./deleteTable";
import { executeDeleteView } from "./deleteView";
import { executeRenameColumn } from "./renameColumn";
import { executeRenameTable } from "./renameTable";
import { executeUpdateCells } from "./updateCells";
import { executeUpdateView } from "./updateView";

export function assertNever(x: never): never {
  throw new Error("Unhandled mutation: " + JSON.stringify(x));
}

export async function executeMutation(mutation: TableMutation) {
  switch (mutation.type) {
    case "updateCells":
      return executeUpdateCells(mutation);
    case "addRow":
      return executeAddRow(mutation);
    case "addColumn":
      return executeAddColumn(mutation);
    case "deleteRow":
      return executeDeleteRow(mutation);
    case "deleteColumn":
      return executeDeleteColumn(mutation);
    case "renameColumn":
      return executeRenameColumn(mutation);
    case "createTable":
      return executeCreateTable(mutation);
    case "renameTable":
      return executeRenameTable(mutation);
    case "deleteTable":
      return executeDeleteTable(mutation);
    case "createView":
      return executeCreateView(mutation);
    case "updateView":
      return executeUpdateView(mutation);
    case "deleteView":
      return executeDeleteView(mutation);
    default:
      assertNever(mutation);
  }
}
