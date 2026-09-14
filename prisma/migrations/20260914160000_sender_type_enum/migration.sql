-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('CADETE', 'DRIVER', 'ADMIN');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "senderType_enum" "SenderType";

UPDATE "Message"
SET "senderType_enum" = CASE
  WHEN "senderType" = 1 THEN 'DRIVER'::"SenderType"
  WHEN "senderType" = 2 THEN 'ADMIN'::"SenderType"
  ELSE 'CADETE'::"SenderType"
END;

ALTER TABLE "Message" DROP COLUMN "senderType";
ALTER TABLE "Message" RENAME COLUMN "senderType_enum" TO "senderType";
ALTER TABLE "Message" ALTER COLUMN "senderType" SET NOT NULL;
