import { db } from "~/server/db";
import type { AddColumnMutation } from "../mutationTypes";

export async function executeAddColumn(m: AddColumnMutation) {
  return await db.column.create({
    data: {
      tableId: m.tableId,
      name: m.name,
      columnType: m.columnType,
      order: m.order,
    },
  });
}
