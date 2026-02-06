import type { PrismaClient } from "@prisma/client";
import Papa from "papaparse"; // CSV serialization

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

export async function exportTableToCsv(
  prisma: PrismaClient,
  tableId: string,
  ownerId: string,
) {
  // Verify access
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

  // Fetch structure
  const [columns, rows, cells] = await Promise.all([
    prisma.column.findMany({
      where: { tableId },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
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

  // Build a map of cell values for easy lookup
  const cellMap: Record<string, Record<string, string>> = {};
  for (const cell of cells) {
    cellMap[cell.rowId] ??= {};
    cellMap[cell.rowId]![cell.columnId] = cell.value ?? "";
  }

  // Construct CSV rows
  const csvData = rows.map((row) => {
    return columns.map((col) => cellMap[row.id]?.[col.id] ?? "");
  });

  // Serialize CSV from array of objects
  const csv = Papa.unparse({
    fields: columns.map((c) => c.name),
    data: csvData,
  });

  return {
    name: table.name + " (Exported)",
    csv,
  };
}
