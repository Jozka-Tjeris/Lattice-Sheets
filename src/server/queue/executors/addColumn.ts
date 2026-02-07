import { db } from "~/server/db";
import type { AddColumnMutation } from "../mutationTypes";
import { LIMITS } from "~/constants/limits";

export async function executeAddColumn(m: AddColumnMutation) {
  return await db.$transaction(async (tx) => {
    const columnCount = await tx.column.count({
      where: { tableId: m.tableId },
    });

    if (columnCount >= LIMITS.COL) {
      throw new Error("COLUMN_COUNT_LIMIT_EXCEEDED");
    }

    const lastColumn = await tx.column.findFirst({
      where: { tableId: m.tableId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastColumn?.order ?? -1) + 1;

    return await tx.column.create({
      data: {
        tableId: m.tableId,
        name: m.name.slice(0, LIMITS.TEXT),
        columnType: m.columnType,
        order: nextOrder,
      },
    });
  });
}
