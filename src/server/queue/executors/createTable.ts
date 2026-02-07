import { db } from "~/server/db";
import type { CreateTableMutation } from "../mutationTypes";
import { INDEX_COL_ID } from "~/constants/table";
import { LIMITS } from "~/constants/limits";

export async function executeCreateTable(m: CreateTableMutation) {
  return db.$transaction(async (tx) => {
    const tableCount = await tx.table.count({
      where: { baseId: m.baseId },
    });

    if (tableCount >= LIMITS.TABLE) {
      throw new Error("TABLE_COUNT_LIMIT_EXCEEDED");
    }

    const table = await tx.table.create({
      data: {
        name: m.name.slice(0, LIMITS.TEXT),
        baseId: m.baseId,
      },
    });

    await tx.view.create({
      data: {
        name: "Default Table View",
        tableId: table.id,
        config: {
          sorting: [],
          columnFilters: [],
          columnVisibility: {},
          columnSizing: {},
          columnPinning: { left: [INDEX_COL_ID], right: [] },
          globalSearch: "",
        },
        isDefault: true,
      },
    });

    return table;
  });
}
