import { z } from "zod";

export const ImportSchema = z.object({
  payload: z.object({
    name: z.string(),
    columns: z.array(z.object({
      id: z.string(),
      name: z.string(),
      columnType: z.enum(["text", "number"]),
      order: z.number(),
    })),
    rows: z.array(z.object({
      id: z.string(),
      order: z.number(),
    })),
    cells: z.array(z.object({
      rowId: z.string(),
      columnId: z.string(),
      value: z.union([z.string(), z.number(), z.literal("")]),
    })),
  }),
  target: z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("new-base"),
      baseName: z.string().optional(),
    }),
    z.object({
      mode: z.literal("existing-base"),
      baseId: z.string(),
    }),
  ]),
});

export type ImportTarget =
  | { mode: "new-base"; baseName?: string }
  | { mode: "existing-base"; baseId: string };

export type IOTablePayload = {
  name: string;
  columns: {
    id: string; // client-side ID
    name: string;
    columnType: "text" | "number";
    order: number;
  }[];
  rows: {
    id: string; // client-side ID
    order: number;
  }[];
  cells: {
    rowId: string;
    columnId: string;
    value: string | number;
  }[];
};
