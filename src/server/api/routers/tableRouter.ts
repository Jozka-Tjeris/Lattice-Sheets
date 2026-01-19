import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { assertTableAccess, withAuthorizedTableLock } from "../routerUtils";

export const tableRouter = createTRPCRouter({
  getTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const table = ctx.db.table.findUnique({ where: { id: input.tableId } });
      return { table };
  }),

  listTablesByBaseId: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
        select: { id: true },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.table.findMany({
        where: { baseId: input.baseId },
        orderBy: { createdAt: "asc" },
      });
    }),

  createTable: protectedProcedure
    .input(z.object({
      baseId: z.string(),
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
        select: { id: true },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.table.create({
        data: {
          name: input.name,
          baseId: input.baseId,
        },
      });
    }),

  renameTable: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      name: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.table.updateMany({
        where: {
          id: input.tableId,
          base: { ownerId: ctx.session.user.id },
        },
        data: { name: input.name },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { tableId: input.tableId };
    }),

  deleteTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return withAuthorizedTableLock(ctx, input.tableId, async (tx) => {
        const table = await tx.table.findFirst({
          where: {
            id: input.tableId,
            base: { ownerId: ctx.session.user.id },
          },
          select: { id: true },
        });

        if (!table) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        // Explicit child cleanup
        await tx.cell.deleteMany({
          where: {
            row: { tableId: input.tableId },
          },
        });

        await tx.row.deleteMany({
          where: { tableId: input.tableId },
        });

        await tx.column.deleteMany({
          where: { tableId: input.tableId },
        });

        await tx.view.deleteMany({
          where: { tableId: input.tableId },
        });

        await tx.table.delete({
          where: { id: input.tableId },
        });
      });

      return { tableId: input.tableId };
    }),
});
