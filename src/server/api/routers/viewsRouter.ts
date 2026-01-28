import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ViewConfigSchema } from "../viewsConfigTypes";
import { enqueueTableMutation } from "~/server/queue/tableQueue";
import { assertTableAccess } from "../routerUtils";

export const viewsRouter = createTRPCRouter({
  // --------------------
  // Fetch all views for a table
  // --------------------
  getViews: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findMany({
        where: { tableId: input.tableId },
        orderBy: { createdAt: "asc" },
      });
    }),

  // --------------------
  // Fetch a single view by ID
  // --------------------
  getView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findUnique({
        where: { id: input.viewId },
      });
    }),

  getDefaultView: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.view.findFirst({
        where: { tableId: input.tableId, isDefault: true },
      });
    }),

  // --------------------
  // Create a new view
  // --------------------
  createView: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        name: z.string().min(1),
        config: ViewConfigSchema,
        isDefault: z.boolean().optional(),
        optimisticId: z.string()
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "createView",
        tableId: input.tableId,
        optimisticId: input.optimisticId,
        name: input.name,
        config: input.config,
        isDefault: input.isDefault,
        userId: ctx.session.user.id,
      });

      return {
        result,
        optimisticId: input.optimisticId,
      };
    }),

  // --------------------
  // Update an existing view
  // --------------------
  updateView: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        viewId: z.string(),
        name: z.string().optional(),
        config: ViewConfigSchema,
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "updateView",
        tableId: input.tableId,
        viewId: input.viewId,
        name: input.name,
        config: input.config,
        isDefault: input.isDefault,
        userId: ctx.session.user.id,
      });

      return {
        result,
        viewId: input.viewId,
      };
    }),

  // --------------------
  // Delete a view
  // --------------------
  deleteView: protectedProcedure
    .input(z.object({ tableId: z.string(), viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTableAccess(ctx, input.tableId);

      const { result } = await enqueueTableMutation({
        type: "deleteView",
        tableId: input.tableId,
        viewId: input.viewId,
        userId: ctx.session.user.id,
      });

      return {
        result,
        viewId: input.viewId,
      };
    }),
});
