import { db } from "~/server/db";
import { type UpdateCellsMutation } from "../mutationTypes";

export async function executeUpdateCells(m: UpdateCellsMutation) {
  await db.$transaction(async (tx) => {
    const columns = await tx.column.findMany({
      where: {
        id: { in: m.changes.map(c => c.columnId) },
      },
      select: { id: true, columnType: true },
    });

    const columnTypeMap = new Map(
      columns.map(c => [c.id, c.columnType]),
    );

    const ops = [];

    for (const c of m.changes) {
      const type = columnTypeMap.get(c.columnId);
      if (!type) continue;

      let value: string;
      if (type === "number") {
        const n = Number(c.value);
        if (!Number.isFinite(n)) continue;
        value = n.toString();
      } else {
        value = String(c.value);
      }

      ops.push(
        tx.cell.upsert({
          where: {
            rowId_columnId: {
              rowId: c.rowId,
              columnId: c.columnId,
            },
          },
          update: { value },
          create: {
            rowId: c.rowId,
            columnId: c.columnId,
            tableId: c.tableId,
            value,
          },
        })
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }
  });
}
