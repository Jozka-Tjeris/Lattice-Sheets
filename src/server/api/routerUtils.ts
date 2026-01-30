import { type CellValue } from "~/components/table/controller/tableTypes";
import { TRPCError } from "@trpc/server";
import type { createTRPCContext } from "~/server/api/trpc";

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Utility to convert cell array to key-value map
export function normalizeCells(
  cells: { rowId: string; columnId: string; value: CellValue | null }[],
) {
  const map: Record<string, CellValue | null> = {};
  for (const cell of cells) {
    const key = `${cell.rowId}:${cell.columnId}`;
    map[key] = cell.value;
  }
  return map;
}

// Use this for read-only queries
export async function assertTableAccess(ctx: Context, tableId: string) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  const table = await ctx.db.table.findFirst({
    where: {
      id: tableId,
      base: { ownerId: ctx.session.user.id },
    },
    select: { id: true },
  });

  if (!table) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return table;
}
