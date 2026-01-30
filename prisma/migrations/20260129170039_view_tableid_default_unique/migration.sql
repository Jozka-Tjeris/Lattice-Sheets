
CREATE UNIQUE INDEX one_default_view_per_table
ON "View" ("tableId")
WHERE "isDefault" = true;
