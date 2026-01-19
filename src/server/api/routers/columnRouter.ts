import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertTableAccess, withAuthorizedTableLock, withTableLock } from "../routerUtils";

export const columnRouter = createTRPCRouter({
  getColumns: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const columns = await ctx.db.column.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
      return { columns };
  }),

  addColumn: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      label: z.string().optional(),
      type: z.enum(["text", "number"]).optional(),
      optimisticId: z.string(),
      orderNum: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await withAuthorizedTableLock(ctx, input.tableId, async (tx) => {
        return withTableLock(tx, input.tableId, async () => {
          // 1. Create column
          const newColumn = await tx.column.create({
            data: {
              tableId: input.tableId,
              name: input.label ?? "Column",
              columnType: input.type ?? "text",
              order: input.orderNum,
            },
          });

          // 2. Create empty cells
          const rows = await tx.row.findMany({
            where: { tableId: input.tableId },
            select: { id: true },
          });

          if (rows.length > 0) {
            await tx.cell.createMany({
              data: rows.map(row => ({
                rowId: row.id,
                columnId: newColumn.id,
                value: "",
              })),
            });
          }

          return newColumn;
        });
      });

      return { column: result, optimisticId: input.optimisticId };
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ tableId: z.string(), columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await withAuthorizedTableLock(ctx, input.tableId, async (tx) => {
          await tx.cell.deleteMany({
            where: { columnId: input.columnId },
          });

          await tx.column.delete({
            where: { id: input.columnId },
          });
      });

      return { columnId: input.columnId };
    }),

  renameColumn: protectedProcedure
    .input(z.object({ tableId: z.string(), columnId: z.string(), newLabel: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return withAuthorizedTableLock(ctx, input.tableId, async(tx) => {
        const column = await tx.column.update({
          where: { id: input.columnId, tableId: input.tableId },
          data: { name: input.newLabel },
        });
        return column;
      });
    }),
});
