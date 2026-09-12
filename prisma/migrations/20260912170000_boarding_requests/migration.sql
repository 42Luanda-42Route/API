-- CreateEnum
CREATE TYPE "BoardingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "BoardingRequest" (
    "id" SERIAL NOT NULL,
    "cadete_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "route_id" INTEGER NOT NULL,
    "status" "BoardingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "flagged" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardingRequest_driver_id_status_idx" ON "BoardingRequest"("driver_id", "status");
CREATE INDEX "BoardingRequest_route_id_status_idx" ON "BoardingRequest"("route_id", "status");
CREATE INDEX "BoardingRequest_cadete_id_status_idx" ON "BoardingRequest"("cadete_id", "status");

-- One pending request per cadete+driver+route
CREATE UNIQUE INDEX "BoardingRequest_pending_unique"
  ON "BoardingRequest"("cadete_id", "driver_id", "route_id")
  WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "BoardingRequest" ADD CONSTRAINT "BoardingRequest_cadete_id_fkey" FOREIGN KEY ("cadete_id") REFERENCES "Cadetes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardingRequest" ADD CONSTRAINT "BoardingRequest_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BoardingRequest" ADD CONSTRAINT "BoardingRequest_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
