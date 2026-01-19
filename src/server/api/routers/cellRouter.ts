import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { withAuthorizedTableLock } from "../routerUtils";

export const cellRouter = createTRPCRouter({
  updateCell: protectedProcedure
    .input(z.object({
      tableId: z.string(),
      rowId: z.string(),
      columnId: z.string(),
      value: z.union([z.string(), z.number()]),
    }))
    .mutation(async ({ ctx, input }) => {
      await withAuthorizedTableLock(ctx, input.tableId, async (tx) => {
        // Fetch column within the locked transaction
        const column = await tx.column.findUnique({ where: { id: input.columnId } });
        if (!column) throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });

        // Normalize value
        let valueStr: string;
        if (column.columnType === "number") {
          const numericValue = Number(input.value);
          if (isNaN(numericValue)) throw new TRPCError({ code: "BAD_REQUEST", message: "Value must be a number" });
          valueStr = numericValue.toString();
        } else {
          valueStr = String(input.value);
        }

        await tx.cell.upsert({
          where: { rowId_columnId: { rowId: input.rowId, columnId: input.columnId } },
          update: { value: valueStr },
          create: { rowId: input.rowId, columnId: input.columnId, value: valueStr },
        });
      });

      return { success: true };
    }),

  updateCells: protectedProcedure
    .input(z.array(z.object({
      tableId: z.string(),
      rowId: z.string(),
      columnId: z.string(),
      value: z.union([z.string(), z.number()]),
    })))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return { updatedCount: 0 };

      const tableIds = Array.from(new Set(input.map(u => u.tableId)));
      if (tableIds.length !== 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All updates must belong to the same table",
        });
      }

      const tableId = tableIds[0]!;

      await withAuthorizedTableLock(ctx, tableId, async (tx) => {
        // Fetch all relevant columns
        const columnIds = Array.from(new Set(input.map(u => u.columnId)));
        const columns = await tx.column.findMany({ where: { id: { in: columnIds } } });
        const columnMap = new Map(columns.map(c => [c.id, c.columnType]));

        // Fetch all relevant rows
        const rowIds = Array.from(new Set(input.map(u => u.rowId)));
        const rows = await tx.row.findMany({ where: { id: { in: rowIds } } });
        const rowSet = new Set(rows.map(r => r.id));

        const updates = [];

        for (const { rowId, columnId, value } of input) {
          if (!rowSet.has(rowId)) continue;
          const columnType = columnMap.get(columnId);
          if (!columnType) continue;

          let valueStr: string;
          if (columnType === "number") {
            const numericValue = Number(value);
            if (isNaN(numericValue)) continue;
            valueStr = numericValue.toString();
          } else {
            valueStr = String(value);
          }

          updates.push(
            tx.cell.upsert({
              where: { rowId_columnId: { rowId, columnId } },
              update: { value: valueStr },
              create: { rowId, columnId, value: valueStr },
            })
          );
        }

        if (updates.length > 0) {
          await Promise.all(updates);
        }
      });

      return { updatedCount: input.length };
    }),
});
