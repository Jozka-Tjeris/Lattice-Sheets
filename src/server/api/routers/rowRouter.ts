import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertTableAccess, normalizeCells, withAuthorizedTableLock } from "../routerUtils";

export const rowRouter = createTRPCRouter({
  getRowsWithCells: protectedProcedure
      .input(z.object({ tableId: z.string() }))
      .query(async ({ ctx, input }) => {
        await assertTableAccess(ctx, input.tableId);

        const rows = await ctx.db.row.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
        const cells = await ctx.db.cell.findMany({ where: { rowId: { in: rows.map(r => r.id) } } });
        return { rows, cells: normalizeCells(cells) };
      }),
      
  addRow: protectedProcedure
    .input(z.object({ tableId: z.string(), orderNum: z.number(), optimisticId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await withAuthorizedTableLock(ctx, input.tableId, async(tx) => {
        // 1. Create row
        const newRow = await tx.row.create({
          data: {
            tableId: input.tableId,
            order: input.orderNum,
          },
        });

        // 2. Create empty cells
        const columns = await tx.column.findMany({
          where: { tableId: input.tableId },
          select: { id: true },
        });

        if (columns.length > 0) {
          await tx.cell.createMany({
            data: columns.map(col => ({
              rowId: newRow.id,
              columnId: col.id,
              value: "",
            })),
          });
        }

        return newRow;
      });
      return { row: result, optimisticId: input.optimisticId };
    }),

  deleteRow: protectedProcedure
    .input(z.object({ tableId: z.string(), rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await withAuthorizedTableLock(ctx, input.tableId, async(tx) => {
        await tx.cell.deleteMany({
          where: { rowId: input.rowId },
        });

        await tx.row.delete({
          where: { id: input.rowId },
        });
      });

      return { rowId: input.rowId };
    }),
});
