/*
  Warnings:

  - You are about to drop the column `age` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `authenticity` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `culturalContext` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `discountPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `provenance` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "age",
DROP COLUMN "authenticity",
DROP COLUMN "culturalContext",
DROP COLUMN "discountPrice",
DROP COLUMN "provenance";
