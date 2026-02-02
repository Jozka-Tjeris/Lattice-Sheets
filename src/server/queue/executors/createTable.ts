import { db } from "~/server/db";
import type { CreateTableMutation } from "../mutationTypes";
import { INDEX_COL_ID } from "~/constants/table";

export async function executeCreateTable(m: CreateTableMutation) {
  return db.$transaction(async tx => {
    const table = await tx.table.create({
      data: {
        name: m.name,
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
