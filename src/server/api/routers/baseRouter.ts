import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { LIMITS } from "~/constants/limits";

export const baseRouter = createTRPCRouter({
  // ------------------
  // Queries
  // ------------------

  listBases: protectedProcedure.query(({ ctx }) => {
    return ctx.db.base.findMany({
      where: { ownerId: ctx.session.user.id },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getBaseById: protectedProcedure
    .input(z.object({ baseId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.db.base.findUnique({
        where: { ownerId: ctx.session.user.id, id: input.baseId },
      });

      if (!base) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return base;
    }),

  // ------------------
  // Mutations
  // ------------------

  createBase: protectedProcedure
    .input(z.object({ name: z.string().min(1), iconColor: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const baseCount = await tx.base.count({
          where: { ownerId: ctx.session.user.id },
        });

        if (baseCount >= LIMITS.BASE) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "BASE_COUNT_LIMIT_EXCEEDED",
          });
        }

        return await tx.base.create({
          data: {
            name: input.name.slice(0, LIMITS.TEXT),
            ownerId: ctx.session.user.id,
            iconColor: input.iconColor,
          },
        });
      });
    }),

  renameBase: protectedProcedure
    .input(z.object({ baseId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.base.updateMany({
        where: {
          id: input.baseId,
          ownerId: ctx.session.user.id,
        },
        data: { name: input.name.slice(0, LIMITS.TEXT) },
      });

      if (result.count === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { baseId: input.baseId };
    }),

  deleteBase: protectedProcedure
    .input(z.object({ baseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Assert ownership
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

      // 2. Fetch tables
      const tables = await ctx.db.table.findMany({
        where: { baseId: input.baseId },
        select: { id: true },
      });

      const tableIds = tables.map(t => t.id);

      // 3. Cleanup (idempotent)
      if (tableIds.length > 0) {
        await ctx.db.cell.deleteMany({
          where: { row: { tableId: { in: tableIds } } },
        });

        await ctx.db.row.deleteMany({
          where: { tableId: { in: tableIds } },
        });

        await ctx.db.column.deleteMany({
          where: { tableId: { in: tableIds } },
        });

        await ctx.db.view.deleteMany({
          where: { tableId: { in: tableIds } },
        });

        await ctx.db.table.deleteMany({
          where: { id: { in: tableIds } },
        });
      }

      // 4. Delete base
      await ctx.db.base.delete({
        where: { id: input.baseId },
      });

      return { baseId: input.baseId };
    }),
});
