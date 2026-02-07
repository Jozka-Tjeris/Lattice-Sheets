import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { assertTableAccess } from "../routerUtils";
import { enqueueTableMutation } from "~/server/queue/tableQueue";
import { exportTableToCsv, exportTableToJson } from "~/server/services/tableExportService";
import { importTableFromJson } from "~/server/services/tableImportService";
import { ImportSchema } from "~/server/services/tableIOtypes";
import { validateImportPayload } from "~/server/services/tableImportValidation";

export const tableRouter = createTRPCRouter({
  getTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const table = await ctx.db.table.findUnique({
        where: { id: input.tableId },
      });
      if (!table) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
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
    .input(
      z.object({
        baseId: z.string(),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const base = await ctx.db.base.findFirst({
      where: { id: input.baseId, ownerId: ctx.session.user.id },
      });

      if (!base) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Base not found or access denied" });
      }

      const { result } = await enqueueTableMutation({
        type: "createTable",
        name: input.name,
        baseId: input.baseId,
        userId: ctx.session.user.id,
      });

      return { 
        result,
        name: input.name,
        baseId: input.baseId, 
      }
    }),

  renameTable: protectedProcedure
  .input(z.object({ tableId: z.string(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "renameTable",
        tableId: input.tableId,
        newName: input.name,
        userId: ctx.session.user.id,
      });

      return {
        result,
        tableId: input.tableId,
        name: input.name,
      };
    }),

  deleteTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "deleteTable",
        tableId: input.tableId,
        userId: ctx.session.user.id,
      });

      return { result, tableId: input.tableId };
    }),

  // IO-related
  importTable: protectedProcedure
    .input(ImportSchema)
    .mutation(async ({ ctx, input }) => {
      await validateImportPayload(ctx.db, input.payload, ctx.session.user.id, input.target);
      return importTableFromJson(ctx.db, input.payload, ctx.session.user.id, input.target);
    }),

  exportTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) =>
      exportTableToJson(ctx.db, input.tableId, ctx.session.user.id)
    ),

  exportTableCsv: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) =>
      exportTableToCsv(ctx.db, input.tableId, ctx.session.user.id)
    ),
});
