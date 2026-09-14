-- Trip is an execution of a Route. Existing boarding requests remain valid
-- without a trip; every request created by the new API receives trip_id.
CREATE TYPE "TripStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "Trip" (
    "id" SERIAL NOT NULL,
    "route_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "vehicle_name" TEXT NOT NULL,
    "vehicle_plate" TEXT NOT NULL,
    "vehicle_capacity" INTEGER NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Trip_vehicle_capacity_check" CHECK ("vehicle_capacity" > 0)
);

ALTER TABLE "BoardingRequest" ADD COLUMN "trip_id" INTEGER;

CREATE INDEX "Trip_status_startedAt_idx" ON "Trip"("status", "startedAt");
CREATE INDEX "Trip_route_id_status_idx" ON "Trip"("route_id", "status");
CREATE INDEX "Trip_driver_id_status_idx" ON "Trip"("driver_id", "status");
CREATE INDEX "BoardingRequest_trip_id_status_idx" ON "BoardingRequest"("trip_id", "status");

-- PostgreSQL permits multiple NULL values here, so legacy rows do not
-- conflict while a cadete can only request boarding once per new trip.
CREATE UNIQUE INDEX "BoardingRequest_trip_id_cadete_id_key"
    ON "BoardingRequest"("trip_id", "cadete_id");

-- Prisma cannot currently express partial unique indexes in its schema.
CREATE UNIQUE INDEX "Trip_one_active_per_route_key"
    ON "Trip"("route_id") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "Trip_one_active_per_driver_key"
    ON "Trip"("driver_id") WHERE "status" = 'ACTIVE';

ALTER TABLE "Trip" ADD CONSTRAINT "Trip_route_id_fkey"
    FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driver_id_fkey"
    FOREIGN KEY ("driver_id") REFERENCES "Drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BoardingRequest" ADD CONSTRAINT "BoardingRequest_trip_id_fkey"
    FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
