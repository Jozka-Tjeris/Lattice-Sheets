import { db } from "~/server/db";
import type { CreateTableMutation } from "../mutationTypes";

export async function executeCreateTable(m: CreateTableMutation) {
  return db.table.create({
    data: {
      name: m.name,
      baseId: m.baseId,
    },
  });
}
