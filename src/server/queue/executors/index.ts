import { type MutationResults, type TableMutation } from "../mutationTypes";
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

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Mutation timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function executeMutation<M extends TableMutation>(
  mutation: M
): Promise<MutationResults[M["type"]]> {
  // Define the base execution logic
  const run = async (): Promise<unknown> => {
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
        return assertNever(mutation);
    }
  };

  // Wrap the execution in a 10-second timeout
  // We cast the result to ensure the return type matches the specific mutation type
  return withTimeout(run(), 10000) as Promise<MutationResults[M["type"]]>;
}
