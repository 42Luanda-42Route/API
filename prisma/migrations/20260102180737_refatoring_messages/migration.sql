/*
  Warnings:

  - You are about to drop the column `id_cadete` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `id_driver` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `message` on the `Message` table. All the data in the column will be lost.
  - Added the required column `chat_id` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderType` to the `Message` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sender_id` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."ChatType" AS ENUM ('GENERAL', 'ROUTE');

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_id_cadete_fkey";

-- DropForeignKey
ALTER TABLE "public"."Message" DROP CONSTRAINT "Message_id_driver_fkey";

-- AlterTable
ALTER TABLE "public"."Message" DROP COLUMN "id_cadete",
DROP COLUMN "id_driver",
DROP COLUMN "message",
ADD COLUMN     "chat_id" INTEGER NOT NULL,
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "senderType" INTEGER NOT NULL,
ADD COLUMN     "sender_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."Chat" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT,
    "type" "public"."ChatType" NOT NULL,
    "route_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
