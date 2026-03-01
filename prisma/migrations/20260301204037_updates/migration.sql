/*
  Warnings:

  - You are about to drop the column `passwrd` on the `Admins` table. All the data in the column will be lost.
  - You are about to drop the column `passwrd` on the `Cadetes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Admins" DROP COLUMN "passwrd",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "password" TEXT;

-- AlterTable
ALTER TABLE "public"."Cadetes" DROP COLUMN "passwrd",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "prioritityList" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."DriverCoordinates" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."Drivers" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."MiniBusStop" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "public"."Route" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
