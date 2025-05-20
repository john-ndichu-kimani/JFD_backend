/*
  Warnings:

  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
ADD COLUMN     "stockQuantity" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "isPublished" SET DEFAULT true;
