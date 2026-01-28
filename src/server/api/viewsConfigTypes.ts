import { z } from "zod";

// Define a schema for column pinning
const ColumnPinningSchema = z.object({
  left: z.array(z.string()),
  right: z.array(z.string()),
});

// Define schema for column sizing
const ColumnSizingSchema = z.record(z.number());

// Define schema for column visibility
const ColumnVisibilitySchema = z.record(z.boolean());

// Define schema for column filters
const ColumnFilterSchema = z.object({
  id: z.string(),
  value: z.any(), // Could refine more depending on filter types
});

const SortingSchema = z.array(
  z.object({
    id: z.string(),
    desc: z.boolean(),
  })
);

export const ViewConfigSchema = z.object({
  sorting: SortingSchema.optional(),
  columnFilters: z.array(ColumnFilterSchema).optional(),
  columnVisibility: ColumnVisibilitySchema.optional(),
  columnSizing: ColumnSizingSchema.optional(),
  columnPinning: ColumnPinningSchema.optional(),
  globalSearch: z.string().optional(),
});

export type ViewConfig = z.infer<typeof ViewConfigSchema>;
