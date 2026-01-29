import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertTableAccess, normalizeCells } from "../routerUtils";
import { enqueueTableMutation } from "~/server/queue/tableQueue";

function groupByTable<T extends { tableId: string }>(items: T[]) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.tableId);
    if (list) {
      list.push(item);
    } else {
      map.set(item.tableId, [item]);
    }
  }
  return map;
}

export const cellRouter = createTRPCRouter({
  getCells: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const cells = await ctx.db.cell.findMany({
        where: { tableId: input.tableId },
      });

      return { cells: normalizeCells(cells) };
    }),

  updateCells: protectedProcedure
    .input(
      z.array(
        z.object({
          tableId: z.string(),
          rowId: z.string(),
          columnId: z.string(),
          value: z.union([z.string(), z.number()]),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return;

      // Optional: auth pre-check per table
      const tableIds = new Set(input.map(i => i.tableId));
      for (const tableId of tableIds) {
        await assertTableAccess(ctx, tableId);
      }

      const grouped = groupByTable(input);

      for (const [tableId, updates] of grouped) {
        void enqueueTableMutation({
          type: "updateCells",
          tableId,
          userId: ctx.session.user.id,
          changes: updates.map(u => ({
            rowId: u.rowId,
            columnId: u.columnId,
            tableId: tableId,
            value: u.value,
          })),
        });
      }

      return;
    }),
});
