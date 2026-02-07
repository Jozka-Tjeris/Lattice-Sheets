import { db } from "~/server/db";
import { type UpdateCellsMutation } from "../mutationTypes";
import { LIMITS } from "~/constants/limits";

function normalizeCellValue(
  columnType: "text" | "number",
  rawValue: unknown,
): string | null {
  if (columnType === "number") {
    if (rawValue === "") return "";

    const n = Number(rawValue);
    if (!Number.isFinite(n)) return null;

    return n.toString().slice(0, LIMITS.NUM);
  }

  return String(rawValue).slice(0, LIMITS.TEXT);
}

function isNonEmpty(v: string | null | undefined) {
  return v !== null && v !== undefined && v.length > 0;
}

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

    const existingCells = await tx.cell.findMany({
      where: {
        OR: m.changes.map(c => ({
          rowId: c.rowId,
          columnId: c.columnId,
        })),
      },
      select: {
        rowId: true,
        columnId: true,
        value: true,
      },
    });

    const existingCellMap = new Map(
      existingCells.map(c => [`${c.rowId}:${c.columnId}`, c.value]),
    );

    const currentCellCount = await tx.cell.count({
      where: {
        tableId: m.changes[0]?.tableId,
        value: { not: "" },
      },
    });

    let delta = 0;
    for (const c of m.changes) {
      const type = columnTypeMap.get(c.columnId);
      if (!type || !(type === "text" || type === "number")) continue;

      const newValue = normalizeCellValue(type, c.value);
      if (newValue === null) continue;

      const key = `${c.rowId}:${c.columnId}`;
      const oldValue = existingCellMap.get(key);

      const wasNonEmpty = isNonEmpty(oldValue);
      const isNowNonEmpty = isNonEmpty(newValue);

      if (!wasNonEmpty && isNowNonEmpty) delta++;
      if (wasNonEmpty && !isNowNonEmpty) delta--;
    }

    if (currentCellCount + delta > LIMITS.CELL) {
      throw new Error("CELL_COUNT_LIMIT_EXCEEDED");
    }

    const ops = [];

    for (const c of m.changes) {
      const type = columnTypeMap.get(c.columnId);
      if (!type || !(type === "text" || type === "number")) continue;

      const value = normalizeCellValue(type, c.value);
      if (value === null) continue;

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
