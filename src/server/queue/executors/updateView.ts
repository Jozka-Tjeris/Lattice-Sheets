import { db } from "~/server/db";
import type { UpdateViewMutation } from "../mutationTypes";
import { LIMITS } from "~/constants/limits";

export async function executeUpdateView(m: UpdateViewMutation) {
  if (m.isDefault) {
    await db.view.updateMany({
      where: { tableId: m.tableId, isDefault: true },
      data: { isDefault: false },
    });
  }

  await db.view.updateMany({
    where: { id: m.viewId },
    data: {
      ...(m.name && { name: m.name.slice(0, LIMITS.TEXT) }),
      ...(m.config && { config: m.config }),
      ...(typeof m.isDefault === "boolean" && { isDefault: m.isDefault }),
    },
  });
}
