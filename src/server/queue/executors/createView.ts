import { db } from "~/server/db";
import type { CreateViewMutation } from "../mutationTypes";

export async function executeCreateView(m: CreateViewMutation) {
  if (m.isDefault) {
    await db.view.updateMany({
      where: { tableId: m.tableId, isDefault: true },
      data: { isDefault: false },
    });
  }

  return await db.view.create({
    data: {
      tableId: m.tableId,
      name: m.name,
      config: m.config,
      isDefault: !!m.isDefault,
    },
  });
}
