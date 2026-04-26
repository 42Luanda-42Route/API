-- CreateEnum
CREATE TYPE "public"."DayType" AS ENUM ('WEEKDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "public"."Route" ADD COLUMN     "current_stop_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."Schedule" (
    "id" SERIAL NOT NULL,
    "route_id" INTEGER NOT NULL,
    "departure_time" TEXT NOT NULL,
    "arrival_time" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "day_type" "public"."DayType" NOT NULL DEFAULT 'WEEKDAY',
    "shift" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Route" ADD CONSTRAINT "Route_current_stop_id_fkey" FOREIGN KEY ("current_stop_id") REFERENCES "public"."MiniBusStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Schedule" ADD CONSTRAINT "Schedule_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "public"."Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
