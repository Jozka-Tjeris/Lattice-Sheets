import { db } from "~/server/db";
import type { AddRowMutation } from "../mutationTypes";

export async function executeAddRow(m: AddRowMutation) {
  const lastRow = await db.row.findFirst({
    where: { tableId: m.tableId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const nextOrder = (lastRow?.order ?? -1) + 1;

  return await db.row.create({
    data: {
      tableId: m.tableId,
      order: nextOrder,
    },
  });
}
