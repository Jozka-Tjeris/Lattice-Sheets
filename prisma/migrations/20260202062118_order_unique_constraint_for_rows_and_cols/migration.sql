/*
  Warnings:

  - A unique constraint covering the columns `[tableId,order]` on the table `Column` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tableId,order]` on the table `Row` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Column_tableId_order_key" ON "Column"("tableId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Row_tableId_order_key" ON "Row"("tableId", "order");
