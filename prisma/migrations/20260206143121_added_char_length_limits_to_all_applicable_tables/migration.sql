/*
  Warnings:

  - You are about to alter the column `name` on the `Base` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `value` on the `Cell` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `Column` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `columnType` on the `Column` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(10)`.
  - You are about to alter the column `name` on the `Table` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `name` on the `View` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE "Base" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "Cell" ALTER COLUMN "value" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "Column" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "columnType" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "Table" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);

-- AlterTable
ALTER TABLE "View" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50);
