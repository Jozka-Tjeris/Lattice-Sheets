import { db } from "~/server/db";
import type { CreateViewMutation } from "../mutationTypes";
import { LIMITS } from "~/constants/limits";

export async function executeCreateView(m: CreateViewMutation) {
  return await db.$transaction(async (tx) => {
    const viewCount = await tx.view.count({
      where: { tableId: m.tableId },
    });

    if (viewCount >= LIMITS.VIEW) {
      throw new Error("VIEW_COUNT_LIMIT_EXCEEDED");
    }

    if (m.isDefault) {
      await tx.view.updateMany({
        where: {
          tableId: m.tableId,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return await tx.view.create({
      data: {
        tableId: m.tableId,
        name: m.name.slice(0, LIMITS.TEXT),
        config: m.config,
        isDefault: !!m.isDefault,
      },
    });
  });
}
