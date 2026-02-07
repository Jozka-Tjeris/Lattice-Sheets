import { db } from "~/server/db";
import type { AddRowMutation } from "../mutationTypes";
import { LIMITS } from "~/constants/limits";

export async function executeAddRow(m: AddRowMutation) {
  return await db.$transaction(async (tx) => {
    const rowCount = await tx.row.count({
      where: { tableId: m.tableId },
    });

    if (rowCount >= LIMITS.ROW) {
      throw new Error("ROW_COUNT_LIMIT_EXCEEDED");
    }

    const lastRow = await tx.row.findFirst({
      where: { tableId: m.tableId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const nextOrder = (lastRow?.order ?? -1) + 1;

    return await tx.row.create({
      data: {
        tableId: m.tableId,
        order: nextOrder,
      },
    });
  });
}
