import { db } from "~/server/db";
import type { AddColumnMutation } from "../mutationTypes";

export async function executeAddColumn(m: AddColumnMutation) {
  const lastColumn = await db.column.findFirst({
    where: { tableId: m.tableId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = (lastColumn?.order ?? -1) + 1;

  return await db.column.create({
    data: {
      tableId: m.tableId,
      name: m.name,
      columnType: m.columnType,
      order: nextOrder,
    },
  });
}
