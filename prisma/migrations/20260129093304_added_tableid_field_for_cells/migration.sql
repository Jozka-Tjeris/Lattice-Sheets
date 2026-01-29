/*
  Warnings:

  - Added the required column `tableId` to the `Cell` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Cell" ADD COLUMN     "tableId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Cell_tableId_idx" ON "Cell"("tableId");

-- AddForeignKey
ALTER TABLE "Cell" ADD CONSTRAINT "Cell_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;
