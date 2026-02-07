import type { PrismaClient } from "@prisma/client";
import type { IOTablePayload, ImportTarget } from "./tableIOtypes";
import { LIMITS } from "~/constants/limits";
import { TRPCError } from "@trpc/server";

export async function validateImportPayload(
  prisma: PrismaClient,
  payload: IOTablePayload,
  ownerId: string,
  target: ImportTarget
) {
  // ----------------------
  // Base limit
  // ----------------------
  if (target.mode === "new-base") {
    const baseCount = await prisma.base.count({ where: { ownerId } });
    if (baseCount >= LIMITS.BASE) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot create more than ${LIMITS.BASE} bases`,
      });
    }
  }

  // ----------------------
  // Table limit
  // ----------------------
  if (target.mode === "existing-base") {
    const tableCount = await prisma.table.count({ where: { baseId: target.baseId } });
    if (tableCount >= LIMITS.TABLE) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot create more than ${LIMITS.TABLE} tables in this base`,
      });
    }
  }

  // ----------------------
  // Columns & Rows
  // ----------------------
  if (payload.columns.length > LIMITS.COL) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot import more than ${LIMITS.COL} columns`,
    });
  }

  if (payload.rows.length > LIMITS.ROW) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot import more than ${LIMITS.ROW} rows`,
    });
  }

  // ----------------------
  // Cells
  // ----------------------
  const filledCells = payload.cells.filter(c => c.value !== null && c.value !== undefined && c.value !== "");
  if (filledCells.length > LIMITS.CELL) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot import more than ${LIMITS.CELL} non-empty cells`,
    });
  }

  // ----------------------
  // Value limits
  // ----------------------
  for (const cell of filledCells) {
    if (typeof cell.value === "string" && cell.value.length > LIMITS.TEXT) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Text in a cell exceeds maximum length of ${LIMITS.TEXT}`,
      });
    }
    if (typeof cell.value === "number" && cell.value.toString().length > LIMITS.NUM) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Number in a cell exceeds maximum length of ${LIMITS.NUM}`,
      });
    }
  }
}
