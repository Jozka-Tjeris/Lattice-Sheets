import type { PrismaClient } from "@prisma/client";
import type { IOTablePayload, ImportTarget } from "./tableIOtypes";

const isBlankCell = (value: unknown) =>
  value === "" ||
  value === null ||
  value === undefined;

export async function importTableFromJson(
  prisma: PrismaClient,
  payload: IOTablePayload,
  ownerId: string,
  target: ImportTarget,
) {
  return prisma.$transaction(async (tx) => {
    // 1. Resolve base
    const base =
      target.mode === "existing-base"
        ? await tx.base.findFirst({
            where: {
              id: target.baseId,
              ownerId, // ownership check
            },
          })
        : await tx.base.create({
            data: {
              name: target.baseName ?? payload.name ?? "Imported Base",
              ownerId,
            },
          });

    if (!base) {
      throw new Error("Base not found or access denied");
    }

    // 2. Create table
    const table = await tx.table.create({
      data: {
        name: payload.name ?? "Imported Table",
        baseId: base.id,
      },
    });

    // 3. Columns
    const columnIdMap = new Map<string, string>();

    await tx.column.createMany({
      data: payload.columns.map((col) => ({
        tableId: table.id,
        name: col.name,
        columnType: col.columnType,
        order: col.order,
      })),
    });

    const createdColumns = await tx.column.findMany({
      where: { tableId: table.id },
      select: { id: true, order: true },
    });

    createdColumns.forEach((col) => {
      const original = payload.columns.find(c => c.order === col.order);
      if (original) {
        columnIdMap.set(original.id, col.id);
      }
    });

    // 4. Rows
    const rowIdMap = new Map<string, string>();

    await tx.row.createMany({
      data: payload.rows.map((row) => ({
        tableId: table.id,
        order: row.order,
      })),
    });

    const createdRows = await tx.row.findMany({
      where: { tableId: table.id },
      select: { id: true, order: true },
    });

    createdRows.forEach((row) => {
      const original = payload.rows.find(r => r.order === row.order);
      if (original) {
        rowIdMap.set(original.id, row.id);
      }
    });

    // 5. Cells (chunked)
    const CELL_CHUNK = 2000;;

    const cellData = payload.cells
      .filter(cell => !isBlankCell(cell) && (rowIdMap.has(cell.rowId) && columnIdMap.has(cell.columnId)))
      .map((cell) => ({
        tableId: table.id,
        rowId: rowIdMap.get(cell.rowId)!,
        columnId: columnIdMap.get(cell.columnId)!,
        value: String(cell.value),
      }));

    for (let i = 0; i < cellData.length; i += CELL_CHUNK) {
      await tx.cell.createMany({
        data: cellData.slice(i, i + CELL_CHUNK),
      });
    }

    return {
      tableId: table.id,
      baseId: base.id,
      createdNewBase: target.mode === "new-base",
    };
  });
}
