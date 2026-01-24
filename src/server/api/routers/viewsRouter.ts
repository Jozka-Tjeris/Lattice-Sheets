import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { ViewConfigSchema } from "../viewsConfigTypes";

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // Check for existing default
        const defaultExists = await tx.view.findFirst({
          where: { tableId: input.tableId, isDefault: true },
          select: { id: true },
        });

        // Decide if new view should be default
        const shouldBeDefault = input.isDefault ?? !defaultExists;

        // Unset existing default if needed
        if (shouldBeDefault && defaultExists) {
          await tx.view.update({
            where: { id: defaultExists.id },
            data: { isDefault: false },
          });
        }

        // Create the view
        const newView = await tx.view.create({
          data: {
            tableId: input.tableId,
            name: input.name,
            config: input.config,
            isDefault: shouldBeDefault,
          },
        });

        // Return the new default view ID
        const defaultView = shouldBeDefault ? newView : await tx.view.findFirst({
          where: { tableId: input.tableId, isDefault: true },
          select: { id: true },
        });

        return {
          createdView: newView,
          defaultViewId: defaultView?.id ?? null,
        };
      });
    }),

  // --------------------
  // Update an existing view
  // --------------------
  updateView: protectedProcedure
    .input(
      z.object({
        viewId: z.string(),
        name: z.string().optional(),
        config: ViewConfigSchema.optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.config) updateData.config = input.config;

      if (typeof input.isDefault === "boolean") {
        if (input.isDefault) {
          const view = await ctx.db.view.findUnique({
            where: { id: input.viewId },
            select: { tableId: true },
          });
          if (view) {
            await ctx.db.view.updateMany({
              where: { tableId: view.tableId, isDefault: true },
              data: { isDefault: false },
            });
          }
        }
        updateData.isDefault = input.isDefault;
      }

      const updatedView = await ctx.db.view.update({
        where: { id: input.viewId },
        data: updateData,
      });

      // Return current default view ID
      const defaultView = await ctx.db.view.findFirst({
        where: { tableId: updatedView.tableId, isDefault: true },
        select: { id: true },
      });

      return {
        updatedView,
        defaultViewId: defaultView?.id ?? null,
      };
    }),

  // --------------------
  // Set default view
  // --------------------
  setDefaultView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const view = await tx.view.findUnique({
          where: { id: input.viewId },
          select: { tableId: true },
        });
        if (!view) throw new Error("View not found");

        await tx.view.updateMany({
          where: { tableId: view.tableId, isDefault: true },
          data: { isDefault: false },
        });

        const updatedView = await tx.view.update({
          where: { id: input.viewId },
          data: { isDefault: true },
        });

        return {
          updatedView,
          defaultViewId: updatedView.id,
        };
      });
    }),

  // --------------------
  // Delete a view
  // --------------------
  deleteView: protectedProcedure
    .input(z.object({ viewId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        const view = await tx.view.findUnique({
          where: { id: input.viewId },
          select: { id: true, tableId: true, isDefault: true },
        });

        if (!view) throw new Error("View not found");

        const views = await tx.view.findMany({
          where: { tableId: view.tableId },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });

        if (views.length === 1) throw new Error("Cannot delete the last view");

        await tx.view.delete({ where: { id: view.id } });

        let newDefaultViewId: string | null = null;

        if (view.isDefault) {
          const fallback = views.find(v => v.id !== view.id);
          if (fallback) {
            await tx.view.update({
              where: { id: fallback.id },
              data: { isDefault: true },
            });
            newDefaultViewId = fallback.id;
          }
        } else {
          // if deleted view was not default, fetch current default
          const defaultView = await tx.view.findFirst({
            where: { tableId: view.tableId, isDefault: true },
            select: { id: true },
          });
          newDefaultViewId = defaultView?.id ?? null;
        }

        return {
          deletedViewId: view.id,
          newDefaultViewId,
        };
      });
    }),
});
