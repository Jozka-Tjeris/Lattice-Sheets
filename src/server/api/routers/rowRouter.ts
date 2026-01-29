import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertTableAccess } from "../routerUtils";
import { enqueueTableMutation } from "~/server/queue/tableQueue";

export const rowRouter = createTRPCRouter({
  getRows: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const rows = await ctx.db.row.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
      return { rows };
    }),

  addRow: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        orderNum: z.number(),
        optimisticId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "addRow",
        tableId: input.tableId,
        optimisticId: input.optimisticId,
        order: input.orderNum,
        userId: ctx.session.user.id,
      });

      return { result, optimisticId: input.optimisticId };
    }),

  deleteRow: protectedProcedure
    .input(z.object({ tableId: z.string(), rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mutationId = enqueueTableMutation({
        type: "deleteRow",
        tableId: input.tableId,
        rowId: input.rowId,
        userId: ctx.session.user.id,
      });

      return { rowId: input.rowId, mutationId };
    }),
});
