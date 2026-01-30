import { db } from "~/server/db";
import type { CreateTableMutation } from "../mutationTypes";

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
          columnPinning: { left: ["__row_index__"], right: [] },
          globalSearch: "",
        },
        isDefault: true,
      },
    });

    return table;
  });
}
