import type { PrismaClient } from "@prisma/client";

export async function exportTableToJson(
  prisma: PrismaClient,
  tableId: string,
  ownerId: string,
) {
  // 1. Verify access
  const table = await prisma.table.findFirst({
    where: {
      id: tableId,
      base: { ownerId },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!table) {
    throw new Error("Table not found or access denied");
  }

  // 2. Fetch structure
  const [columns, rows, cells] = await Promise.all([
    prisma.column.findMany({
      where: { tableId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        columnType: true,
        order: true,
      },
    }),
    prisma.row.findMany({
      where: { tableId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        order: true,
      },
    }),
    prisma.cell.findMany({
      where: { tableId },
      select: {
        rowId: true,
        columnId: true,
        value: true,
      },
    }),
  ]);

  // 3. Shape payload
  return {
    name: table.name + " (Exported)",
    columns: columns.map((c) => ({
      id: c.id,
      name: c.name,
      columnType: c.columnType,
      order: c.order,
    })),
    rows: rows.map((r) => ({
      id: r.id,
      order: r.order,
    })),
    cells: cells.map((c) => ({
      rowId: c.rowId,
      columnId: c.columnId,
      value: c.value,
    })),
  };
}
