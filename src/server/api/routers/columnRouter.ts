import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertTableAccess } from "../routerUtils";
import { enqueueTableMutation } from "~/server/queue/tableQueue";

export const columnRouter = createTRPCRouter({
  getColumns: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const columns = await ctx.db.column.findMany({
        where: { tableId: input.tableId },
        orderBy: { order: "asc" },
      });
      return { columns };
    }),

  addColumn: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        label: z.string().optional(),
        type: z.enum(["text", "number"]).optional(),
        optimisticId: z.string(),
        orderNum: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "addColumn",
        tableId: input.tableId,
        optimisticId: input.optimisticId,
        order: input.orderNum,
        name: input.label ?? "Column",
        columnType: input.type ?? "text",
        userId: ctx.session.user.id,
      });

      return { result, optimisticId: input.optimisticId };
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ tableId: z.string(), columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mutationId = enqueueTableMutation({
        type: "deleteColumn",
        tableId: input.tableId,
        columnId: input.columnId,
        userId: ctx.session.user.id
      });

      return { columnId: input.columnId, mutationId };
    }),

  renameColumn: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        columnId: z.string(),
        newLabel: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const mutationId = enqueueTableMutation({
        type: "renameColumn",
        tableId: input.tableId,
        columnId: input.columnId,
        newLabel: input.newLabel,
        userId: ctx.session.user.id
      });

      return {
        columnId: input.columnId,
        newLabel: input.newLabel,
        mutationId,
      };
    }),
});
