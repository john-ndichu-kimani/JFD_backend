-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isShipped" BOOLEAN NOT NULL DEFAULT false;
