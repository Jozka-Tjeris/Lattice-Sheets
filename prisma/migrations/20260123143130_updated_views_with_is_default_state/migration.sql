/*
  Warnings:

  - A unique constraint covering the columns `[tableId,name]` on the table `View` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "View" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "View_tableId_name_key" ON "View"("tableId", "name");
