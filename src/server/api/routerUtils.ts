import { type CellValue } from "~/components/table/controller/tableTypes";
import type { Prisma } from "~/generated/client";
import { TRPCError } from "@trpc/server";
import type { createTRPCContext } from "~/server/api/trpc";

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

// Utility to convert cell array to key-value map
export function normalizeCells(cells: { rowId: string; columnId: string; value: CellValue | null }[]) {
  const map: Record<string, CellValue | null> = {};
  for (const cell of cells) {
    const key = `${cell.rowId}:${cell.columnId}`;
    map[key] = cell.value;
  }
  return map;
}

export async function withTableLock<T>(
  tx: Prisma.TransactionClient,
  tableId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  await tx.$executeRaw`
    SELECT 1 FROM "Table"
    WHERE id = ${tableId}
    FOR UPDATE
  `;

  return fn(tx);
}

// Use this for read-only queries
export async function assertTableAccess(
  ctx: Context,
  tableId: string
) {
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

// Use this for mutations
export async function withAuthorizedTableLock<T>(
  ctx: Context,
  tableId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
) {
  // tx here is created automatically by ctx.db.$transaction, same API as ctx.db
  return ctx.db.$transaction(async (tx) => {
    // Asserts appropriate table access and locks table upon success
    await assertTableAccess(ctx, tableId);
    return withTableLock(tx, tableId, fn);
  });
}