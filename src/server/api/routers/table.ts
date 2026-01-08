import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { type CellValue, type CellKey } from "~/components/table/controller/tableTypes";
import { TRPCError } from "@trpc/server";

// Utility to convert cell array to key-value map
function normalizeCells(cells: { rowId: string; columnId: string; value: CellValue | null }[]) {
  const map: Record<string, CellValue | null> = {};
  for (const cell of cells) {
    const key = `${cell.rowId}:${cell.columnId}`;
    map[key as CellKey] = cell.value;
  }
  return map;
}

export const tableRouter = createTRPCRouter({
  // ------------------
  // Queries
  // ------------------
  getTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(({ ctx, input }) => {
      const table = ctx.db.table.findUnique({ where: { id: input.tableId } });
      return { table };
  }),

  getColumns: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const columns = await ctx.db.column.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
      return { columns };
  }),

  getRowsWithCells: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.row.findMany({ where: { tableId: input.tableId }, orderBy: { order: "asc" } });
      const cells = await ctx.db.cell.findMany({ where: { rowId: { in: rows.map(r => r.id) } } });
      return { rows, cells: normalizeCells(cells) };
    }),

  // ------------------
  // Mutations
  // ------------------
  createTable: protectedProcedure
    .input(z.object({baseId: z.string(), name: z.string()}))
    .mutation(({ ctx, input }) => {
      const table = ctx.db.table.create({data: { name: input.name, baseId: input.baseId }})
      return { table }
    }),

  deleteTable: protectedProcedure
    .input(z.object({tableId: z.string() }))
    .mutation(({ ctx, input }) => {
      const table = ctx.db.table.delete({where: {id: input.tableId }});
      return { table }
    }),

  updateCell: protectedProcedure
    .input(z.object({
      rowId: z.string(),
      columnId: z.string(),
      value: z.union([z.string(), z.number()]),
    }))
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.db.column.findUnique({ where: { id: input.columnId } });
      if (!column) throw new TRPCError({ code: "NOT_FOUND", message: "Column not found" });

      if (column.type === "number") {
        const numericValue = Number(input.value);
        if (isNaN(numericValue)) throw new TRPCError({ code: "BAD_REQUEST", message: "Value must be a number" });
        input.value = numericValue.toString();
      } else if (typeof input.value === "number") {
        input.value = input.value.toString();
      }

      return ctx.db.cell.upsert({
        where: { rowId_columnId: { rowId: input.rowId, columnId: input.columnId } },
        update: { value: input.value },
        create: { rowId: input.rowId, columnId: input.columnId, value: input.value },
      });
    }),

  updateCells: protectedProcedure
    .input(z.array(z.object({
      rowId: z.string(),
      columnId: z.string(),
      value: z.union([z.string(), z.number()]),
    })))
    .mutation(async ({ ctx, input }) => {
      if (input.length === 0) return [];
      //Get all relevant columns in a single query
      const columnIds = Array.from(new Set(input.map(u => u.columnId)));
      const columns = await ctx.db.column.findMany({ where: { id: { in: columnIds } } });

      //Build a map for quick lookup
      const columnMap = new Map(columns.map(c => [c.id, c.type]));

      //Get all rows in a single query
      const rows = await ctx.db.row.findMany();
      const rowSet = new Set(rows.map(r => r.id));

      // Build PrismaPromises array
      const updates: ReturnType<typeof ctx.db.cell.upsert>[] = [];
      for (const { rowId, columnId, value } of input) {
        if (!rowSet.has(rowId)) continue; 
        const columnType = columnMap.get(columnId);
        if (!columnType) continue;

        let newValue: string;
        if (columnType === "number") {
          const numericValue = Number(value);
          if (isNaN(numericValue)) continue;
          newValue = numericValue.toString();
        } else {
          newValue = String(value);
        }

        //Push the list of PrismaPromises, don't await
        updates.push(
          ctx.db.cell.upsert({
            where: { rowId_columnId: { rowId, columnId } },
            update: { value: newValue },
            create: { rowId, columnId, value: newValue },
          })
        );
      }

      // Only run transaction if there are valid updates
      if (updates.length > 0) {
        await ctx.db.$transaction(updates);
      }

      return { updatedCount: updates.length };
    }),


  addRow: protectedProcedure
    .input(z.object({ tableId: z.string(), orderNum: z.number() }))
    .mutation(async ({ ctx, input }) => {
      //1. Create the row
      const newRow = await ctx.db.row.create({
        data: { tableId: input.tableId, order: input.orderNum },
      });

      //2. Create empty cells for each column
      const columns = await ctx.db.column.findMany({ where: { tableId: input.tableId } });
      const cells = columns.map(col => ({
        rowId: newRow.id,
        columnId: col.id,
        value: "",
      }));

      await ctx.db.cell.createMany({ data: cells });

      return { row: newRow, cells };
    }),

  deleteRow: protectedProcedure
    .input(z.object({ rowId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cell.deleteMany({ where: { rowId: input.rowId } });
      await ctx.db.row.delete({ where: { id: input.rowId } });
      return { rowId: input.rowId };
    }),

  addColumn: protectedProcedure
    .input(z.object({ tableId: z.string(), label: z.string().optional(), type: z.enum(["text", "number"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      //1. Create column
      const newColumn = await ctx.db.column.create({
        data: {
          tableId: input.tableId,
          name: input.label ?? `Column`,
          type: input.type ?? "text",
          order: Date.now(),
        },
      });

      //2. Create empty cells for each existing row
      const rows = await ctx.db.row.findMany({ where: { tableId: input.tableId } });
      const cells = rows.map(row => ({
        rowId: row.id,
        columnId: newColumn.id,
        value: "",
      }));
      await ctx.db.cell.createMany({ data: cells });

      return { column: newColumn, cells };
    }),

  deleteColumn: protectedProcedure
    .input(z.object({ columnId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.cell.deleteMany({ where: { columnId: input.columnId } });
      await ctx.db.column.delete({ where: { id: input.columnId } });
      return { columnId: input.columnId };
    }),

  renameColumn: protectedProcedure
    .input(z.object({ columnId: z.string(), newLabel: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const column = await ctx.db.column.update({
        where: { id: input.columnId },
        data: { name: input.newLabel },
      });
      return column;
    }),
});
